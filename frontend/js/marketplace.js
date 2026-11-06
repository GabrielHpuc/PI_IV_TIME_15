(function () {
  const CHAVE_CARRINHO = "agro_carrinho";

  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function moeda(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function normalizar(texto) {
    return String(texto).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  const carrinho = {
    ler() {
      try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_CARRINHO));
        return Array.isArray(dados) ? dados.filter(function (item) {
          return item && /^[a-f0-9]{24}$/.test(String(item.id)) && Number.isInteger(item.qtd) && item.qtd > 0;
        }) : [];
      } catch (erro) {
        return [];
      }
    },
    salvar(itens) {
      try {
        localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
      } catch (erro) {
        return;
      }
    },
    adicionar(id, quantidade) {
      const itens = this.ler();
      const existente = itens.find(function (item) { return item.id === id; });
      if (existente) {
        existente.qtd += quantidade || 1;
      } else {
        itens.push({ id: id, qtd: quantidade || 1 });
      }
      this.salvar(itens);
    },
    alterar(id, qtd) {
      const itens = this.ler().map(function (item) {
        return item.id === id ? { id: id, qtd: qtd } : item;
      }).filter(function (item) { return item.qtd > 0; });
      this.salvar(itens);
    },
    remover(id) {
      this.salvar(this.ler().filter(function (item) { return item.id !== id; }));
    },
    quantidade() {
      return this.ler().reduce(function (soma, item) { return soma + item.qtd; }, 0);
    }
  };

  async function api(url, opcoes) {
    const config = Object.assign({ credentials: "same-origin", headers: {} }, opcoes);
    if (config.body && typeof config.body !== "string") {
      config.body = JSON.stringify(config.body);
      config.headers["Content-Type"] = "application/json";
    }
    let resposta;
    try {
      resposta = await fetch(url, config);
    } catch (erro) {
      const falha = new Error("Não foi possível conectar ao servidor. Abra o site por http://localhost:3000.");
      falha.status = 0;
      throw falha;
    }
    const dados = await resposta.json().catch(function () { return {}; });
    if (!resposta.ok) {
      const falha = new Error(dados.message || "Não foi possível concluir a solicitação.");
      falha.status = resposta.status;
      throw falha;
    }
    return dados;
  }

  function mascararCep(campo) {
    campo.addEventListener("input", function () {
      const d = campo.value.replace(/\D/g, "").slice(0, 8);
      campo.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
    });
  }

  const icones = {
    lista: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    coracao: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    carrinho: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2.5l2.2 11h10.6l2-8H6.2"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    busca: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    folha: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19c3-5 6-8 10-10"/>',
    fertilizante: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>',
    defensivo: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    maquina: '<circle cx="7" cy="17" r="3.5"/><circle cx="18" cy="18" r="2.5"/><path d="M3 17V9h7l2 4h6v3M10 9V5h3"/>',
    pacote: '<path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    documento: '<path d="M7 3h7l4 4v14H7V3z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    caminhao: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    cadeado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
  };

  function icone(nome) {
    return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icones[nome] || icones.pacote) + "</svg>";
  }

  function nomeIconeProduto(produto) {
    const mapa = { Sementes: "folha", Fertilizantes: "fertilizante", Defensivos: "defensivo", Outros: "maquina" };
    return mapa[produto.categoria] || "pacote";
  }

  function iconeProduto(produto) {
    return icone(nomeIconeProduto(produto));
  }

  function cabecalhoPadrao(placeholder) {
    return (
      '<a class="mk-brand" href="dashboard.html"><span class="mk-brand-logo">' + icone("folha") + '</span>' +
      '<span class="mk-brand-text"><strong>AgroRecursos</strong><small>MarketPlace</small></span></a>' +
      '<div class="mk-header-body">' +
      '<form class="mk-search" id="mk-busca" role="search">' +
      '<input id="mk-busca-input" type="search" autocomplete="off" placeholder="' + esc(placeholder) + '" aria-label="Buscar">' +
      '<button type="submit" aria-label="Pesquisar">' + icone("busca") + "</button></form>" +
      '<nav class="mk-nav" aria-label="Navegação do marketplace">' +
      '<a href="cotacoes.html">' + icone("lista") + '<span>Cotações (<b id="mk-cotacoes-qtd">0</b>)</span></a>' +
      '<a href="dashboard.html?page=favoritos">' + icone("coracao") + '<span>Favoritos</span></a>' +
      '<a href="checkout.html">' + icone("carrinho") + '<span>Carrinho (<b id="mk-carrinho-qtd">' + carrinho.quantidade() + '</b>)</span></a>' +
      '<a href="minha-conta.html">' + icone("usuario") + '<i id="mk-conta-nome">Conta</i></a></nav></div>'
    );
  }

  function cabecalhoCheckout() {
    return (
      '<a class="mk-brand" href="dashboard.html"><span class="mk-brand-logo">' + icone("folha") + '</span>' +
      '<span class="mk-brand-text"><strong>AgroRecursos</strong><small>MarketPlace</small></span></a>' +
      '<ol class="mk-steps" aria-label="Etapas da compra">' +
      '<li class="done"><span>✓</span>Carrinho</li><li class="sep">→</li>' +
      '<li class="current"><span>2</span>Entrega</li><li class="sep">→</li>' +
      '<li class="next"><span>3</span>Pagamento</li></ol>'
    );
  }

  function rodape() {
    return (
      '<nav aria-label="Rodapé"><a href="#">Sobre Nós</a><a href="#">Parceiros</a>' +
      '<a href="#">Termos de Uso</a><a href="#">Ajuda</a><a href="#">Contato</a></nav>' +
      '<p>© 2026 AgroRecursos MarketPlace</p>'
    );
  }

  async function carregarConta() {
    const alvo = document.querySelector("#mk-conta-nome");
    if (!alvo) {
      return;
    }
    try {
      const resposta = await fetch("/api/auth/me", { credentials: "same-origin" });
      const resultado = await resposta.json();
      if (resposta.ok && resultado.user && resultado.user.name) {
        const iniciais = resultado.user.name.trim().split(/\s+/).map(function (p) { return p.charAt(0).toUpperCase() + "."; }).slice(0, 2).join(" ");
        alvo.textContent = "Conta (" + iniciais + ")";
        if (resultado.user.accountType === "produtor") {
          const cotacoes = await fetch("/api/cotacoes", { credentials: "same-origin" }).then(function (r) { return r.json(); });
          const contador = document.querySelector("#mk-cotacoes-qtd");
          if (contador && Array.isArray(cotacoes.itens)) {
            contador.textContent = cotacoes.itens.filter(function (c) { return c.status === "analise" || c.status === "aguardando"; }).length;
          }
        }
      }
    } catch (erro) {
      return;
    }
  }

  function iniciar() {
    const topo = document.querySelector("#site-header");
    const base = document.querySelector("#site-footer");
    const modo = document.body.dataset.header;
    const busca = document.body.dataset.busca;

    if (topo) {
      topo.className = "mk-header" + (modo === "checkout" ? " mk-header-checkout" : "");
      topo.innerHTML = modo === "checkout"
        ? cabecalhoCheckout()
        : cabecalhoPadrao(busca === "cotacoes" ? "Buscar cotações por ID..." : "Busque sementes, fertilizantes, defensivos, ferramentas e muito mais...");
    }

    if (base) {
      base.className = "mk-footer";
      base.innerHTML = rodape();
    }

    const formulario = document.querySelector("#mk-busca");
    const campo = document.querySelector("#mk-busca-input");

    if (formulario && campo) {
      if (busca !== "cotacoes") {
        const termo = new URLSearchParams(window.location.search).get("q");
        if (termo && document.body.dataset.pagina === "catalogo") {
          campo.value = termo;
        }
      }
      formulario.addEventListener("submit", function (evento) {
        evento.preventDefault();
        if (busca === "cotacoes") {
          return;
        }
        const valor = campo.value.trim();
        window.location.href = "catalogo.html" + (valor ? "?q=" + encodeURIComponent(valor) : "");
      });
    }

    document.querySelectorAll("[data-icone]").forEach(function (alvo) {
      alvo.innerHTML = icone(alvo.dataset.icone);
    });

    carregarConta();
  }

  window.AgroUI = { icone: icone, iconeProduto: iconeProduto, nomeIconeProduto: nomeIconeProduto, esc: esc, moeda: moeda, normalizar: normalizar, carrinho: carrinho, api: api, mascararCep: mascararCep };

  document.addEventListener("DOMContentLoaded", iniciar);
})();
