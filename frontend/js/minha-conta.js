// Gabriel RA: 25004669
const $ = (selector) => document.querySelector(selector);
const statusElement = $("#account-status");
const profileMessage = $("#profile-message");
const prefMessage = $("#pref-message");
const darkToggle = $("#dark-mode-toggle");
const darkLabel = $("#dark-mode-label");
const favoritesContainer = $("#favorites-list");
const purchasesContainer = $("#purchases-list");
const saveButton = $("#save-profile");

// Aplica o modo escuro ou claro na tela e guarda a escolha no localStorage
function applyTheme(dark, userId) {
  const isDark = Boolean(dark);
  document.documentElement.classList.toggle("dark-mode", isDark);
  try {
    if (userId) {
      localStorage.setItem("agro_ultima_conta_id", String(userId));
    }
    localStorage.setItem("agro_tema_ultima_conta", isDark ? "dark" : "light");
    localStorage.setItem("agro_tema", isDark ? "dark" : "light");
  } catch (e) {}
  if (darkToggle) darkToggle.checked = isDark;
  if (darkLabel) darkLabel.textContent = isDark ? "Ativado" : "Desativado";
}

try {
  const hasLastAccount = Boolean(localStorage.getItem("agro_ultima_conta_id"));
  applyTheme(hasLastAccount && localStorage.getItem("agro_tema_ultima_conta") === "dark");
  if (localStorage.getItem("agro_tipo_conta") === "fornecedor") {
    document.querySelectorAll("[data-buyer-only]").forEach(el => { el.hidden = true; });
  }
} catch (e) {}

const esc = (texto) => String(texto ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const moeda = (valor) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Le e salva a lista de IDs de produtos favoritados no armazenamento local
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

// Busca os produtos favoritados na API e monta os cards na aba de favoritos da conta
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
        '<div class="produto-card-acoes"><button class="mk-btn" type="button" data-comprar="' + esc(p.id) + '">Comprar</button><a class="mk-btn" href="produto.html?id=' + esc(p.id) + '">Ver Detalhes</a></div></article>';
    }).join("") + "</div>";
  } catch (e) {
    favoritesContainer.innerHTML = '<div class="account-card empty-state"><p>Não foi possível carregar seus favoritos.</p></div>';
  }
}

// Adiciona um produto ao carrinho salvo no navegador
function addItemToCart(produtoId, qtd = 1) {
  try {
    const atual = JSON.parse(localStorage.getItem("agro_carrinho")) || [];
    const carrinho = Array.isArray(atual) ? atual : [];
    const id = String(produtoId);
    const ex = carrinho.find(c => c.id === id);
    if (ex) ex.qtd += qtd;
    else carrinho.push({ id, qtd });
    localStorage.setItem("agro_carrinho", JSON.stringify(carrinho));
  } catch (e) {}
}

