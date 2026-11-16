// Gabriel
const $ = (selector) => document.querySelector(selector);
const statusElement = $("#account-status");
const profileMessage = $("#profile-message");
const prefMessage = $("#pref-message");
const darkToggle = $("#dark-mode-toggle");
const darkLabel = $("#dark-mode-label");
const favoritesContainer = $("#favorites-list");
const saveButton = $("#save-profile");

function applyTheme(dark) {
  const isDark = Boolean(dark);
  document.documentElement.classList.toggle("dark-mode", isDark);
  try {
    localStorage.setItem("agro_tema", isDark ? "dark" : "light");
  } catch (e) {}
  if (darkToggle) darkToggle.checked = isDark;
  if (darkLabel) darkLabel.textContent = isDark ? "Ativado" : "Desativado";
}

try {
  applyTheme(localStorage.getItem("agro_tema") === "dark");
} catch (e) {}

const esc = (texto) => String(texto ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const moeda = (valor) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function readFavs() {
  try {
    const d = JSON.parse(localStorage.getItem("agro_favoritos"));
    return Array.isArray(d) ? d.filter(id => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)) : [];
  } catch (e) {
    return [];
  }
}

function saveFavs(ids) {
  const unique = Array.from(new Set(ids));
  try {
    localStorage.setItem("agro_favoritos", JSON.stringify(unique));
  } catch (e) {}
  return unique;
}

async function renderFavoritesSection() {
  if (!favoritesContainer) return;
  const ids = readFavs();
  if (!ids.length) {
    favoritesContainer.innerHTML = '<div class="account-card empty-state"><h2>Seus favoritos</h2><p>Você ainda não favoritou nenhum produto.</p><a href="catalogo.html" class="button">Explorar o catálogo</a></div>';
    return;
  }
  try {
    const res = await fetch("/api/produtos?ids=" + encodeURIComponent(ids.join(",")) + "&limite=48", { credentials: "same-origin" });
    const data = await res.json();
    const itens = Array.isArray(data.itens) ? data.itens : [];
    if (!itens.length) {
      favoritesContainer.innerHTML = '<div class="account-card empty-state"><h2>Seus favoritos</h2><p>Você ainda não favoritou nenhum produto.</p><a href="catalogo.html" class="button">Explorar o catálogo</a></div>';
      return;
    }
    favoritesContainer.innerHTML = '<div class="grade-produtos">' + itens.map(p => {
      const selo = p.laudo ? '<span class="mk-selo">Laudo MAPA</span>' : "";
      const foto = (Array.isArray(p.imagens) && p.imagens[0]) || p.imagem || "";
      const thumb = foto
        ? '<img class="mk-thumb-img" src="' + esc(foto) + '" alt="' + esc(p.nome) + '">'
        : "🌱";
      return '<article class="produto-card mk-card"><div class="produto-card-corpo">' +
        '<div class="produto-card-img"><div class="mk-thumb">' + thumb + "</div>" + selo + "</div>" +
        '<div class="produto-card-info"><h3>' + esc(p.nome) + '</h3><span class="preco">' + moeda(p.preco) + "</span></div>" +
        '<button type="button" class="btn-favorito ativo" data-favorito="' + esc(p.id) + '" aria-pressed="true" title="Remover dos favoritos">★</button></div>' +
        '<div class="produto-card-acoes"><a class="mk-btn" href="produto.html?id=' + esc(p.id) + '">Ver Detalhes</a></div></article>';
    }).join("") + "</div>";
  } catch (e) {
    favoritesContainer.innerHTML = '<div class="account-card empty-state"><p>Não foi possível carregar seus favoritos.</p></div>';
  }
}

if (favoritesContainer) {
  favoritesContainer.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-favorito]");
    if (!btn) return;
    const alvo = btn.dataset.favorito;
    const novaLista = saveFavs(readFavs().filter(id => id !== alvo));
    fetch("/api/auth/preferences", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favoritos: novaLista })
    }).catch(() => {});
    renderFavoritesSection();
  });
}

