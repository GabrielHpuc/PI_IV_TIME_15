export function calcularFrete(cep) {
  const digitos = String(cep ?? "").replace(/\D/g, "");
  if (digitos.length !== 8) return null;
  // prazo de transporte (dias úteis) pela região do CEP, tendo o Sudeste (SP) como origem
  const prazos = [3, 3, 4, 4, 7, 8, 9, 6, 5, 6];
  return { cep: digitos, valor: 45 + Number(digitos[0]) * 5, prazo: prazos[Number(digitos[0])] };
}
