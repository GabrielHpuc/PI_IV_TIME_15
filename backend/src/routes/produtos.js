import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { carregarUsuario, exigirTipo } from "../middleware/auth.js";
import { fornecedorDoUsuario } from "../utils/fornecedores.js";
import { auditar } from "../utils/auditoria.js";
import { mediaNotas } from "../utils/calculos.js";
import { lerProduto, montarConsulta } from "../utils/produtos.js";
import { idValido, texto } from "../utils/validacao.js";

const router = Router();

async function anexarFornecedores(produtos) {
  const ids = [...new Set(produtos.map(p => String(p.fornecedorId)).filter(Boolean))].map(id => new ObjectId(id));
  const fornecedores = ids.length ? await getDatabase().collection("fornecedores").find({ _id: { $in: ids } }).toArray() : [];
  const mapa = new Map(fornecedores.map(f => [String(f._id), f]));
  return produtos.map(p => {
    const f = mapa.get(String(p.fornecedorId));
    return {
      ...p,
      id: String(p._id),
      laudo: Boolean(p.laudoId),
      fornecedor: f ? { id: String(f._id), nome: f.nomeFantasia || f.nome, avaliacao: f.avaliacao ?? 0, totalAvaliacoes: f.totalAvaliacoes ?? 0 } : null
    };
  });
}

