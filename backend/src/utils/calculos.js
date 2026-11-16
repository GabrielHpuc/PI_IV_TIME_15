const centavos = valor => Math.round(Number(valor) * 100);

export function totalItens(itens) {
  return itens.reduce((soma, item) => soma + centavos(item.preco) * item.quantidade, 0) / 100;
}

export function totalPedido(itens, frete) {
  return (centavos(totalItens(itens)) + centavos(frete)) / 100;
}

export function dividirParcelas(total, quantidade) {
  const cents = centavos(total);
  const base = Math.floor(cents / quantidade);
  const resto = cents - base * quantidade;
  return Array.from({ length: quantidade }, (_, i) => (base + (i === quantidade - 1 ? resto : 0)) / 100);
}

export function mediaNotas(notas) {
  if (!notas.length) return 0;
  return Math.round((notas.reduce((soma, n) => soma + n, 0) / notas.length) * 10) / 10;
}

export function numeroBrasileiro(valor) {
  const s = String(valor ?? "").trim();
  if (!s) return NaN;
  return Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
}
