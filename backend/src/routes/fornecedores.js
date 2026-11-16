import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { carregarUsuario, exigirTipo } from "../middleware/auth.js";
import { auditar } from "../utils/auditoria.js";
import { fornecedorDoUsuario } from "../utils/fornecedores.js";
import { CATEGORIAS, digitos, idValido, texto, validarCpfCnpj } from "../utils/validacao.js";

const router = Router();

const publico = (f, produtos = 0) => ({
  id: String(f._id), nome: f.nome, nomeFantasia: f.nomeFantasia, avaliacao: f.avaliacao ?? 0, totalAvaliacoes: f.totalAvaliacoes ?? 0, produtos
});

router.get("/categorias", async (req, res, next) => {
  try {
    const contagem = await getDatabase().collection("produtos").aggregate([
      { $match: { ativo: { $ne: false } } },
      { $group: { _id: "$categoria", total: { $sum: 1 } } }
    ]).toArray();
    const mapa = new Map(contagem.map(c => [c._id, c.total]));
    res.json({ itens: CATEGORIAS.map(nome => ({ nome, total: mapa.get(nome) ?? 0 })) });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const db = getDatabase();
    const fornecedores = await db.collection("fornecedores").find({}).sort({ avaliacao: -1, nomeFantasia: 1 }).limit(100).toArray();
    const contagem = await db.collection("produtos").aggregate([
      { $match: { ativo: { $ne: false } } },
      { $group: { _id: "$fornecedorId", total: { $sum: 1 } } }
    ]).toArray();
    const mapa = new Map(contagem.map(c => [String(c._id), c.total]));
    res.json({ itens: fornecedores.map(f => publico(f, mapa.get(String(f._id)) ?? 0)) });
  } catch (error) {
    next(error);
  }
});

const dadosDoFornecedor = (f, perfil, produtos) => ({
  ...publico(f, produtos),
  cnpj: perfil.document ?? "",
  telefone: perfil.phone ?? "",
  inscricaoEstadual: perfil.stateRegistration ?? "",
  categorias: Array.isArray(perfil.categories) ? perfil.categories : []
});

router.get("/meu", carregarUsuario, exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    const f = await fornecedorDoUsuario(req.usuario);
    const produtos = await getDatabase().collection("produtos").countDocuments({ fornecedorId: f._id, ativo: { $ne: false } });
    res.json(dadosDoFornecedor(f, req.usuario.perfil, produtos));
  } catch (error) {
    next(error);
  }
});

router.put("/meu", carregarUsuario, exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    const nome = texto(req.body.nome, 120);
    const nomeFantasia = texto(req.body.nomeFantasia, 120);
    const cnpj = digitos(req.body.cnpj);
    const telefone = texto(req.body.telefone, 20);
    const inscricaoEstadual = texto(req.body.inscricaoEstadual, 20);
    const categorias = Array.isArray(req.body.categorias) ? [...new Set(req.body.categorias.filter(c => CATEGORIAS.includes(c)))] : [];

    if (nome.length < 2 || nomeFantasia.length < 2) return res.status(400).json({ message: "Informe a razão social e o nome fantasia." });
    if (cnpj.length !== 14 || !validarCpfCnpj(cnpj)) return res.status(400).json({ message: "Informe um CNPJ válido." });
    if (telefone && (digitos(telefone).length < 10 || digitos(telefone).length > 13)) return res.status(400).json({ message: "Informe um telefone válido com DDD." });

    const db = getDatabase();
    const f = await fornecedorDoUsuario(req.usuario);
    const agora = new Date();

    try {
      await db.collection("profiles").updateOne({ userId: req.usuario.id }, {
        $set: {
          document: cnpj, phone: telefone || null, stateRegistration: inscricaoEstadual || null,
          categories: categorias, companyName: nome, tradeName: nomeFantasia, updatedAt: agora
        }
      });
    } catch (erro) {
      if (erro.code === 11000) return res.status(409).json({ message: "Este CNPJ já está cadastrado em outra conta." });
      throw erro;
    }

    await db.collection("fornecedores").updateOne({ _id: f._id }, { $set: { nome, nomeFantasia, atualizadoEm: agora } });
    await auditar(req, { acao: "fornecedor.atualizado", entidade: "fornecedor", entidadeId: f._id });
    res.json({ message: "Dados da empresa atualizados." });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Fornecedor não encontrado." });
    const db = getDatabase();
    const f = await db.collection("fornecedores").findOne({ _id: new ObjectId(req.params.id) });
    if (!f) return res.status(404).json({ message: "Fornecedor não encontrado." });
    const total = await db.collection("produtos").countDocuments({ fornecedorId: f._id, ativo: { $ne: false } });
    res.json(publico(f, total));
  } catch (error) {
    next(error);
  }
});

export default router;
