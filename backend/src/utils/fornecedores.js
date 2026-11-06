import { getDatabase } from "../config/database.js";

export async function fornecedorDoUsuario(usuario) {
  const col = getDatabase().collection("fornecedores");
  const existente = await col.findOne({ userId: usuario.id });
  if (existente) return existente;

  const agora = new Date();
  const doc = {
    userId: usuario.id,
    nome: usuario.perfil.companyName || usuario.nome,
    nomeFantasia: usuario.perfil.tradeName || usuario.nome,
    avaliacao: 0,
    totalAvaliacoes: 0,
    criadoEm: agora
  };
  const { insertedId } = await col.insertOne(doc);
  return { ...doc, _id: insertedId };
}
