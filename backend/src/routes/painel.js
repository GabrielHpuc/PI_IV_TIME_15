import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { carregarUsuario } from "../middleware/auth.js";
import { fornecedorDoUsuario } from "../utils/fornecedores.js";

const router = Router();
router.use(carregarUsuario);

router.get("/", async (req, res, next) => {
  try {
    const db = getDatabase();

    if (req.usuario.tipo === "produtor") {
      const [cotacoes, pedidos, recomendados] = await Promise.all([
        db.collection("cotacoes").find({ userId: req.usuario.id }).sort({ criadoEm: -1 }).limit(6).toArray(),
        db.collection("pedidos").find({ userId: req.usuario.id }).sort({ criadoEm: -1 }).limit(5).toArray(),
        db.collection("produtos").find({ ativo: { $ne: false } }).sort({ vendidos: -1, _id: 1 }).limit(8).toArray()
      ]);

      return res.json({
        tipo: "produtor",
        cotacoes: cotacoes.map(c => ({
          id: String(c._id), codigo: c.codigo, item: c.item, status: c.status,
          totalPropostas: (c.propostas || []).length, vencimento: c.vencimento
        })),
        pedidos: pedidos.map(p => ({
          id: String(p._id),
          numero: p.numero,
          status: p.status,
          total: p.total,
          criadoEm: p.criadoEm,
          entrega: p.entrega,
          itens: (p.itens || []).map(i => ({
            produtoId: String(i.produtoId),
            nome: i.nome,
            quantidade: i.quantidade,
            preco: i.preco,
            subtotal: i.subtotal
          }))
        })),
        recomendados: recomendados.map(p => ({
          id: String(p._id), nome: p.nome, categoria: p.categoria, preco: p.preco, laudo: Boolean(p.laudoId),
          imagens: p.imagens || []
        }))
      });
    }

    const fornecedor = await fornecedorDoUsuario(req.usuario);
    const [produtos, cotacoesAbertas, vendas] = await Promise.all([
      db.collection("produtos").countDocuments({ fornecedorId: fornecedor._id, ativo: { $ne: false } }),
      db.collection("cotacoes").countDocuments({ modelo: { $ne: true }, status: { $in: ["aguardando", "analise"] }, vencimento: { $gte: new Date() } }),
      db.collection("pedidos").countDocuments({ "itens.fornecedorId": fornecedor._id })
    ]);

    return res.json({ tipo: "fornecedor", produtos, cotacoesAbertas, vendas, avaliacao: fornecedor.avaliacao ?? 0 });
  } catch (error) {
    next(error);
  }
});

export default router;
