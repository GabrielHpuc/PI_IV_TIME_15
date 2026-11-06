const form = document.querySelector("#reset-form");
const message = document.querySelector("#message");
const button = form.querySelector('button[type="submit"]');
const token = new URLSearchParams(window.location.search).get("token") || "";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.textContent = "";
  message.style.color = "";

  if (form.password.value !== form.confirm.value) {
    message.textContent = "As senhas não coincidem.";
    return;
  }

  button.disabled = true;
  button.textContent = "Salvando...";

  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token, password: form.password.value })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Não foi possível redefinir a senha.");
    }

    message.style.color = "#1f7a4a";
    message.textContent = result.message + " Redirecionando para o login...";
    form.reset();
    setTimeout(() => { window.location.href = "login.html"; }, 2000);
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = "Salvar nova senha →";
  }
});
