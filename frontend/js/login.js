
const form = document.querySelector("#login-form");
const message = document.querySelector("#message");
const button = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.textContent = "";
  button.disabled = true;
  button.textContent = "Entrando...";

  const formData = new FormData(form);

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Não foi possível entrar.");
    }

    window.location.href = "/minha-conta.html";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Entrar";
  }
});
