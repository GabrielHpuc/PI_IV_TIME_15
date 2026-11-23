// Tom RA: 25015528
import { getDatabase } from "../config/database.js";

// Incrementa e retorna o contador sequencial no banco para gerar codigos unicos de cotacao e pedido
export async function proximoNumero(nome) {
  const resultado = await getDatabase().collection("counters").findOneAndUpdate(
    { _id: nome },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return resultado.seq;
}

// Muda o status da cotacao para em analise assim que ela recebe pelo menos duas propostas
export const statusPelasPropostas = quantidade => (quantidade >= 2 ? "analise" : "aguardando");
