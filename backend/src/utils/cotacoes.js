import { ObjectId } from "mongodb";
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

export async function garantirCotacoes(userId) {
  const col = getDatabase().collection("cotacoes");
  if (await col.countDocuments({ userId }, { limit: 1 })) return;

  const modelos = await col.find({ modelo: true }).sort({ ordem: 1 }).toArray();
  const agora = new Date();

  for (const modelo of modelos) {
    const numero = await proximoNumero("cotacao");
    const resto = { ...modelo };
    const diasValidade = resto.diasValidade;
    for (const campo of ["_id", "modelo", "ordem", "seed", "diasValidade"]) delete resto[campo];
    await col.insertOne({
      ...resto,
      userId,
      codigo: "CR" + String(numero).padStart(5, "0"),
      criadoEm: agora,
      vencimento: new Date(agora.getTime() + (diasValidade ?? 3) * 86400000),
      propostas: (modelo.propostas || []).map(p => ({ ...p, _id: new ObjectId() }))
    });
  }
}
