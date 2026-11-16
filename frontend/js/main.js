try {
  document.documentElement.classList.toggle("dark-mode", localStorage.getItem("agro_tema") === "dark");
} catch (e) {}

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
