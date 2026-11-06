import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { carregarUsuario, exigirTipo } from "../middleware/auth.js";
import { fornecedorDoUsuario } from "../utils/fornecedores.js";
import { proximoNumero } from "../utils/cotacoes.js";
import { auditar } from "../utils/auditoria.js";
import { dividirParcelas, totalItens, totalPedido } from "../utils/calculos.js";
import { calcularFrete } from "../utils/frete.js";
import { METODOS_PAGAMENTO, arredondar, idValido, texto } from "../utils/validacao.js";

const router = Router();
router.use(carregarUsuario);

const formatar = pedido => ({
  id: String(pedido._id),
  numero: pedido.numero,
  status: pedido.status,
  itens: pedido.itens.map(i => ({ ...i, produtoId: String(i.produtoId), fornecedorId: String(i.fornecedorId) })),
  subtotal: pedido.subtotal,
  frete: pedido.frete,
  total: pedido.total,
  entrega: pedido.entrega,
  pagamento: pedido.pagamento,
  criadoEm: pedido.criadoEm
});

router.post("/", exigirTipo("produtor"), async (req, res, next) => {
  try {
    const bruto = Array.isArray(req.body.itens) ? req.body.itens.slice(0, 50) : [];
    if (!bruto.length) return res.status(400).json({ message: "O carrinho está vazio." });

    const quantidades = new Map();
    for (const item of bruto) {
      const quantidade = Number(item?.quantidade);
      if (!idValido(item?.produtoId) || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10000) {
        return res.status(400).json({ message: "Itens do carrinho inválidos." });
      }
      quantidades.set(item.produtoId, (quantidades.get(item.produtoId) ?? 0) + quantidade);
    }

    const entrada = req.body.entrega && typeof req.body.entrega === "object" ? req.body.entrega : {};
    const frete = calcularFrete(entrada.cep);
    if (!frete) return res.status(400).json({ message: "Informe um CEP válido com 8 dígitos." });

    const entrega = {
      cep: frete.cep, rua: texto(entrada.rua, 120), numero: texto(entrada.numero, 20), complemento: texto(entrada.complemento, 80),
      bairro: texto(entrada.bairro, 80), cidade: texto(entrada.cidade, 80), estado: texto(entrada.estado, 2).toUpperCase(),
      observacoes: texto(entrada.observacoes, 300)
    };
    if (!entrega.rua || !entrega.numero || !entrega.bairro || !entrega.cidade) return res.status(400).json({ message: "Preencha o endereço de entrega completo." });
    if (!/^[A-Z]{2}$/.test(entrega.estado)) return res.status(400).json({ message: "Informe uma UF válida." });

    const metodo = req.body.pagamento?.metodo;
    if (!METODOS_PAGAMENTO.includes(metodo)) return res.status(400).json({ message: "Selecione uma forma de pagamento." });
    const parcelas = metodo === "cartao" ? Number(req.body.pagamento?.parcelas ?? 1) : 1;
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) return res.status(400).json({ message: "Parcelas inválidas (1 a 12)." });

    const db = getDatabase();
    const produtos = await db.collection("produtos").find({
      _id: { $in: [...quantidades.keys()].map(id => new ObjectId(id)) }, ativo: { $ne: false }
    }).toArray();
    if (produtos.length !== quantidades.size) return res.status(400).json({ message: "Um ou mais produtos não estão mais disponíveis." });

    const itens = produtos.map(p => {
      const quantidade = quantidades.get(String(p._id));
      return {
        produtoId: p._id, fornecedorId: p.fornecedorId, nome: p.nome, preco: p.preco, quantidade,
        subtotal: arredondar(p.preco * quantidade)
      };
    });
    const subtotal = totalItens(itens);
    const total = totalPedido(itens, frete.valor);
    const numero = await proximoNumero("pedido");

    const pedido = {
      numero: "PED" + String(numero).padStart(6, "0"),
      userId: req.usuario.id, itens, subtotal,
      frete: { valor: frete.valor, prazo: frete.prazo },
      total, entrega,
      pagamento: { metodo, parcelas, valorParcelas: dividirParcelas(total, parcelas), status: metodo === "credito_rural" ? "em_analise" : "pendente" },
      status: metodo === "credito_rural" ? "em_analise" : "aguardando_pagamento",
      criadoEm: new Date()
    };
    const { insertedId } = await db.collection("pedidos").insertOne(pedido);

    await auditar(req, { acao: "pedido.criado", entidade: "pedido", entidadeId: insertedId, detalhes: { numero: pedido.numero, total } });
    await Promise.all(itens.map(i => db.collection("produtos").updateOne({ _id: i.produtoId }, { $inc: { vendidos: i.quantidade } })));

    res.status(201).json({ message: "Pedido registrado com sucesso!", pedido: formatar({ ...pedido, _id: insertedId }) });
  } catch (error) {
    next(error);
  }
});

