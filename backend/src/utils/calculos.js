// Gabriel
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pastaClienteJava = path.resolve(__dirname, "../../../servidor-java/Cliente");

// Converte valores em reais para centavos inteiros para evitar erro de arredondamento com ponto flutuante
const centavos = valor => Math.round(Number(valor) * 100);

// Soma o preco multiplicado pela quantidade de cada item do pedido
export function totalItens(itens) {
  return itens.reduce((soma, item) => soma + centavos(item.preco) * item.quantidade, 0) / 100;
}

export function totalPedido(itens, frete) {
  return (centavos(totalItens(itens)) + centavos(frete)) / 100;
}

// Divide o valor total entre as parcelas jogando eventual diferenca de centavos na ultima parcela
export function dividirParcelas(total, quantidade) {
  const cents = centavos(total);
  const base = Math.floor(cents / quantidade);
  const resto = cents - base * quantidade;
  return Array.from({ length: quantidade }, (_, i) => (base + (i === quantidade - 1 ? resto : 0)) / 100);
}

// Executa o Cliente Java passando subtotal, frete e parcelas e usa calculo local no Node caso o servidor Java esteja desligado
export function calcularPedidoNoServidorJava(itens, frete, parcelas = 1) {
  const subtotal = totalItens(itens);
  return new Promise(resolve => {
    execFile(
      "java",
      ["-cp", pastaClienteJava, "Cliente", "calcular", String(subtotal), String(frete), String(parcelas)],
      { timeout: 2500 },
      (erro, stdout) => {
        if (!erro && stdout) {
          try {
            const dados = JSON.parse(String(stdout).trim());
            const totalJava = Math.round(Number(dados.total) * 100) / 100;
            const parcelaJava = Math.round(Number(dados.valorParcela) * 100) / 100;
            if (Number.isFinite(totalJava) && Number.isFinite(parcelaJava)) {
              return resolve({
                subtotal,
                total: totalJava,
                valorParcelas: dividirParcelas(totalJava, parcelas),
                calculadoNoJava: true
              });
            }
          } catch {}
        }
        const totalLocal = totalPedido(itens, frete);
        resolve({
          subtotal,
          total: totalLocal,
          valorParcelas: dividirParcelas(totalLocal, parcelas),
          calculadoNoJava: false
        });
      }
    );
  });
}

// Calcula a media das avaliacoes de um fornecedor com uma casa decimal
export function mediaNotas(notas) {
  if (!notas.length) return 0;
  return Math.round((notas.reduce((soma, n) => soma + n, 0) / notas.length) * 10) / 10;
}

// Converte numeros digitados no formato brasileiro com virgula para o formato numerico do JavaScript
export function numeroBrasileiro(valor) {
  const s = String(valor ?? "").trim();
  if (!s) return NaN;
  return Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
}