if (darkToggle) {
  darkToggle.addEventListener("change", async () => {
    const dark = darkToggle.checked;
    applyTheme(dark);
    if (prefMessage) {
      prefMessage.textContent = "Salvando preferência...";
      prefMessage.classList.add("success-message");
    }
    try {
      const res = await fetch("/api/auth/preferences", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ darkMode: dark })
      });
      if (!res.ok) throw new Error("Não foi possível salvar a preferência.");
      if (currentUser) currentUser.darkMode = dark;
      if (prefMessage) prefMessage.textContent = "Preferência de tema salva na sua conta!";
    } catch (err) {
      if (prefMessage) {
        prefMessage.classList.remove("success-message");
        prefMessage.textContent = err.message;
      }
    }
  });
}
const fields = {
  name: $("#edit-name"), email: $("#edit-email"), phone: $("#edit-phone"),
  document: $("#edit-document"), cep: $("#edit-cep"), street: $("#edit-street"),
  number: $("#edit-number"), complement: $("#edit-complement"),
  neighborhood: $("#edit-neighborhood"), city: $("#edit-city"), state: $("#edit-state"),
  accountType: $("#edit-account-type")
};
const sections = {
  overview: $("#overview-section"), "edit-profile": $("#edit-profile-section"),
  cart: $("#cart-section"), favorites: $("#favorites-section"), purchases: $("#purchases-section")
};
const titles = { overview: "Minha conta", "edit-profile": "Editar perfil", cart: "Carrinho", favorites: "Favoritos", purchases: "Minhas compras" };
let currentUser = null;
const clean = value => String(value ?? "").trim();
const typeLabel = type => type === "produtor" ? "Produtor rural" : type === "fornecedor" ? "Fornecedor" : "Não informado";
function addressLabel(a = {}) {
  const first = [a.street, a.number].filter(Boolean).join(", ");
  const second = [a.neighborhood, a.city, a.state].filter(Boolean).join(" - ");
  return [first, a.complement, second, a.cep].filter(Boolean).join(", ") || "Não informado";
}
function fillForm(user) {
  fields.name.value = user.name || ""; fields.email.value = user.email || "";
  fields.phone.value = user.phone || ""; fields.document.value = user.document || "";
  const a = user.address || {};
  fields.cep.value = a.cep || ""; fields.street.value = a.street || "";
  fields.number.value = a.number || ""; fields.complement.value = a.complement || "";
  fields.neighborhood.value = a.neighborhood || ""; fields.city.value = a.city || "";
  fields.state.value = a.state || ""; fields.accountType.value = typeLabel(user.accountType);
}
function showSection(name) {
  if (!sections[name]) return;
  Object.entries(sections).forEach(([key, section]) => section.hidden = key !== name);
  document.querySelectorAll(".account-nav-item[data-section]").forEach(button => button.classList.toggle("active", button.dataset.section === name));
  $("#page-title").textContent = titles[name];
  if (name === "edit-profile" && currentUser) { fillForm(currentUser); profileMessage.textContent = ""; profileMessage.classList.remove("success-message"); }
  if (name === "favorites") { renderFavoritesSection(); }
}
document.querySelectorAll("[data-section]").forEach(el => el.addEventListener("click", () => showSection(el.dataset.section)));
async function loadAccount() {
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (response.status === 401) { window.location.replace("login.html"); return; }
    const result = await response.json();
    if (!response.ok || !result.user) throw new Error(result.message || "Não foi possível carregar sua conta.");
    currentUser = result.user;
    if (typeof currentUser.darkMode === "boolean") {
      applyTheme(currentUser.darkMode);
    }
    if (Array.isArray(currentUser.favoritos) && currentUser.favoritos.length) {
      saveFavs(currentUser.favoritos);
    }
    $("#sidebar-name").textContent = currentUser.name || "Usuário";
    $("#sidebar-type").textContent = typeLabel(currentUser.accountType);
    $("#user-avatar").textContent = (currentUser.name || "U").charAt(0).toUpperCase();
    $("#welcome-name").textContent = `Olá, ${currentUser.name || "usuário"}!`;
    $("#profile-name").textContent = currentUser.name || "—";
    $("#profile-email").textContent = currentUser.email || "Não informado";
    $("#profile-type").textContent = typeLabel(currentUser.accountType);
    $("#profile-phone").textContent = currentUser.phone || "Não informado";
    $("#profile-document").textContent = currentUser.document || "Não informado";
    $("#profile-address").textContent = addressLabel(currentUser.address);
    fillForm(currentUser); statusElement.hidden = true; showSection("overview");
  } catch (error) { statusElement.hidden = false; statusElement.textContent = error.message; console.error(error); }
}
$("#profile-form").addEventListener("submit", async event => {
  event.preventDefault(); if (!currentUser) return;
  profileMessage.textContent = ""; profileMessage.classList.remove("success-message");
  saveButton.disabled = true; saveButton.textContent = "Salvando...";
  const payload = {
    name: clean(fields.name.value), email: clean(fields.email.value),
    phone: clean(fields.phone.value), document: clean(fields.document.value),
    address: {
      cep: clean(fields.cep.value), street: clean(fields.street.value),
      number: clean(fields.number.value), complement: clean(fields.complement.value),
      neighborhood: clean(fields.neighborhood.value), city: clean(fields.city.value),
      state: clean(fields.state.value)
    }
  };
  try {
    const response = await fetch("/api/auth/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Não foi possível atualizar o perfil.");
    currentUser = result.user;
    $("#sidebar-name").textContent = currentUser.name;
    $("#user-avatar").textContent = currentUser.name.charAt(0).toUpperCase();
    $("#welcome-name").textContent = `Olá, ${currentUser.name}!`;
    $("#profile-name").textContent = currentUser.name;
    $("#profile-email").textContent = currentUser.email;
    $("#profile-type").textContent = typeLabel(currentUser.accountType);
    $("#profile-phone").textContent = currentUser.phone || "Não informado";
    $("#profile-document").textContent = currentUser.document || "Não informado";
    $("#profile-address").textContent = addressLabel(currentUser.address);
    fillForm(currentUser);
    profileMessage.textContent = "Perfil atualizado com sucesso!";
    profileMessage.classList.add("success-message");
  } catch (error) { profileMessage.textContent = error.message; }
  finally { saveButton.disabled = false; saveButton.textContent = "Salvar alterações"; }
});
$("#logout-button").addEventListener("click", async () => {
  const button = $("#logout-button"); button.disabled = true;
  try {
    const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    if (!response.ok) throw new Error("Não foi possível encerrar a sessão.");
    window.location.replace("login.html");
  } catch (error) { statusElement.hidden = false; statusElement.textContent = error.message; button.disabled = false; }
});
loadAccount();
