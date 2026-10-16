const homeSection = document.querySelector("#dashboard-home");
const placeholderSection = document.querySelector("#dashboard-placeholder");
const logoutButton = document.querySelector("#logout-button");
const sidebar = document.querySelector("#sidebar");
const overlay = document.querySelector("#sidebar-overlay");

const pages = {
  catalogo: {
    title: "Catálogo de produtos",
    description: "Encontre insumos agropecuários e consulte as informações disponíveis.",
    icon: "▦",
    message: "O catálogo ainda será conectado à coleção de produtos do MongoDB."
  },
  favoritos: {
    title: "Favoritos",
    description: "Acesse os produtos que você deseja acompanhar.",
    icon: "♡",
    message: "A lista de favoritos será implementada e salva por usuário."
  },
  carrinho: {
    title: "Carrinho",
    description: "Revise os produtos que deseja comprar.",
    icon: "🛒",
    message: "O carrinho e a finalização de pedidos ainda não estão conectados."
  },
  pedidos: {
    title: "Histórico de compras",
    description: "Acompanhe seus pedidos anteriores.",
    icon: "▤",
    message: "Seus pedidos aparecerão aqui depois da implementação do fluxo de compra."
  },
  produto: {
    title: "Cadastrar produto",
    description: "Disponibilize um insumo para os produtores rurais.",
    icon: "＋",
    message: "O formulário de cadastro e o salvamento de produtos serão implementados nesta etapa."
  },
  produtos: {
    title: "Meus produtos",
    description: "Gerencie os produtos que você oferece.",
    icon: "▣",
    message: "Os produtos cadastrados pelo fornecedor serão listados aqui quando o CRUD estiver pronto."
  },
  vendas: {
    title: "Pedidos e vendas",
    description: "Acompanhe os pedidos recebidos dos compradores.",
    icon: "↗",
    message: "A gestão de pedidos e o status das vendas serão conectados ao banco futuramente."
  },
  "historico-vendas": {
    title: "Histórico de vendas",
    description: "Consulte as vendas realizadas na plataforma.",
    icon: "◷",
    message: "O histórico será alimentado pelos pedidos reais da plataforma."
  },
  configuracoes: {
    title: "Configurações",
    description: "Preferências e segurança da sua conta.",
    icon: "⚙",
    message: "As opções de configuração serão adicionadas em breve. Você já pode consultar seu perfil."
  }
};

async function loadDashboard() {
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    const result = await response.json();

    if (!response.ok || !result.user) {
      window.location.replace("/login.html");
      return;
    }

    const user = result.user;
    const isSupplier = user.accountType === "fornecedor";
    const displayName = user.name || "Usuário";
    const initial = displayName.trim().charAt(0).toUpperCase() || "A";

    document.querySelector("#user-name").textContent = displayName;
    document.querySelector("#user-type").textContent = isSupplier ? "Fornecedor" : "Produtor rural";
    document.querySelector("#user-avatar").textContent = initial;
    document.querySelector("#topbar-avatar").textContent = initial;
    document.querySelector("#topbar-name").textContent = displayName;

    document.querySelectorAll(".buyer-link").forEach((el) => {
      el.hidden = isSupplier;
    });
    document.querySelector("#supplier-nav").hidden = !isSupplier;
    document.querySelectorAll(".supplier-only").forEach((el) => {
      el.hidden = !isSupplier;
    });

    if (isSupplier) {
      document.querySelector("#welcome-title").textContent = `Olá, ${displayName.split(" ")[0]}!`;
      document.querySelector("#welcome-description").textContent =
        "Gerencie seus produtos e acompanhe os pedidos recebidos em um só lugar.";
      document.querySelector("#summary-label-one").textContent = "Produtos ativos";
      document.querySelector("#summary-label-two").textContent = "Pedidos recebidos";
      document.querySelector("#summary-label-three").textContent = "Vendas";
    } else {
      document.querySelector("#welcome-title").textContent = `Bem-vindo(a), ${displayName.split(" ")[0]}!`;
    }

    renderCurrentPage();
  } catch (error) {
    console.error("Erro ao carregar painel:", error);
    window.location.replace("/login.html");
  }
}

function renderCurrentPage() {
  const params = new URLSearchParams(window.location.search);
  const pageKey = params.get("page") || "inicio";
  const page = pages[pageKey];

  document.querySelectorAll(".side-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === pageKey || (!params.has("page") && link.dataset.page === "inicio"));
  });

  if (!page) {
    homeSection.hidden = false;
    placeholderSection.hidden = true;
    document.querySelector("#breadcrumb-current").textContent = "Início";
    return;
  }

  homeSection.hidden = true;
  placeholderSection.hidden = false;
  document.querySelector("#placeholder-title").textContent = page.title;
  document.querySelector("#placeholder-description").textContent = page.description;
  document.querySelector("#placeholder-icon").textContent = page.icon;
  document.querySelector("#placeholder-message").textContent = page.message;
  document.querySelector("#breadcrumb-current").textContent = page.title;
}

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("Não foi possível sair da conta.");
    window.location.replace("/login.html");
  } catch (error) {
    alert(error.message);
    logoutButton.disabled = false;
  }
});

document.querySelector("#mobile-menu-button").addEventListener("click", () => {
  sidebar.classList.toggle("sidebar-open");
  overlay.classList.toggle("overlay-visible");
});

overlay.addEventListener("click", () => {
  sidebar.classList.remove("sidebar-open");
  overlay.classList.remove("overlay-visible");
});

document.querySelectorAll(".side-link").forEach((link) => {
  link.addEventListener("click", () => {
    sidebar.classList.remove("sidebar-open");
    overlay.classList.remove("overlay-visible");
  });
});

loadDashboard();
