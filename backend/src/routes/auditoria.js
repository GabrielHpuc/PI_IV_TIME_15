import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { carregarUsuario } from "../middleware/auth.js";

const router = Router();
router.use(carregarUsuario);

router.get("/", async (req, res, next) => {
  try {
    const limite = Math.min(Math.max(Math.trunc(Number(req.query.limite) || 20), 1), 100);
    const filtro = { userId: req.usuario.id };
    if (req.query.acao) filtro.acao = String(req.query.acao).slice(0, 60);

    const itens = await getDatabase().collection("auditoria").find(filtro).sort({ criadoEm: -1 }).limit(limite).toArray();
    res.json({
      itens: itens.map(a => ({
        id: String(a._id), acao: a.acao, entidade: a.entidade, entidadeId: a.entidadeId, detalhes: a.detalhes, criadoEm: a.criadoEm
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
