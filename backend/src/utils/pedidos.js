// Tom RA: 25015528
// Cada fornecedor acompanha o status dos próprios itens; o status do pedido é o do item menos adiantado.
const ETAPA = {
  criado: 0, aguardando_pagamento: 0, em_analise: 0,
  confirmado: 1, pago: 1,
  em_separacao: 2,
  enviado: 3,
  entregue: 4
};

// Calcula o status geral do pedido a partir do status de cada item (itens antigos sem status usam o padrão)
export function statusDoPedido(itens, padrao = "criado") {
  const ativos = itens.map(i => i.status ?? padrao).filter(s => s !== "cancelado");
  if (!ativos.length) return "cancelado";
  return ativos.reduce((menor, s) => ((ETAPA[s] ?? 0) < (ETAPA[menor] ?? 0) ? s : menor));
}

// Reserva o estoque de cada item de forma atômica; se um item não tiver estoque, devolve os que já foram reservados.
// Produtos antigos sem o campo estoque numérico só têm o contador de vendidos atualizado.
export async function reservarEstoque(db, itens, produtos) {
  const feitos = [];
  for (const item of itens) {
    const controla = typeof produtos.get(String(item.produtoId))?.estoque === "number";
    const filtro = { _id: item.produtoId, ativo: { $ne: false }, ...(controla ? { estoque: { $gte: item.quantidade } } : {}) };
    const inc = { vendidos: item.quantidade, ...(controla ? { estoque: -item.quantidade } : {}) };
    const resultado = await db.collection("produtos").updateOne(filtro, { $inc: inc });
    if (!resultado.matchedCount) {
      await devolverEstoque(db, feitos);
      return { falhou: item };
    }
    feitos.push(item);
  }
  return { feitos };
}

// Devolve ao estoque e desconta das vendas os itens de um pedido que falhou ou foi cancelado
export async function devolverEstoque(db, itens) {
  for (const item of itens) {
    await db.collection("produtos").updateOne({ _id: item.produtoId }, { $inc: { vendidos: -item.quantidade } });
    await db.collection("produtos").updateOne({ _id: item.produtoId, estoque: { $type: "number" } }, { $inc: { estoque: item.quantidade } });
  }
}
