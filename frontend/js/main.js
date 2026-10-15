
async function checkServer() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    if (!response.ok || data.status !== "ok") {
      throw new Error("Servidor indisponível.");
    }

    console.info("API AgroRecursos conectada:", data.application);
  } catch (error) {
    console.error("Não foi possível acessar a API:", error.message);
  }
}

checkServer();


