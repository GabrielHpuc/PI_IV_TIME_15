import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { carregarUsuario, exigirTipo } from "../middleware/auth.js";
import { auditar } from "../utils/auditoria.js";
import { fornecedorDoUsuario } from "../utils/fornecedores.js";
import { gerarPdf } from "../utils/pdf.js";
import { idValido, texto } from "../utils/validacao.js";

const router = Router();

const formatarData = data => (data ? new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-");

async function buscarLaudo(numero) {
  const db = getDatabase();
  const laudo = await db.collection("laudos").findOne({ numero: String(numero).toUpperCase() });
  if (!laudo) return null;
  const produto = laudo.produtoId ? await db.collection("produtos").findOne({ _id: laudo.produtoId }) : null;
  return { laudo, produto };
}

router.get("/:numero", async (req, res, next) => {
  try {
    const encontrado = await buscarLaudo(req.params.numero);
    if (!encontrado) return res.status(404).json({ message: "Laudo não encontrado." });

    const { laudo, produto } = encontrado;
    res.json({
      id: String(laudo._id),
      numero: laudo.numero,
      orgao: laudo.orgao,
      emissao: laudo.emissao,
      validade: laudo.validade,
      resultados: laudo.resultados ?? {},
      produto: produto ? { id: String(produto._id), nome: produto.nome } : null,
      download: `/api/laudos/${laudo.numero}/download`
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:numero/download", async (req, res, next) => {
  try {
    const encontrado = await buscarLaudo(req.params.numero);
    if (!encontrado) return res.status(404).json({ message: "Laudo não encontrado." });

    const { laudo, produto } = encontrado;
    const resultados = Object.entries(laudo.resultados ?? {}).map(([chave, valor]) => ({ texto: `${chave}: ${valor}` }));

    const pdf = gerarPdf([
      { texto: "LAUDO DE CONFORMIDADE TECNICA", tamanho: 18, negrito: true },
      { texto: `Numero: ${laudo.numero}`, negrito: true },
      { texto: `Orgao de referencia: ${laudo.orgao ?? "MAPA"}` },
      { texto: `Produto: ${produto?.nome ?? "-"}` },
      { texto: `Emissao: ${formatarData(laudo.emissao)}` },
      { texto: `Validade: ${formatarData(laudo.validade)}` },
      { texto: "" },
      { texto: "Resultados", tamanho: 13, negrito: true },
      ...resultados,
      { texto: "" },
      { texto: "Registro cadastrado na plataforma AgroRecursos MarketPlace.", tamanho: 9 },
      { texto: "Confirme a autenticidade junto ao orgao emissor antes da compra.", tamanho: 9 }
    ]);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${laudo.numero}.pdf"`
    });
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

router.post("/", carregarUsuario, exigirTipo("fornecedor"), async (req, res, next) => {
  try {
    const numero = texto(req.body.numero, 40).toUpperCase();
    const emissao = new Date(req.body.emissao);
    const validade = new Date(req.body.validade);
    const resultados = req.body.resultados && typeof req.body.resultados === "object" ? req.body.resultados : {};

    if (!/^[A-Z0-9-]{4,40}$/.test(numero)) return res.status(400).json({ message: "Informe um número de laudo válido." });
    if (!idValido(req.body.produtoId)) return res.status(400).json({ message: "Produto inválido." });
    if (Number.isNaN(emissao.getTime()) || Number.isNaN(validade.getTime()) || validade <= emissao) {
      return res.status(400).json({ message: "Informe datas de emissão e validade válidas." });
    }

    const db = getDatabase();
    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const produtoId = new ObjectId(req.body.produtoId);
    const produto = await db.collection("produtos").findOne({ _id: produtoId, fornecedorId: fornecedor._id, ativo: { $ne: false } });
    if (!produto) return res.status(404).json({ message: "Produto não encontrado." });

    if (await db.collection("laudos").findOne({ numero })) return res.status(409).json({ message: "Já existe um laudo com esse número." });

    const limpos = {};
    for (const [chave, valor] of Object.entries(resultados).slice(0, 12)) limpos[texto(chave, 40)] = texto(valor, 80);

    const { insertedId } = await db.collection("laudos").insertOne({
      numero, orgao: "MAPA", produtoId, fornecedorId: fornecedor._id, emissao, validade, resultados: limpos, criadoEm: new Date()
    });
    await db.collection("produtos").updateOne({ _id: produtoId }, { $set: { laudoId: insertedId } });

    await auditar(req, { acao: "laudo.vinculado", entidade: "laudo", entidadeId: insertedId, detalhes: { numero } });
    res.status(201).json({ message: "Laudo vinculado ao produto.", numero });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Já existe um laudo com esse número." });
    next(error);
  }
});

export default router;
