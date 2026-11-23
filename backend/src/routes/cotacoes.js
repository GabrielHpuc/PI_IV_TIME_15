// Tom RA: 25015528
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { carregarUsuario, exigirTipo } from "../middleware/auth.js";
import { auditar } from "../utils/auditoria.js";
import { fornecedorDoUsuario } from "../utils/fornecedores.js";
import { proximoNumero, statusPelasPropostas } from "../utils/cotacoes.js";
import { arredondar, escaparRegex, idValido, texto } from "../utils/validacao.js";

const router = Router();
router.use(carregarUsuario);

const ABERTAS = ["aguardando", "analise"];

// Formata os dados da cotacao e das propostas para retornar no padrao esperado pelo frontend
function formatar(cotacao, completo = true, meuFornecedorId = null) {
  const propostas = (cotacao.propostas || []).map(p => ({
    id: String(p._id), fornecedorId: String(p.fornecedorId ?? ""), fornecedor: p.fornecedor,
    preco: p.preco, laudo: Boolean(p.laudo), prazo: p.prazo, avaliacao: p.avaliacao ?? 0
  }));
  return {
    id: String(cotacao._id),
    codigo: cotacao.codigo,
    item: cotacao.item,
    produtoId: cotacao.produtoId ? String(cotacao.produtoId) : null,
    quantidade: cotacao.quantidade,
    criadoEm: cotacao.criadoEm,
    vencimento: cotacao.vencimento,
    status: cotacao.status,
    totalPropostas: propostas.length,
    jaEnviouProposta: meuFornecedorId ? propostas.some(p => p.fornecedorId === String(meuFornecedorId)) : false,
    propostaAprovadaId: cotacao.propostaAprovadaId ? String(cotacao.propostaAprovadaId) : null,
    ...(completo ? { propostas } : {})
  };
}

// Lista as cotacoes do proprio produtor ou todas as cotacoes abertas no caso de fornecedor
router.get("/", async (req, res, next) => {
  try {
    const col = getDatabase().collection("cotacoes");
    const busca = texto(req.query.busca, 20);
    const filtro = {};
    let meuFornecedorId = null;

    if (req.usuario.tipo === "produtor") {
      filtro.userId = req.usuario.id;
    } else {
      const fornecedor = await fornecedorDoUsuario(req.usuario);
      meuFornecedorId = fornecedor._id;
      filtro.modelo = { $ne: true };
      filtro.status = { $in: ABERTAS };
      filtro.vencimento = { $gte: new Date() };
    }

    if (busca) filtro.codigo = new RegExp(escaparRegex(busca), "i");
    if (req.query.status) filtro.status = String(req.query.status);

    const itens = await col.find(filtro).sort({ criadoEm: -1 }).limit(100).toArray();
    res.json({ itens: itens.map(c => formatar(c, false, meuFornecedorId)) });
  } catch (error) {
    next(error);
  }
});

// Retorna os detalhes de uma cotacao ocultando propostas de concorrentes quando o acesso for de fornecedor
router.get("/:id", async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Cotação não encontrada." });

    const filtro = { _id: new ObjectId(req.params.id) };
    if (req.usuario.tipo === "produtor") filtro.userId = req.usuario.id;
    else filtro.modelo = { $ne: true };

    const cotacao = await getDatabase().collection("cotacoes").findOne(filtro);
    if (!cotacao) return res.status(404).json({ message: "Cotação não encontrada." });

    const dados = formatar(cotacao);
    if (req.usuario.tipo === "fornecedor") {
      const fornecedor = await fornecedorDoUsuario(req.usuario);
      dados.propostas = dados.propostas.filter(p => p.fornecedorId === String(fornecedor._id));
    }
    res.json(dados);
  } catch (error) {
    next(error);
  }
});

// Cria uma nova solicitacao de cotacao para o produtor com codigo sequencial e prazo de validade
router.post("/", exigirTipo("produtor"), async (req, res, next) => {
  try {
    const item = texto(req.body.item, 120);
    const quantidade = texto(req.body.quantidade, 40);
    const dias = Number(req.body.diasValidade ?? 3);
    if (item.length < 3) return res.status(400).json({ message: "Informe o item da cotação." });
    if (!quantidade) return res.status(400).json({ message: "Informe a quantidade." });
    if (!Number.isInteger(dias) || dias < 1 || dias > 30) return res.status(400).json({ message: "A validade deve ficar entre 1 e 30 dias." });

    const db = getDatabase();
    let produtoId = null;
    if (req.body.produtoId !== undefined && req.body.produtoId !== null) {
      if (!idValido(req.body.produtoId) || !(await db.collection("produtos").findOne({ _id: new ObjectId(req.body.produtoId) }, { projection: { _id: 1 } }))) {
        return res.status(400).json({ message: "Produto inválido." });
      }
      produtoId = new ObjectId(req.body.produtoId);
    }

    const agora = new Date();
    const numero = await proximoNumero("cotacao");
    const doc = {
      codigo: "CR" + String(numero).padStart(5, "0"),
      userId: req.usuario.id, item, quantidade, produtoId,
      criadoEm: agora, vencimento: new Date(agora.getTime() + dias * 86400000),
      status: "aguardando", propostas: []
    };
    const { insertedId } = await db.collection("cotacoes").insertOne(doc);

    await auditar(req, { acao: "cotacao.criada", entidade: "cotacao", entidadeId: insertedId, detalhes: { codigo: doc.codigo } });
    res.status(201).json({ message: "Cotação criada.", id: String(insertedId), codigo: doc.codigo });
  } catch (error) {
    next(error);
  }
});

