// Tom RA: 25015528
import { Router } from "express";
import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { carregarUsuario, exigirTipo } from "../middleware/auth.js";
import { fornecedorDoUsuario } from "../utils/fornecedores.js";
import { proximoNumero } from "../utils/cotacoes.js";
import { auditar } from "../utils/auditoria.js";
import { calcularPedidoNoServidorJava } from "../utils/calculos.js";
import { calcularFrete } from "../utils/frete.js";
import { devolverEstoque, reservarEstoque, statusDoPedido } from "../utils/pedidos.js";
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

// Registra um novo pedido validando itens, frete, pagamento e calculando o total pelo servidor Java
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

    const semEstoque = produtos.find(p => typeof p.estoque === "number" && p.estoque < quantidades.get(String(p._id)));
    if (semEstoque) {
      return res.status(409).json({ message: `Estoque insuficiente para "${semEstoque.nome}" (disponível: ${semEstoque.estoque}).` });
    }

    // cada item guarda o próprio status, para cada fornecedor acompanhar só a sua parte do pedido
    const itens = produtos.map(p => {
      const quantidade = quantidades.get(String(p._id));
      return {
        produtoId: p._id, fornecedorId: p.fornecedorId, nome: p.nome, preco: p.preco, quantidade,
        subtotal: arredondar(p.preco * quantidade), status: "criado"
      };
    });
    const { subtotal, total, valorParcelas } = await calcularPedidoNoServidorJava(itens, frete.valor, parcelas);
    const numero = await proximoNumero("pedido");

    // baixa o estoque de forma atômica antes de gravar o pedido (dois compradores não levam a mesma unidade)
    const reserva = await reservarEstoque(db, itens, new Map(produtos.map(p => [String(p._id), p])));
    if (reserva.falhou) {
      return res.status(409).json({ message: `Estoque insuficiente para "${reserva.falhou.nome}". Atualize o carrinho e tente de novo.` });
    }

    const pedido = {
      numero: "PED" + String(numero).padStart(6, "0"),
      userId: req.usuario.id, itens, subtotal,
      frete: { valor: frete.valor, prazo: frete.prazo },
      total, entrega,
      pagamento: { metodo, parcelas, valorParcelas, status: "confirmado" },
      status: "criado",
      criadoEm: new Date()
    };
    let insertedId;
    try {
      ({ insertedId } = await db.collection("pedidos").insertOne(pedido));
    } catch (erro) {
      await devolverEstoque(db, reserva.feitos);
      throw erro;
    }

    try {
      const perfil = await db.collection("profiles").findOne({ userId: req.usuario.id });
      if (perfil) {
        const lista = Array.isArray(perfil.addresses) ? [...perfil.addresses] : [];
        if (!lista.length && perfil.address && (perfil.address.cep || perfil.address.street)) {
          lista.push({
            id: perfil.address.id || crypto.randomUUID(),
            label: perfil.address.label || "Endereço principal",
            cep: String(perfil.address.cep || "").replace(/\D/g, ""),
            street: perfil.address.street || "",
            number: perfil.address.number || "",
            complement: perfil.address.complement || "",
            neighborhood: perfil.address.neighborhood || "",
            city: perfil.address.city || "",
            state: perfil.address.state || "",
            observacoes: perfil.address.observacoes || "",
            principal: true
          });
        }
        const cepLimpo = String(entrega.cep || "").replace(/\D/g, "");
        const chaveNova = `${cepLimpo}|${String(entrega.rua || "").trim().toLowerCase()}|${String(entrega.numero || "").trim().toLowerCase()}`;
        const idxExistente = lista.findIndex(a =>
          `${String(a.cep || "").replace(/\D/g, "")}|${String(a.street || a.rua || "").trim().toLowerCase()}|${String(a.number || a.numero || "").trim().toLowerCase()}` === chaveNova
        );
        const novoItem = {
          id: idxExistente >= 0 && lista[idxExistente].id ? lista[idxExistente].id : crypto.randomUUID(),
          label: (idxExistente >= 0 && lista[idxExistente].label) ? lista[idxExistente].label : (lista.length === 0 ? "Endereço principal" : `Endereço ${lista.length + 1}`),
          cep: cepLimpo,
          street: entrega.rua,
          number: entrega.numero,
          complement: entrega.complemento || "",
          neighborhood: entrega.bairro,
          city: entrega.cidade,
          state: entrega.estado,
          observacoes: entrega.observacoes || "",
          principal: idxExistente >= 0 ? Boolean(lista[idxExistente].principal) : lista.length === 0
        };
        if (idxExistente >= 0) {
          lista[idxExistente] = novoItem;
        } else {
          lista.push(novoItem);
        }
        const endPrincipal = lista.find(a => a.principal) || lista[0];
        const temEndPrincipal = Boolean(perfil.address && perfil.address.cep && perfil.address.street);
        await db.collection("profiles").updateOne(
          { userId: req.usuario.id },
          {
            $set: {
              addresses: lista,
              address: temEndPrincipal ? perfil.address : endPrincipal,
              updatedAt: new Date()
            }
          }
        );
      }
    } catch {}

    await auditar(req, { acao: "pedido.criado", entidade: "pedido", entidadeId: insertedId, detalhes: { numero: pedido.numero, total } });

    res.status(201).json({ message: "Pedido registrado com sucesso!", pedido: formatar({ ...pedido, _id: insertedId }) });
  } catch (error) {
    next(error);
  }
});