router.get("/", exigirTipo("produtor"), async (req, res, next) => {
  try {
    const itens = await getDatabase().collection("pedidos").find({ userId: req.usuario.id }).sort({ criadoEm: -1 }).limit(100).toArray();
    res.json({ itens: itens.map(formatar) });
  } catch (error) {
    next(error);
  }
});

router.get("/vendas", exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const pedidos = await getDatabase().collection("pedidos")
      .find({ "itens.fornecedorId": fornecedor._id }).sort({ criadoEm: -1 }).limit(100).toArray();

    res.json({
      itens: pedidos.map(p => {
        const meus = p.itens.filter(i => String(i.fornecedorId) === String(fornecedor._id));
        return {
          id: String(p._id), numero: p.numero, status: p.status, criadoEm: p.criadoEm,
          cidade: p.entrega.cidade, estado: p.entrega.estado,
          itens: meus.map(i => ({ produtoId: String(i.produtoId), nome: i.nome, preco: i.preco, quantidade: i.quantidade, subtotal: i.subtotal })),
          total: arredondar(meus.reduce((soma, i) => soma + i.subtotal, 0))
        };
      })
    });
  } catch (error) {
    next(error);
  }
});

const TRANSICOES = {
  aguardando_pagamento: ["pago", "cancelado"],
  em_analise: ["pago", "cancelado"],
  pago: ["enviado", "cancelado"],
  enviado: ["entregue"]
};

router.patch("/:id/status", exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Pedido não encontrado." });
    const novo = String(req.body.status ?? "");
    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const col = getDatabase().collection("pedidos");
    const pedido = await col.findOne({ _id: new ObjectId(req.params.id), "itens.fornecedorId": fornecedor._id });
    if (!pedido) return res.status(404).json({ message: "Pedido não encontrado." });
    if (!(TRANSICOES[pedido.status] ?? []).includes(novo)) {
      return res.status(409).json({ message: "Mudança de status não permitida para este pedido." });
    }

    const alteracao = { status: novo, atualizadoEm: new Date() };
    if (novo === "pago") alteracao["pagamento.status"] = "confirmado";
    if (novo === "cancelado") alteracao["pagamento.status"] = "cancelado";
    await col.updateOne({ _id: pedido._id }, { $set: alteracao });
    await auditar(req, { acao: "pedido.status", entidade: "pedido", entidadeId: pedido._id, detalhes: { de: pedido.status, para: novo } });
    res.json({ message: "Status atualizado.", status: novo });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", exigirTipo("produtor"), async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Pedido não encontrado." });
    const pedido = await getDatabase().collection("pedidos").findOne({ _id: new ObjectId(req.params.id), userId: req.usuario.id });
    if (!pedido) return res.status(404).json({ message: "Pedido não encontrado." });
    res.json(formatar(pedido));
  } catch (error) {
    next(error);
  }
});

export default router;