// Trata os cliques de comprar ou remover item dentro da aba de favoritos
if (favoritesContainer) {
  favoritesContainer.addEventListener("click", async (event) => {
    const comprar = event.target.closest("[data-comprar]");
    if (comprar) {
      addItemToCart(comprar.dataset.comprar, 1);
      window.location.href = "checkout.html";
      return;
    }
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

const ETAPAS_PEDIDO = [
  "Pedido criado",
  "Confirmado por vendedor",
  "Em separação",
  "Enviado",
  "Chegou ao destino"
];
let userOrders = [];

const INDICE_STATUS = {
  criado: 0,
  aguardando_pagamento: 0,
  em_analise: 0,
  confirmado: 1,
  pago: 1,
  em_separacao: 2,
  enviado: 3,
  entregue: 4
};

// Monta a barra de progresso com as etapas de entrega do pedido
function renderOrderTimeline(status) {
  if (status === "cancelado") {
    return '<div class="pedido-trilha"><span class="status recusada">Pedido cancelado</span></div>';
  }
  const indiceAtual = INDICE_STATUS[status] !== undefined ? INDICE_STATUS[status] : 0;
  return '<ol class="pedido-trilha" aria-label="Andamento do pedido">' +
    ETAPAS_PEDIDO.map((etapa, idx) => {
      const concluida = idx <= indiceAtual;
      const atual = idx === indiceAtual;
      const classe = (concluida ? "feito" : "pendente") + (atual ? " atual" : "");
      return '<li class="pedido-etapa ' + classe + '">' +
        '<span class="pedido-etapa-icone">' + (concluida ? "✓" : "○") + "</span>" +
        '<span class="pedido-etapa-nome">' + esc(etapa) + "</span></li>";
    }).join('<li class="pedido-etapa-seta" aria-hidden="true">→</li>') +
    "</ol>";
}

// Consulta o historico de compras do usuario na API e exibe os pedidos na tela
async function renderPurchasesSection() {
  if (!purchasesContainer) return;
  try {
    const res = await fetch("/api/pedidos", { credentials: "same-origin" });
    const data = await res.json();
    userOrders = Array.isArray(data.itens) ? data.itens : [];
    if (!userOrders.length) {
      purchasesContainer.innerHTML = '<div class="account-card empty-state"><h2>Meus pedidos</h2><p>Você ainda não realizou nenhum pedido.</p><a href="catalogo.html" class="button">Explorar o catálogo</a></div>';
      return;
    }
    purchasesContainer.innerHTML = '<div class="lista-pedidos">' + userOrders.map(p => {
      const dataStr = new Date(p.criadoEm).toLocaleDateString("pt-BR");
      const listaItens = Array.isArray(p.itens) && p.itens.length
        ? '<p class="pedido-itens">' + p.itens.map(i => esc(i.quantidade + "x " + i.nome)).join(" · ") + "</p>"
        : "";
      const destino = p.entrega && p.entrega.cidade
        ? '<span class="pedido-destino">Destino: ' + esc(p.entrega.cidade + "/" + p.entrega.estado) + "</span>"
        : "";
      return '<article class="pedido-card mk-card">' +
        '<div class="pedido-card-topo">' +
        '<div><strong>Pedido ' + esc(p.numero) + '</strong> <span class="pedido-data">· ' + dataStr + "</span> " + destino + "</div>" +
        '<div class="pedido-card-direita"><strong class="pedido-total">' + moeda(p.total) + '</strong>' +
        '<button type="button" class="mk-btn mk-btn-verde btn-comparar" data-repetir-pedido="' + esc(p.id) + '">Fazer pedido novamente</button></div>' +
        "</div>" +
        listaItens +
        renderOrderTimeline(p.status) +
        "</article>";
    }).join("") + "</div>";
  } catch (e) {
    purchasesContainer.innerHTML = '<div class="account-card empty-state"><p>Não foi possível carregar seus pedidos.</p></div>';
  }
}

// Permite adicionar todos os itens de um pedido antigo de volta ao carrinho para repetir a compra
if (purchasesContainer) {
  purchasesContainer.addEventListener("click", (event) => {
    const repetir = event.target.closest("[data-repetir-pedido]");
    if (!repetir) return;
    const alvo = userOrders.find(p => p.id === repetir.dataset.repetirPedido);
    if (!alvo || !Array.isArray(alvo.itens)) return;
    try {
      const atual = JSON.parse(localStorage.getItem("agro_carrinho")) || [];
      const carrinho = Array.isArray(atual) ? atual : [];
      alvo.itens.forEach(i => {
        const id = String(i.produtoId);
        const qtd = Number(i.quantidade) || 1;
        const ex = carrinho.find(c => c.id === id);
        if (ex) ex.qtd += qtd;
        else carrinho.push({ id, qtd });
      });
      localStorage.setItem("agro_carrinho", JSON.stringify(carrinho));
      window.location.href = "checkout.html";
    } catch (e) {}
  });
}

// Salva a alteracao do botao de modo escuro tanto no navegador quanto no perfil do banco
if (darkToggle) {
  darkToggle.addEventListener("change", async () => {
    const dark = darkToggle.checked;
    applyTheme(dark, currentUser ? currentUser.id : undefined);
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
const cartContainer = $("#cart-list");
const extraAddressesContainer = $("#extra-addresses-list");
const addAddressBtn = $("#add-address-btn");

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const fields = {
  name: $("#edit-name"), email: $("#edit-email"), phone: $("#edit-phone"),
  document: $("#edit-document"), addressLabel: $("#edit-address-label"),
  cep: $("#edit-cep"), street: $("#edit-street"),
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

// Funcoes para formatar a exibicao de CEP e montar o texto completo dos enderecos do usuario
function formatCepDisplay(cep) {
  const d = String(cep || "").replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
}

function addressLabel(a = {}) {
  const street = a.street || a.rua || "";
  const number = a.number || a.numero || "";
  const complement = a.complement || a.complemento || "";
  const neighborhood = a.neighborhood || a.bairro || "";
  const city = a.city || a.cidade || "";
  const state = a.state || a.estado || "";
  const cep = formatCepDisplay(a.cep);
  const first = [street, number].filter(Boolean).join(", ");
  const second = [neighborhood, city, state].filter(Boolean).join(" - ");
  return [first, complement, second, cep ? "CEP " + cep : ""].filter(Boolean).join(", ") || "Não informado";
}

function getUserAddresses(user) {
  if (!user) return [];
  if (Array.isArray(user.addresses) && user.addresses.length) {
    return user.addresses;
  }
  if (user.address && (user.address.cep || user.address.street)) {
    return [{ ...user.address, principal: true }];
  }
  return [];
}

// Exibe o endereco principal e os enderecos adicionais no resumo da conta
function renderOverviewAddresses(user) {
  const el = $("#profile-address");
  if (!el) return;
  const lista = getUserAddresses(user);
  if (!lista.length) {
    el.textContent = "Não informado";
    return;
  }
  if (lista.length === 1) {
    const prefix = lista[0].label ? lista[0].label + ": " : "";
    el.textContent = prefix + addressLabel(lista[0]);
    return;
  }
  el.innerHTML = lista.map((a, idx) => {
    const tag = a.label || (a.principal || idx === 0 ? "Principal" : "Endereço " + (idx + 1));
    return '<div class="profile-address-item"><strong>' + esc(tag) + ":</strong> " + esc(addressLabel(a)) + "</div>";
  }).join("");
}

function syncAddressesToStorage(addresses) {
  try {
    if (Array.isArray(addresses) && addresses.length) {
      localStorage.setItem("agro_enderecos", JSON.stringify(addresses));
      localStorage.setItem("agro_ultimo_endereco", JSON.stringify(addresses[0]));
    }
  } catch (e) {}
}

// Aplica mascara no campo de CEP e preenche rua, bairro, cidade e estado automaticamente
function bindCepInputs(cepInput, streetInput, numberInput, neighborhoodInput, cityInput, stateInput) {
  if (!cepInput) return;
  cepInput.addEventListener("input", () => {
    const d = cepInput.value.replace(/\D/g, "").slice(0, 8);
    cepInput.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
  });
  window.AgroCep?.aoCompletar(cepInput, endereco => {
    if (endereco.rua) streetInput.value = endereco.rua;
    if (endereco.bairro) neighborhoodInput.value = endereco.bairro;
    if (endereco.cidade) cityInput.value = endereco.cidade;
    if (endereco.estado) stateInput.value = endereco.estado;
    (endereco.rua ? numberInput : streetInput).focus();
  }, (texto, ok) => {
    if (profileMessage) {
      profileMessage.textContent = texto;
      profileMessage.classList.toggle("success-message", ok);
    }
  });
}

// Cria o bloco de formulario para cadastrar ou editar enderecos adicionais e permite trocar o principal
function createExtraAddressBlock(addr = {}, index = 2) {
  if (!extraAddressesContainer) return;
  const card = document.createElement("div");
  card.className = "extra-address-card";
  card.dataset.id = addr.id || "";
  const ufOptions = '<option value="">Selecione</option>' + UFS.map(uf =>
    '<option value="' + uf + '"' + ((addr.state || addr.estado) === uf ? " selected" : "") + ">" + uf + "</option>"
  ).join("");

  card.innerHTML =
    '<div class="extra-address-header">' +
      '<h4>Endereço adicional ' + index + '</h4>' +
      '<div class="extra-address-btns">' +
        '<button type="button" class="text-button btn-make-primary">Tornar principal</button>' +
        '<button type="button" class="text-button btn-remove-address">Remover</button>' +
      '</div>' +
    '</div>' +
    '<label>Identificação (opcional)<input data-field="label" maxlength="60" placeholder="Ex: Fazenda 2, Retiro..." value="' + esc(addr.label || "") + '"></label>' +
    '<label>CEP<input data-field="cep" inputmode="numeric" maxlength="9" placeholder="00000-000" value="' + esc(formatCepDisplay(addr.cep)) + '"></label>' +
    '<label>Rua / Logradouro<input data-field="street" maxlength="120" value="' + esc(addr.street || addr.rua || "") + '"></label>' +
    '<div class="form-grid-two">' +
      '<div><label>Número<input data-field="number" maxlength="20" value="' + esc(addr.number || addr.numero || "") + '"></label></div>' +
      '<div><label>Complemento<input data-field="complement" maxlength="80" value="' + esc(addr.complement || addr.complemento || "") + '"></label></div>' +
    '</div>' +
    '<label>Bairro<input data-field="neighborhood" maxlength="80" value="' + esc(addr.neighborhood || addr.bairro || "") + '"></label>' +
    '<div class="form-grid-two">' +
      '<div><label>Cidade<input data-field="city" maxlength="80" value="' + esc(addr.city || addr.cidade || "") + '"></label></div>' +
      '<div><label>Estado (UF)<select data-field="state">' + ufOptions + '</select></label></div>' +
    '</div>';

  const cepEl = card.querySelector('[data-field="cep"]');
  const streetEl = card.querySelector('[data-field="street"]');
  const numberEl = card.querySelector('[data-field="number"]');
  const neighborhoodEl = card.querySelector('[data-field="neighborhood"]');
  const cityEl = card.querySelector('[data-field="city"]');
  const stateEl = card.querySelector('[data-field="state"]');

  bindCepInputs(cepEl, streetEl, numberEl, neighborhoodEl, cityEl, stateEl);

  card.querySelector(".btn-remove-address").addEventListener("click", () => {
    card.remove();
  });

  card.querySelector(".btn-make-primary").addEventListener("click", () => {
    const oldPrimary = {
      label: fields.addressLabel ? fields.addressLabel.value : "",
      cep: fields.cep.value,
      street: fields.street.value,
      number: fields.number.value,
      complement: fields.complement.value,
      neighborhood: fields.neighborhood.value,
      city: fields.city.value,
      state: fields.state.value
    };
    if (fields.addressLabel) fields.addressLabel.value = card.querySelector('[data-field="label"]').value;
    fields.cep.value = cepEl.value;
    fields.street.value = streetEl.value;
    fields.number.value = numberEl.value;
    fields.complement.value = card.querySelector('[data-field="complement"]').value;
    fields.neighborhood.value = neighborhoodEl.value;
    fields.city.value = cityEl.value;
    fields.state.value = stateEl.value;

    card.querySelector('[data-field="label"]').value = oldPrimary.label;
    cepEl.value = oldPrimary.cep;
    streetEl.value = oldPrimary.street;
    numberEl.value = oldPrimary.number;
    card.querySelector('[data-field="complement"]').value = oldPrimary.complement;
    neighborhoodEl.value = oldPrimary.neighborhood;
    cityEl.value = oldPrimary.city;
    stateEl.value = oldPrimary.state;
  });

  extraAddressesContainer.appendChild(card);
}

if (addAddressBtn) {
  addAddressBtn.addEventListener("click", () => {
    const count = extraAddressesContainer ? extraAddressesContainer.children.length + 2 : 2;
    createExtraAddressBlock({}, count);
  });
}

// Preenche os campos do formulario de edicao de perfil com os dados atuais do usuario
function fillForm(user) {
  fields.name.value = user.name || ""; fields.email.value = user.email || "";
  fields.phone.value = user.phone || ""; fields.document.value = user.document || "";
  const lista = getUserAddresses(user);
  const a = lista[0] || user.address || {};
  if (fields.addressLabel) fields.addressLabel.value = a.label || "";
  fields.cep.value = formatCepDisplay(a.cep || ""); fields.street.value = a.street || a.rua || "";
  fields.number.value = a.number || a.numero || ""; fields.complement.value = a.complement || a.complemento || "";
  fields.neighborhood.value = a.neighborhood || a.bairro || ""; fields.city.value = a.city || a.cidade || "";
  fields.state.value = a.state || a.estado || ""; fields.accountType.value = typeLabel(user.accountType);

  if (extraAddressesContainer) {
    extraAddressesContainer.innerHTML = "";
    lista.slice(1).forEach((extra, idx) => createExtraAddressBlock(extra, idx + 2));
  }
}

// Carrega os produtos que estao no carrinho e calcula o subtotal dentro da area da conta
async function renderCartSection() {
  if (!cartContainer) return;
  let itensCarrinho = [];
  try {
    const raw = JSON.parse(localStorage.getItem("agro_carrinho"));
    itensCarrinho = Array.isArray(raw) ? raw.filter(i => i && i.id && i.qtd > 0) : [];
  } catch (e) {}

  if (!itensCarrinho.length) {
    cartContainer.innerHTML = '<div class="account-card empty-state"><h2>Seu carrinho</h2><p>Seu carrinho está vazio no momento.</p><a href="catalogo.html" class="button">Explorar o catálogo</a></div>';
    return;
  }

  try {
    const ids = itensCarrinho.map(i => i.id).join(",");
    const res = await fetch("/api/produtos?ids=" + encodeURIComponent(ids) + "&limite=48", { credentials: "same-origin" });
    const data = await res.json();
    const produtos = Array.isArray(data.itens) ? data.itens : [];
    const mapa = new Map(produtos.map(p => [String(p.id), p]));
    const validos = itensCarrinho.filter(i => mapa.has(String(i.id)));
    if (!validos.length) {
      cartContainer.innerHTML = '<div class="account-card empty-state"><h2>Seu carrinho</h2><p>Seu carrinho está vazio no momento.</p><a href="catalogo.html" class="button">Explorar o catálogo</a></div>';
      return;
    }
    const total = validos.reduce((s, i) => s + mapa.get(String(i.id)).preco * i.qtd, 0);
    const enderecos = getUserAddresses(currentUser);
    const blocoEnd = enderecos.length
      ? '<p class="muted"><strong>Endereço de entrega salvo:</strong> ' + esc(addressLabel(enderecos[0])) + "</p>"
      : "";
    cartContainer.innerHTML =
      '<div class="account-card">' +
        '<h2>Seu carrinho</h2>' +
        blocoEnd +
        '<div class="lista-pedidos">' +
          validos.map(i => {
            const p = mapa.get(String(i.id));
            return '<div class="pedido-card mk-card"><div class="pedido-card-topo"><div><strong>' + esc(p.nome) + '</strong> · ' + i.qtd + 'x</div><strong class="pedido-total">' + moeda(p.preco * i.qtd) + '</strong></div></div>';
          }).join("") +
        '</div>' +
        '<div class="form-actions"><strong style="align-self:center;margin-right:auto">Subtotal: ' + moeda(total) + '</strong><a href="checkout.html" class="button">Ir para o Checkout →</a></div>' +
      '</div>';
  } catch (e) {
    cartContainer.innerHTML = '<div class="account-card empty-state"><p>Não foi possível carregar seu carrinho.</p><a href="checkout.html" class="button">Abrir Checkout</a></div>';
  }
}

// Alterna entre as abas da pagina Minha Conta atualizando o menu lateral e o conteudo visivel
function showSection(name) {
  if (!sections[name]) return;
  Object.entries(sections).forEach(([key, section]) => section.hidden = key !== name);
  document.querySelectorAll(".account-nav-item[data-section]").forEach(button => button.classList.toggle("active", button.dataset.section === name));
  $("#page-title").textContent = titles[name];
  if (name === "edit-profile" && currentUser) { fillForm(currentUser); profileMessage.textContent = ""; profileMessage.classList.remove("success-message"); }
  if (name === "cart") { renderCartSection(); }
  if (name === "favorites") { renderFavoritesSection(); }
  if (name === "purchases") { renderPurchasesSection(); }
}
document.querySelectorAll("[data-section]").forEach(el => el.addEventListener("click", () => showSection(el.dataset.section)));

// Busca os dados da sessao atual na API e preenche as informacoes do usuario ou redireciona para o login
async function loadAccount() {
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (response.status === 401) { window.location.replace("login.html"); return; }
    const result = await response.json();
    if (!response.ok || !result.user) throw new Error(result.message || "Não foi possível carregar sua conta.");
    currentUser = result.user;
    const isFornecedor = currentUser.accountType === "fornecedor";
    try {
      localStorage.setItem("agro_tipo_conta", currentUser.accountType || "produtor");
    } catch (e) {}
    document.querySelectorAll("[data-buyer-only]").forEach(el => { el.hidden = isFornecedor; });
    applyTheme(Boolean(currentUser.darkMode), currentUser.id);
    if (Array.isArray(currentUser.favoritos) && currentUser.favoritos.length) {
      saveFavs(currentUser.favoritos);
    }
    syncAddressesToStorage(getUserAddresses(currentUser));
    $("#sidebar-name").textContent = currentUser.name || "Usuário";
    $("#sidebar-type").textContent = typeLabel(currentUser.accountType);
    $("#user-avatar").textContent = (currentUser.name || "U").charAt(0).toUpperCase();
    $("#welcome-name").textContent = `Olá, ${currentUser.name || "usuário"}!`;
    $("#profile-name").textContent = currentUser.name || "—";
    $("#profile-email").textContent = currentUser.email || "Não informado";
    $("#profile-type").textContent = typeLabel(currentUser.accountType);
    $("#profile-phone").textContent = currentUser.phone || "Não informado";
    $("#profile-document").textContent = currentUser.document || "Não informado";
    renderOverviewAddresses(currentUser);
    const secaoInicial = new URLSearchParams(window.location.search).get("section");
    const secaoValida = !isFornecedor && sections[secaoInicial] ? secaoInicial : "overview";
    fillForm(currentUser); statusElement.hidden = true; showSection(secaoValida);
  } catch (error) { statusElement.hidden = false; statusElement.textContent = error.message; console.error(error); }
}

// Reune o endereco principal e todos os enderecos extras preenchidos no formulario para envio
function collectAllAddressesFromForm() {
  const lista = [];
  const principal = {
    label: clean(fields.addressLabel ? fields.addressLabel.value : "") || "Endereço principal",
    cep: clean(fields.cep.value),
    street: clean(fields.street.value),
    number: clean(fields.number.value),
    complement: clean(fields.complement.value),
    neighborhood: clean(fields.neighborhood.value),
    city: clean(fields.city.value),
    state: clean(fields.state.value),
    principal: true
  };
  if (principal.cep || principal.street || principal.number || principal.neighborhood || principal.city || principal.state) {
    lista.push(principal);
  }
  if (extraAddressesContainer) {
    extraAddressesContainer.querySelectorAll(".extra-address-card").forEach((card, idx) => {
      const item = {
        id: card.dataset.id || "",
        label: clean(card.querySelector('[data-field="label"]')?.value) || `Endereço ${idx + 2}`,
        cep: clean(card.querySelector('[data-field="cep"]')?.value),
        street: clean(card.querySelector('[data-field="street"]')?.value),
        number: clean(card.querySelector('[data-field="number"]')?.value),
        complement: clean(card.querySelector('[data-field="complement"]')?.value),
        neighborhood: clean(card.querySelector('[data-field="neighborhood"]')?.value),
        city: clean(card.querySelector('[data-field="city"]')?.value),
        state: clean(card.querySelector('[data-field="state"]')?.value),
        principal: lista.length === 0
      };
      if (item.cep || item.street || item.number || item.neighborhood || item.city || item.state) {
        lista.push(item);
      }
    });
  }
  return lista;
}

// Envia as alteracoes cadastrais e de enderecos para a API e atualiza a tela
$("#profile-form").addEventListener("submit", async event => {
  event.preventDefault(); if (!currentUser) return;
  profileMessage.textContent = ""; profileMessage.classList.remove("success-message");
  saveButton.disabled = true; saveButton.textContent = "Salvando...";
  const addresses = collectAllAddressesFromForm();
  const primaryAddress = addresses[0] || {
    cep: clean(fields.cep.value), street: clean(fields.street.value),
    number: clean(fields.number.value), complement: clean(fields.complement.value),
    neighborhood: clean(fields.neighborhood.value), city: clean(fields.city.value),
    state: clean(fields.state.value)
  };
  const payload = {
    name: clean(fields.name.value), email: clean(fields.email.value),
    phone: clean(fields.phone.value), document: clean(fields.document.value),
    address: primaryAddress,
    addresses
  };
  try {
    const response = await fetch("/api/auth/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Não foi possível atualizar o perfil.");
    currentUser = result.user;
    syncAddressesToStorage(getUserAddresses(currentUser));
    $("#sidebar-name").textContent = currentUser.name;
    $("#user-avatar").textContent = currentUser.name.charAt(0).toUpperCase();
    $("#welcome-name").textContent = `Olá, ${currentUser.name}!`;
    $("#profile-name").textContent = currentUser.name;
    $("#profile-email").textContent = currentUser.email;
    $("#profile-type").textContent = typeLabel(currentUser.accountType);
    $("#profile-phone").textContent = currentUser.phone || "Não informado";
    $("#profile-document").textContent = currentUser.document || "Não informado";
    renderOverviewAddresses(currentUser);
    fillForm(currentUser);
    profileMessage.textContent = "Perfil atualizado com sucesso!";
    profileMessage.classList.add("success-message");
  } catch (error) { profileMessage.textContent = error.message; }
  finally { saveButton.disabled = false; saveButton.textContent = "Salvar alterações"; }
});

// Encerra a sessao do usuario no servidor e volta para a tela de login
$("#logout-button").addEventListener("click", async () => {
  const button = $("#logout-button"); button.disabled = true;
  try {
    const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    if (!response.ok) throw new Error("Não foi possível encerrar a sessão.");
    if (window.AgroUI && window.AgroUI.limparDadosLocais) window.AgroUI.limparDadosLocais();
    window.location.replace("login.html");
  } catch (error) { statusElement.hidden = false; statusElement.textContent = error.message; button.disabled = false; }
});
loadAccount();


// CEP: máscara e preenchimento automático de rua, bairro, cidade e UF no endereço principal
bindCepInputs(fields.cep, fields.street, fields.number, fields.neighborhood, fields.city, fields.state);
