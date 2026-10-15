
const status = document.querySelector("#account-status");
const dataSection = document.querySelector("#account-data");
const logoutButton = document.querySelector("#logout-button");

async function loadAccount() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin"
    });

    const result = await response.json();

    if (!response.ok) {
      window.location.replace("/login.html");
      return;
    }

    document.querySelector("#account-name").textContent = result.user.name;
    document.querySelector("#account-email").textContent = result.user.email;
    document.querySelector("#account-type").textContent =
      result.user.accountType === "produtor"
        ? "Produtor rural"
        : "Fornecedor";

    status.textContent = "Você está conectado.";
    dataSection.hidden = false;
  } catch {
    status.textContent = "Não foi possível carregar sua conta.";
  }
}

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error("Não foi possível sair.");
    }

    window.location.replace("/login.html");
  } catch (error) {
    status.textContent = error.message;
    logoutButton.disabled = false;
  }
});

loadAccount();