// Lista o historico de compras realizadas pelo produtor logado
router.get("/", exigirTipo("produtor"), async (req, res, next) => {
  try {
    const itens = await getDatabase().collection("pedidos").find({ userId: req.usuario.id }).sort({ criadoEm: -1 }).limit(100).toArray();
    res.json({ itens: itens.map(formatar) });
  } catch (error) {
    next(error);
  }
});

// Lista as vendas recebidas pelo fornecedor filtrando apenas os itens que pertencem a ele
router.get("/vendas", exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const pedidos = await getDatabase().collection("pedidos")
      .find({ "itens.fornecedorId": fornecedor._id }).sort({ criadoEm: -1 }).limit(100).toArray();

    res.json({
      itens: pedidos.map(p => {
        const meus = p.itens.filter(i => String(i.fornecedorId) === String(fornecedor._id));
        return {
          // o fornecedor vê o status dos próprios itens (pedidos antigos usam o status do pedido)
          id: String(p._id), numero: p.numero, status: meus[0]?.status ?? p.status, criadoEm: p.criadoEm,
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
  criado: ["confirmado", "em_separacao", "enviado", "entregue", "cancelado"],
  aguardando_pagamento: ["confirmado", "pago", "em_separacao", "enviado", "entregue", "cancelado"],
  em_analise: ["confirmado", "pago", "em_separacao", "enviado", "entregue", "cancelado"],
  confirmado: ["em_separacao", "enviado", "entregue", "cancelado"],
  pago: ["em_separacao", "enviado", "entregue", "cancelado"],
  em_separacao: ["enviado", "entregue", "cancelado"],
  enviado: ["entregue"]
};

// Permite que o fornecedor avance o status da entrega respeitando a ordem permitida em TRANSICOES
router.patch("/:id/status", exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Pedido não encontrado." });
    const novo = String(req.body.status ?? "");
    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const db = getDatabase();
    const col = db.collection("pedidos");
    const pedido = await col.findOne({ _id: new ObjectId(req.params.id), "itens.fornecedorId": fornecedor._id });
    if (!pedido) return res.status(404).json({ message: "Pedido não encontrado." });

    // o fornecedor só mexe nos próprios itens; os de outros fornecedores não mudam
    const meusItens = pedido.itens.filter(i => String(i.fornecedorId) === String(fornecedor._id));
    const atual = meusItens[0].status ?? pedido.status;
    if (!(TRANSICOES[atual] ?? []).includes(novo)) {
      return res.status(409).json({ message: "Mudança de status não permitida para este pedido." });
    }

    // itens antigos de outros fornecedores, sem status próprio, herdam o status que o pedido tinha
    await col.updateOne(
      { _id: pedido._id },
      { $set: { "itens.$[meus].status": novo, "itens.$[outros].status": pedido.status, atualizadoEm: new Date() } },
      { arrayFilters: [{ "meus.fornecedorId": fornecedor._id }, { "outros.fornecedorId": { $ne: fornecedor._id }, "outros.status": { $exists: false } }] }
    );

    // o pedido passa a ter o status do item menos adiantado; só fica cancelado se todos os itens foram cancelados
    const atualizado = await col.findOne({ _id: pedido._id });
    const statusPedido = statusDoPedido(atualizado.itens, pedido.status);
    const alteracao = { status: statusPedido };
    if (novo === "pago") alteracao["pagamento.status"] = "confirmado";
    if (statusPedido === "cancelado") alteracao["pagamento.status"] = "cancelado";
    await col.updateOne({ _id: pedido._id }, { $set: alteracao });

    if (novo === "cancelado") await devolverEstoque(db, meusItens);
    await auditar(req, { acao: "pedido.status", entidade: "pedido", entidadeId: pedido._id, detalhes: { de: atual, para: novo } });
    res.json({ message: "Status atualizado.", status: novo, statusPedido });
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
