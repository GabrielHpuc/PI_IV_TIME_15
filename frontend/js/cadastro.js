
const form = document.querySelector("#register-form");
const message = document.querySelector("#message");
const button = form.querySelector('button[type="submit"]');

const formData = new FormData(form);

const data = {
  name: formData.get("name").trim(),
  email: formData.get("email").trim(),
  password: formData.get("password"),
  accountType: formData.get("accountType")
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.textContent = "";
  button.disabled = true;
  button.textContent = "Criando conta...";

  const data = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value,
    accountType: form.accountType.value
  };

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Não foi possível criar a conta.");
    }

    form.reset();
    window.location.href = "/minha-conta.html";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Criar conta";
  }
});
