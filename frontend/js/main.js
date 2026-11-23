// Pedro RA: 25004075
// Aplica o modo escuro salvo no navegador logo ao abrir a pagina inicial
function aplicarTemaInicial() {
  try {
    const ultimaConta = localStorage.getItem("agro_ultima_conta_id");
    const temaUltimaConta = localStorage.getItem("agro_tema_ultima_conta");
    const escuro = Boolean(ultimaConta) && temaUltimaConta === "dark";
    document.documentElement.classList.toggle("dark-mode", escuro);
    if (!escuro) {
      localStorage.setItem("agro_tema", "light");
    }
  } catch (e) {
    document.documentElement.classList.remove("dark-mode");
  }
}

aplicarTemaInicial();

// Sincroniza o tema escuro com a preferencia salva na sessao do usuario e verifica o status da API
async function sincronizarTemaSessao() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.user && data.user.id) {
      const escuro = Boolean(data.user.darkMode);
      localStorage.setItem("agro_ultima_conta_id", String(data.user.id));
      localStorage.setItem("agro_tema_ultima_conta", escuro ? "dark" : "light");
      localStorage.setItem("agro_tema", escuro ? "dark" : "light");
      document.documentElement.classList.toggle("dark-mode", escuro);
    }
  } catch (e) {}
}

sincronizarTemaSessao();

async function verificarServidor() {
  try {
    const response = await fetch("/api/health");

    if (!response.ok) {
      throw new Error("Servidor indisponível.");
    }

    const data = await response.json();
    console.log("AgroRecursos conectado:", data);
  } catch (error) {
    console.error("Erro ao verificar servidor:", error);
  }
}

verificarServidor();