router.get("/", async (req, res, next) => {
  try {
    const col = getDatabase().collection("produtos");
    const { base, filtro, ordem, pagina, limite } = montarConsulta(req.query);
    if (idValido(req.query.fornecedor)) filtro.fornecedorId = new ObjectId(req.query.fornecedor);

    const [itens, total, facetas] = await Promise.all([
      col.find(filtro).sort(ordem).skip((pagina - 1) * limite).limit(limite).toArray(),
      col.countDocuments(filtro),
      col.aggregate([
        { $match: base },
        {
          $facet: {
            categorias: [{ $group: { _id: "$categoria", total: { $sum: 1 } } }, { $sort: { total: -1 } }],
            marcas: [{ $group: { _id: "$marca", total: { $sum: 1 } } }, { $sort: { total: -1 } }],
            regioes: [{ $group: { _id: "$regiao", total: { $sum: 1 } } }, { $sort: { total: -1 } }]
          }
        }
      ]).toArray()
    ]);

    const formatar = grupo => (facetas[0]?.[grupo] ?? []).map(g => ({ nome: g._id, total: g.total }));

    res.json({
      itens: await anexarFornecedores(itens),
      total,
      pagina,
      paginas: Math.max(Math.ceil(total / limite), 1),
      filtros: { categorias: formatar("categorias"), marcas: formatar("marcas"), regioes: formatar("regioes") }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/meus", carregarUsuario, exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const itens = await getDatabase().collection("produtos")
      .find({ fornecedorId: fornecedor._id, ativo: { $ne: false } }).sort({ _id: -1 }).toArray();
    res.json({ itens: await anexarFornecedores(itens) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Produto não encontrado." });

    const db = getDatabase();
    const produto = await db.collection("produtos").findOne({ _id: new ObjectId(req.params.id), ativo: { $ne: false } });
    if (!produto) return res.status(404).json({ message: "Produto não encontrado." });

    const usuarioId = req.session?.userId && ObjectId.isValid(req.session.userId) ? new ObjectId(req.session.userId) : null;

    const [[completo], laudo, resumo, avaliacoes, minha] = await Promise.all([
      anexarFornecedores([produto]),
      produto.laudoId ? db.collection("laudos").findOne({ _id: produto.laudoId }) : null,
      db.collection("avaliacoes").aggregate([
        { $match: { produtoId: produto._id } },
        { $group: { _id: null, media: { $avg: "$nota" }, total: { $sum: 1 } } }
      ]).toArray(),
      db.collection("avaliacoes").find({ produtoId: produto._id }).sort({ criadoEm: -1 }).limit(10).toArray(),
      usuarioId ? db.collection("avaliacoes").findOne({ produtoId: produto._id, userId: usuarioId }) : null
    ]);

    res.json({
      ...completo,
      laudo: laudo ? { id: String(laudo._id), numero: laudo.numero, emissao: laudo.emissao, validade: laudo.validade, orgao: laudo.orgao } : null,
      avaliacoes: {
        media: resumo[0] ? Math.round(resumo[0].media * 10) / 10 : 0,
        total: resumo[0]?.total ?? 0,
        minha: minha ? { nota: minha.nota, comentario: minha.comentario ?? "" } : null,
        itens: avaliacoes.map(a => ({
          id: String(a._id), autor: a.autor, nota: a.nota, comentario: a.comentario,
          verificado: Boolean(a.verificado), criadoEm: a.criadoEm
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/avaliacoes", carregarUsuario, async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Produto não encontrado." });

    const nota = Number(req.body.nota);
    const comentario = texto(req.body.comentario, 500);
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) return res.status(400).json({ message: "A nota deve ser de 1 a 5." });

    const db = getDatabase();
    const produtoId = new ObjectId(req.params.id);
    if (!(await db.collection("produtos").findOne({ _id: produtoId }, { projection: { _id: 1 } }))) {
      return res.status(404).json({ message: "Produto não encontrado." });
    }

    const verificado = Boolean(await db.collection("pedidos").findOne({ userId: req.usuario.id, "itens.produtoId": produtoId }, { projection: { _id: 1 } }));
    const rotulo = req.usuario.tipo === "produtor" ? "Produtor" : "Fornecedor";
    const agora = new Date();

    const existente = await db.collection("avaliacoes").findOne({ produtoId, userId: req.usuario.id }, { projection: { _id: 1 } });
    await db.collection("avaliacoes").updateOne(
      { produtoId, userId: req.usuario.id },
      { $set: { nota, comentario, verificado, autor: `${rotulo}${verificado ? " Verificado" : ""} - ${req.usuario.nome.split(" ")[0]}`, atualizadoEm: agora }, $setOnInsert: { criadoEm: agora } },
      { upsert: true }
    );

    const produto = await db.collection("produtos").findOne({ _id: produtoId }, { projection: { fornecedorId: 1 } });
    if (produto?.fornecedorId) {
      const ids = (await db.collection("produtos").find({ fornecedorId: produto.fornecedorId }, { projection: { _id: 1 } }).toArray()).map(p => p._id);
      const notas = (await db.collection("avaliacoes").find({ produtoId: { $in: ids } }, { projection: { nota: 1 } }).toArray()).map(a => a.nota);
      await db.collection("fornecedores").updateOne({ _id: produto.fornecedorId }, { $set: { avaliacao: mediaNotas(notas), totalAvaliacoes: notas.length } });
    }

    await auditar(req, { acao: existente ? "avaliacao.atualizada" : "avaliacao.criada", entidade: "produto", entidadeId: produtoId, detalhes: { nota } });
    res.status(existente ? 200 : 201).json({ message: existente ? "Avaliação atualizada." : "Avaliação registrada." });
  } catch (error) {
    next(error);
  }
});

router.post("/", carregarUsuario, exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    const { dados, erro } = lerProduto(req.body);
    if (erro) return res.status(400).json({ message: erro });

    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const col = getDatabase().collection("produtos");
    if (await col.findOne({ fornecedorId: fornecedor._id, chave: dados.chave, ativo: true }, { projection: { _id: 1 } })) {
      return res.status(409).json({ message: "Você já tem um produto com esse nome e marca." });
    }

    const doc = { ...dados, fornecedorId: fornecedor._id, laudoId: null, imagens: [], vendidos: 0, ativo: true, criadoEm: new Date() };
    const { insertedId } = await col.insertOne(doc);
    await auditar(req, { acao: "produto.criado", entidade: "produto", entidadeId: insertedId, detalhes: { nome: dados.nome } });

    res.status(201).json({ message: "Produto cadastrado.", id: String(insertedId) });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", carregarUsuario, exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Produto não encontrado." });

    const { dados, erro } = lerProduto(req.body);
    if (erro) return res.status(400).json({ message: erro });

    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const col = getDatabase().collection("produtos");
    const _id = new ObjectId(req.params.id);
    if (await col.findOne({ fornecedorId: fornecedor._id, chave: dados.chave, ativo: true, _id: { $ne: _id } }, { projection: { _id: 1 } })) {
      return res.status(409).json({ message: "Você já tem um produto com esse nome e marca." });
    }

    const resultado = await col.updateOne(
      { _id, fornecedorId: fornecedor._id, ativo: { $ne: false } },
      { $set: { ...dados, atualizadoEm: new Date() } }
    );

    if (!resultado.matchedCount) return res.status(404).json({ message: "Produto não encontrado." });
    await auditar(req, { acao: "produto.atualizado", entidade: "produto", entidadeId: _id, detalhes: { nome: dados.nome } });
    res.json({ message: "Produto atualizado." });
  } catch (error) {
    next(error);
  }
});

export async function removerProdutos(req, fornecedor, ids) {
  const db = getDatabase();
  const objetos = ids.map(id => new ObjectId(id));
  const proprios = await db.collection("produtos").find({ _id: { $in: objetos }, fornecedorId: fornecedor._id, ativo: { $ne: false } }, { projection: { _id: 1, nome: 1 } }).toArray();

  const emAndamento = new Set((await db.collection("pedidos").find(
    { "itens.produtoId": { $in: proprios.map(p => p._id) }, status: { $in: ["aguardando_pagamento", "em_analise", "pago", "enviado"] } },
    { projection: { itens: 1 } }
  ).toArray()).flatMap(p => p.itens.map(i => String(i.produtoId))));

  const removiveis = proprios.filter(p => !emAndamento.has(String(p._id)));
  if (removiveis.length) {
    await db.collection("produtos").updateMany({ _id: { $in: removiveis.map(p => p._id) } }, { $set: { ativo: false, atualizadoEm: new Date() } });
    await auditar(req, { acao: "produto.removido", entidade: "produto", detalhes: { ids: removiveis.map(p => String(p._id)) } });
  }

  const bloqueados = proprios.filter(p => emAndamento.has(String(p._id))).map(p => ({ id: String(p._id), nome: p.nome }));
  const naoEncontrados = ids.length - proprios.length;
  return { removidos: removiveis.length, bloqueados, naoEncontrados };
}

router.post("/remover", carregarUsuario, exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids) ? [...new Set(req.body.ids)].slice(0, 100) : [];
    if (!ids.length || !ids.every(idValido)) return res.status(400).json({ message: "Selecione ao menos um produto válido." });

    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const resultado = await removerProdutos(req, fornecedor, ids);
    res.status(resultado.bloqueados.length && !resultado.removidos ? 409 : 200).json({
      message: resultado.bloqueados.length
        ? "Alguns produtos têm pedidos em andamento e não foram removidos."
        : "Produtos removidos do catálogo.",
      ...resultado
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", carregarUsuario, exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ message: "Produto não encontrado." });

    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const resultado = await removerProdutos(req, fornecedor, [req.params.id]);

    if (resultado.bloqueados.length) return res.status(409).json({ message: "Este produto tem pedidos em andamento e não pode ser removido." });
    if (!resultado.removidos) return res.status(404).json({ message: "Produto não encontrado." });
    res.json({ message: "Produto removido do catálogo." });
  } catch (error) {
    next(error);
  }
});

export default router;
