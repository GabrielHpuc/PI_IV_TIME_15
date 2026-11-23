// Tom RA: 25015528
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";

// Verifica se existe uma sessao valida no servidor e carrega os dados do usuario logado em req.usuario
export async function carregarUsuario(req, res, next) {
  try {
    if (!req.session.userId || !ObjectId.isValid(req.session.userId)) {
      return res.status(401).json({ message: "Faça login para continuar." });
    }

    const userId = new ObjectId(req.session.userId);
    const db = getDatabase();
    const user = await db.collection("users").findOne({ _id: userId });
    const profile = await db.collection("profiles").findOne({ userId });

    if (!user || !profile || user.status !== "active") {
      return res.status(401).json({ message: "Sessão inválida. Entre novamente." });
    }

    req.usuario = {
      id: userId,
      nome: profile.name,
      email: user.email,
      tipo: profile.accountType,
      perfil: profile
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

// Restringe o acesso de determinadas rotas apenas para produtores ou apenas para fornecedores
export const exigirTipo = tipo => (req, res, next) => {
  if (req.usuario?.tipo === tipo) return next();
  return res.status(403).json({
    message: tipo === "produtor"
      ? "Disponível apenas para produtores rurais."
      : "Disponível apenas para fornecedores."
  });
};
