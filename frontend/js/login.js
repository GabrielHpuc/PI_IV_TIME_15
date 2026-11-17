
try {
  document.documentElement.classList.toggle("dark-mode", localStorage.getItem("agro_tema") === "dark");
} catch (e) {}

const form = document.querySelector("#login-form");
const message = document.querySelector("#message");
const button = form.querySelector('button[type="submit"]');
const choiceBox = document.querySelector("#account-choice");
const choiceButtons = document.querySelector("#account-choice-buttons");

function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function enviarLogin(accountType) {
  message.textContent = "";
  button.disabled = true;
  button.textContent = "Entrando...";

  const formData = new FormData(form);
  const corpo = {
    login: String(formData.get("login")).trim(),
    password: formData.get("password")
  };
  if (accountType) {
    corpo.accountType = accountType;
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(corpo)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Não foi possível entrar.");
    }

    if (result.chooseAccountType && Array.isArray(result.accounts)) {
      choiceButtons.innerHTML = result.accounts.map((acc) => {
        const ehFornecedor = acc.accountType === "fornecedor";
        const rotulo = ehFornecedor ? "🏢 Entrar como Fornecedor / Vendedor" : "🌱 Entrar como Produtor Rural";
        return '<button type="button" class="button account-choice-btn" data-account-type="' + esc(acc.accountType) + '">' +
          "<strong>" + rotulo + "</strong>" +
          "<small>" + esc(acc.name) + "</small></button>";
      }).join("");
      choiceBox.hidden = false;
      return;
    }

    if (result.user) {
      try {
        localStorage.setItem("agro_tipo_conta", result.user.accountType || "produtor");
        localStorage.setItem("agro_tema", result.user.darkMode ? "dark" : "light");
        if (Array.isArray(result.user.favoritos)) {
          localStorage.setItem("agro_favoritos", JSON.stringify(result.user.favoritos));
        }
      } catch (e) {}
    }

    window.location.href = "dashboard.html";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Entrar";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  choiceBox.hidden = true;
  await enviarLogin(null);
});

choiceButtons.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-account-type]");
  if (!btn) return;
  await enviarLogin(btn.dataset.accountType);
});
