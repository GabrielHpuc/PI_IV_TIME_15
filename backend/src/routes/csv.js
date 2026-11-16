import { Router } from "express";
import express from "express";
import { getDatabase } from "../config/database.js";
import { carregarUsuario, exigirTipo } from "../middleware/auth.js";
import { auditar } from "../utils/auditoria.js";
import { gerarCsv, lerCsv } from "../utils/csv.js";
import { fornecedorDoUsuario } from "../utils/fornecedores.js";
import { lerProduto } from "../utils/produtos.js";

const router = Router();
router.use(carregarUsuario);

const COLUNAS_PRODUTO = ["nome", "categoria", "marca", "regiao", "preco", "entregaDias", "estoque", "cultura", "tecnologia", "embalagem", "descricao"];
const LIMITE_LINHAS = 500;
const formatarPreco = valor => Number(valor).toFixed(2).replace(".", ",");
const formatarData = valor => new Date(valor).toISOString().slice(0, 10);

function enviarCsv(res, nome, conteudo) {
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${nome}"`
  });
  res.send(conteudo);
}

router.post("/produtos", exigirTipo("fornecedor"), express.text({ type: ["text/csv", "text/plain"], limit: "1mb" }), async (req, res, next) => {
  try {
    if (typeof req.body !== "string" || !req.body.trim()) return res.status(400).json({ message: "Envie o conteúdo do arquivo CSV." });

    const registros = lerCsv(req.body);
    if (!registros.length) return res.status(400).json({ message: "O arquivo não tem linhas de dados. Use a primeira linha como cabeçalho." });
    if (registros.length > LIMITE_LINHAS) return res.status(400).json({ message: `O arquivo pode ter no máximo ${LIMITE_LINHAS} produtos.` });

    const colunas = Object.keys(registros[0].valores);
    const faltando = ["nome", "categoria", "marca", "regiao", "preco", "entregaDias"].filter(c => !colunas.includes(c));
    if (faltando.length) return res.status(400).json({ message: `Colunas obrigatórias ausentes: ${faltando.join(", ")}.` });

    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const col = getDatabase().collection("produtos");
    const existentes = new Set((await col.find({ fornecedorId: fornecedor._id, ativo: true }, { projection: { chave: 1 } }).toArray()).map(p => p.chave));

    const novos = [];
    const ignorados = [];

    for (const { linha, valores } of registros) {
      const { dados, erro } = lerProduto(valores);
      if (erro) {
        ignorados.push({ linha, motivo: erro });
      } else if (existentes.has(dados.chave)) {
        ignorados.push({ linha, motivo: "Produto duplicado (mesmo nome e marca)." });
      } else {
        existentes.add(dados.chave);
        novos.push({ ...dados, fornecedorId: fornecedor._id, laudoId: null, imagens: [], vendidos: 0, ativo: true, criadoEm: new Date() });
      }
    }

    if (novos.length) await col.insertMany(novos);
    await auditar(req, { acao: "produto.importado", entidade: "produto", detalhes: { importados: novos.length, ignorados: ignorados.length } });

    res.status(novos.length ? 201 : 200).json({
      message: `${novos.length} produto(s) importado(s), ${ignorados.length} ignorado(s).`,
      importados: novos.length,
      ignorados
    });
  } catch (error) {
    next(error);
  }
});

router.get("/modelo-produtos", exigirTipo("fornecedor"), (req, res) => {
  enviarCsv(res, "modelo-produtos.csv", gerarCsv(COLUNAS_PRODUTO, [
    ["Semente Soja RR 40kg", "Sementes", "Monsanto", "Centro-Oeste", "180,00", 3, 500, "Soja", "RR", "Saco: 40kg", "Descrição opcional"]
  ]));
});

router.get("/produtos", exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const produtos = await getDatabase().collection("produtos").find({ fornecedorId: fornecedor._id, ativo: true }).sort({ nome: 1 }).toArray();
    enviarCsv(res, "meus-produtos.csv", gerarCsv(COLUNAS_PRODUTO, produtos.map(p => [
      p.nome, p.categoria, p.marca, p.regiao, formatarPreco(p.preco), p.entregaDias, p.estoque ?? 0, p.cultura, p.tecnologia, p.embalagem, p.descricao
    ])));
  } catch (error) {
    next(error);
  }
});

router.get("/pedidos", async (req, res, next) => {
  try {
    const col = getDatabase().collection("pedidos");
    const comprador = req.usuario.tipo === "produtor";
    let filtro;

    if (comprador) {
      filtro = { userId: req.usuario.id };
    } else {
      const fornecedor = await fornecedorDoUsuario(req.usuario);
      filtro = { "itens.fornecedorId": fornecedor._id };
    }

    const pedidos = await col.find(filtro).sort({ criadoEm: -1 }).toArray();
    if (!pedidos.length) return res.status(404).json({ message: "Não há pedidos para exportar." });

    const pendentes = pedidos.filter(p => ["aguardando_pagamento", "em_analise"].includes(p.status));
    if (pendentes.length) {
      return res.status(409).json({
        message: "A exportação só é liberada quando todos os pedidos têm o pagamento definido.",
        pendentes: pendentes.map(p => p.numero)
      });
    }

    const linhas = [];
    for (const p of pedidos) {
      const itens = comprador ? p.itens : p.itens.filter(i => String(i.fornecedorId) === String(filtro["itens.fornecedorId"]));
      for (const i of itens) {
        linhas.push([p.numero, formatarData(p.criadoEm), p.status, p.pagamento?.metodo, i.nome, i.quantidade, formatarPreco(i.preco), formatarPreco(i.subtotal), p.entrega?.cidade, p.entrega?.estado]);
      }
    }

    await auditar(req, { acao: "pedido.exportado", entidade: "pedido", detalhes: { pedidos: pedidos.length } });
    enviarCsv(res, comprador ? "meus-pedidos.csv" : "minhas-vendas.csv", gerarCsv(
      ["pedido", "data", "status", "pagamento", "produto", "quantidade", "preco_unitario", "subtotal", "cidade", "uf"], linhas
    ));
  } catch (error) {
    next(error);
  }
});

export default router;
