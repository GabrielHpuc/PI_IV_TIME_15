import { ObjectId } from "mongodb";

export const texto = (valor, max = 120) => String(valor ?? "").trim().slice(0, max);
export const digitos = valor => String(valor ?? "").replace(/\D/g, "");
export const arredondar = valor => Math.round(valor * 100) / 100;
export const idValido = valor => typeof valor === "string" && ObjectId.isValid(valor) && String(new ObjectId(valor)) === valor;
export const escaparRegex = valor => valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const CATEGORIAS = ["Sementes", "Fertilizantes", "Defensivos", "Outros"];
export const REGIOES = ["Sudeste", "Sul", "Centro-Oeste", "Nordeste", "Norte"];
export const METODOS_PAGAMENTO = ["boleto", "cartao", "credito_rural"];

export function validarCpfCnpj(valor) {
  const d = digitos(valor);
  if (d.length === 11) return cpfValido(d);
  if (d.length === 14) return cnpjValido(d);
  return false;
}

function cpfValido(d) {
  if (/^(\d)\1+$/.test(d)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(d[tamanho])) return false;
  }
  return true;
}

function cnpjValido(d) {
  if (/^(\d)\1+$/.test(d)) return false;
  for (const tamanho of [12, 13]) {
    const pesos = tamanho === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * pesos[i];
    const resto = soma % 11;
    const dv = resto < 2 ? 0 : 11 - resto;
    if (dv !== Number(d[tamanho])) return false;
  }
  return true;
}
