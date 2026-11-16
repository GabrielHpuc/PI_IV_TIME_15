import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";

export async function auditar(req, { acao, entidade = null, entidadeId = null, detalhes = {}, userId } = {}) {
  try {
    let dono = userId ?? req.usuario?.id ?? null;
    if (!dono && req.session?.userId && ObjectId.isValid(req.session.userId)) {
      dono = new ObjectId(req.session.userId);
    }

    await getDatabase().collection("auditoria").insertOne({
      userId: dono,
      acao,
      entidade,
      entidadeId: entidadeId ? String(entidadeId) : null,
      detalhes,
      ip: req.ip,
      criadoEm: new Date()
    });
  } catch (error) {
    console.error("Falha ao registrar auditoria:", error.message);
  }
}
