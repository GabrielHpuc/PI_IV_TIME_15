import { getDatabase } from "../config/database.js";

export async function proximoNumero(nome) {
  const resultado = await getDatabase().collection("counters").findOneAndUpdate(
    { _id: nome },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return resultado.seq;
}

export const statusPelasPropostas = quantidade => (quantidade >= 2 ? "analise" : "aguardando");
