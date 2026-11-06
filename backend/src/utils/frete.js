export function calcularFrete(cep) {
  const digitos = String(cep ?? "").replace(/\D/g, "");
  if (digitos.length !== 8) return null;
  return { cep: digitos, valor: 45 + Number(digitos[0]) * 5, prazo: 3 };
}
