// Tom RA: 25015528
// Escolhe em qual conta o login vai entrar. Só contas cuja senha conferiu podem ser usadas:
// quem tem conta de produtor e de fornecedor no mesmo e-mail nunca entra na conta de uma senha que errou.
export function selecionarConta(checados, tipoEscolhido) {
  const validos = checados.filter(c => c.senhaOk);
  if (!validos.length) return { negado: true };

  if (tipoEscolhido) {
    const escolhido = validos.find(c => c.profile.accountType === tipoEscolhido);
    return escolhido ? { escolhido } : { negado: true };
  }

  if (validos.length > 1) return { opcoes: validos };
  return { escolhido: validos[0] };
}