// Permite que um fornecedor envie uma proposta de preco e prazo para uma cotacao em aberto
router.post("/:id/propostas", exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Cotação não encontrada." });

    const preco = arredondar(Number(req.body.preco));
    const prazo = Number(req.body.prazo);
    if (!Number.isFinite(preco) || preco <= 0) return res.status(400).json({ message: "Informe um preço válido." });
    if (!Number.isInteger(prazo) || prazo < 1 || prazo > 60) return res.status(400).json({ message: "O prazo deve ficar entre 1 e 60 dias." });

    const col = getDatabase().collection("cotacoes");
    const cotacao = await col.findOne({ _id: new ObjectId(req.params.id), modelo: { $ne: true } });
    if (!cotacao || !ABERTAS.includes(cotacao.status) || cotacao.vencimento < new Date()) {
      return res.status(404).json({ message: "Cotação não está aberta para propostas." });
    }

    const fornecedor = await fornecedorDoUsuario(req.usuario);
    if ((cotacao.propostas || []).some(p => String(p.fornecedorId) === String(fornecedor._id))) {
      return res.status(409).json({ message: "Você já enviou uma proposta para esta cotação." });
    }
    const proposta = {
      _id: new ObjectId(), fornecedorId: fornecedor._id, fornecedor: fornecedor.nomeFantasia || fornecedor.nome,
      preco, prazo, laudo: Boolean(req.body.laudo), avaliacao: fornecedor.avaliacao ?? 0, criadoEm: new Date()
    };

    // $push em vez de regravar o array inteiro: propostas de fornecedores diferentes no mesmo instante não se sobrescrevem.
    // O filtro repete as regras (aberta, no prazo, sem proposta deste fornecedor) no momento exato da gravação.
    const gravada = await col.updateOne(
      { _id: cotacao._id, modelo: { $ne: true }, status: { $in: ABERTAS }, vencimento: { $gte: new Date() }, "propostas.fornecedorId": { $ne: fornecedor._id } },
      { $push: { propostas: proposta } }
    );
    if (!gravada.matchedCount) {
      return res.status(409).json({ message: "Você já enviou uma proposta ou a cotação não está mais aberta." });
    }
    // com 2 ou mais propostas a cotação passa para "em análise"
    await col.updateOne(
      { _id: cotacao._id, status: "aguardando", "propostas.1": { $exists: true } },
      { $set: { status: statusPelasPropostas(2) } }
    );

    await auditar(req, { acao: "cotacao.proposta", entidade: "cotacao", entidadeId: cotacao._id, detalhes: { preco, prazo } });
    res.status(201).json({ message: "Proposta enviada." });
  } catch (error) {
    next(error);
  }
});

// Aprova uma proposta escolhida pelo produtor ou encerra a cotacao como recusada
async function decidir(req, res, next, novoStatus) {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Cotação não encontrada." });

    const col = getDatabase().collection("cotacoes");
    const cotacao = await col.findOne({ _id: new ObjectId(req.params.id), userId: req.usuario.id });
    if (!cotacao) return res.status(404).json({ message: "Cotação não encontrada." });
    if (!ABERTAS.includes(cotacao.status)) return res.status(409).json({ message: "Esta cotação já foi encerrada." });

    const alteracao = { status: novoStatus, encerradoEm: new Date() };
    if (novoStatus === "fechada") {
      if (!idValido(req.body.propostaId)) return res.status(400).json({ message: "Selecione uma proposta." });
      const proposta = (cotacao.propostas || []).find(p => String(p._id) === req.body.propostaId);
      if (!proposta) return res.status(400).json({ message: "Proposta não encontrada nesta cotação." });
      alteracao.propostaAprovadaId = proposta._id;
    }

    // só encerra se a cotação ainda estiver aberta neste instante (evita aprovar e recusar ao mesmo tempo)
    const encerrada = await col.updateOne({ _id: cotacao._id, status: { $in: ABERTAS } }, { $set: alteracao });
    if (!encerrada.matchedCount) return res.status(409).json({ message: "Esta cotação já foi encerrada." });
    await auditar(req, { acao: novoStatus === "fechada" ? "cotacao.aprovada" : "cotacao.recusada", entidade: "cotacao", entidadeId: cotacao._id });
    res.json({ message: novoStatus === "fechada" ? "Orçamento aprovado." : "Cotação recusada." });
  } catch (error) {
    next(error);
  }
}

// Exclui uma cotacao do produtor desde que ainda nao tenha recebido propostas de fornecedores
router.delete("/:id", exigirTipo("produtor"), async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Cotação não encontrada." });

    const col = getDatabase().collection("cotacoes");
    const cotacao = await col.findOne({ _id: new ObjectId(req.params.id), userId: req.usuario.id });
    if (!cotacao) return res.status(404).json({ message: "Cotação não encontrada." });
    if ((cotacao.propostas || []).length) return res.status(409).json({ message: "Cotações com propostas não podem ser excluídas. Recuse a cotação para encerrá-la." });

    await col.deleteOne({ _id: cotacao._id });
    await auditar(req, { acao: "cotacao.excluida", entidade: "cotacao", entidadeId: cotacao._id, detalhes: { codigo: cotacao.codigo } });
    res.json({ message: "Cotação excluída." });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/aprovar", exigirTipo("produtor"), (req, res, next) => decidir(req, res, next, "fechada"));
router.post("/:id/recusar", exigirTipo("produtor"), (req, res, next) => decidir(req, res, next, "recusada"));

export default router;
