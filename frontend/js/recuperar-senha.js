const form = document.querySelector("#recovery-form");
const message = document.querySelector("#message");
const button = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.textContent = "";
  message.style.color = "";
  button.disabled = true;
  button.textContent = "Enviando...";

  try {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email: form.email.value.trim() })
    });

    if (response.status === 404) {
      throw new Error("A recuperação de senha ainda não está disponível.");
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Não foi possível enviar o link.");
    }

    message.style.color = "#1f7a4a";
    message.textContent = "Se o e-mail estiver cadastrado, você receberá o link de recuperação.";
    form.reset();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Enviar Link de Recuperação →";
  }
});
