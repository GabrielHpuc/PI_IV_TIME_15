// Gabriel RA: 25004669
(function () {
  const CHAVE_CARRINHO = "agro_carrinho";
  const CHAVE_FAVORITOS = "agro_favoritos";
  const CHAVE_TEMA = "agro_tema";
  const CHAVE_TEMA_CONTA = "agro_tema_ultima_conta";
  const CHAVE_ULTIMA_CONTA = "agro_ultima_conta_id";

  // Controla o modo escuro salvando a preferencia da conta no localStorage
  const tema = {
    estaEscuro() {
      try {
        return Boolean(localStorage.getItem(CHAVE_ULTIMA_CONTA)) && localStorage.getItem(CHAVE_TEMA_CONTA) === "dark";
      } catch (e) {
        return false;
      }
    },
    aplicar(escuro, userId) {
      const ativo = Boolean(escuro);
      document.documentElement.classList.toggle("dark-mode", ativo);
      try {
        if (userId) {
          localStorage.setItem(CHAVE_ULTIMA_CONTA, String(userId));
        }
        localStorage.setItem(CHAVE_TEMA_CONTA, ativo ? "dark" : "light");
        localStorage.setItem(CHAVE_TEMA, ativo ? "dark" : "light");
      } catch (e) {
        return;
      }
    }
  };

  tema.aplicar(tema.estaEscuro());

  // Funcoes utilitarias para escapar HTML, formatar valores em reais e remover acentos em buscas
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

  // Gerencia os itens do carrinho no navegador e atualiza o contador no topo da pagina
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
        const el = document.querySelector("#mk-carrinho-qtd");
        if (el) {
          const total = itens.reduce(function (s, i) { return s + i.qtd; }, 0);
          el.textContent = total > 0 ? " (" + total + ")" : "";
        }
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

  // Controla a lista de produtos favoritados e sincroniza a preferencia com o backend
  const favoritos = {
    ler() {
      try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_FAVORITOS));
        return Array.isArray(dados) ? dados.filter(function (id) {
          return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
        }) : [];
      } catch (erro) {
        return [];
      }
    },
    salvar(ids) {
      try {
        const unicos = Array.from(new Set(ids));
        localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(unicos));
        const el = document.querySelector("#mk-favoritos-qtd");
        if (el) {
          el.textContent = unicos.length > 0 ? " (" + unicos.length + ")" : "";
        }
        document.querySelectorAll("[data-favorito]").forEach(function (btn) {
          const ativo = unicos.indexOf(btn.dataset.favorito) >= 0;
          btn.classList.toggle("ativo", ativo);
          btn.setAttribute("aria-pressed", ativo ? "true" : "false");
          btn.setAttribute("title", ativo ? "Remover dos favoritos" : "Favoritar");
        });
      } catch (erro) {
        return;
      }
    },
    tem(id) {
      return this.ler().indexOf(String(id)) >= 0;
    },
    alternar(id) {
      const strId = String(id);
      const lista = this.ler();
      const idx = lista.indexOf(strId);
      let ativo;
      if (idx >= 0) {
        lista.splice(idx, 1);
        ativo = false;
      } else {
        lista.push(strId);
        ativo = true;
      }
      this.salvar(lista);
      fetch("/api/auth/preferences", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoritos: this.ler() })
      }).catch(function () {});
      return ativo;
    },
    quantidade() {
      return this.ler().length;
    },
    botaoEstrela(id) {
      const ativo = this.tem(id);
      return '<button type="button" class="btn-favorito' + (ativo ? " ativo" : "") + '" data-favorito="' + esc(id) + '" aria-pressed="' + (ativo ? "true" : "false") + '" aria-label="Favoritar produto" title="' + (ativo ? "Remover dos favoritos" : "Favoritar") + '">★</button>';
    }
  };

  // Centraliza as chamadas HTTP para a API convertendo JSON e tratando erros de conexao
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

  // Aplica a formatacao automatica de CEP conforme o usuario digita
  function mascararCep(campo) {
    campo.addEventListener("input", function () {
      const d = campo.value.replace(/\D/g, "").slice(0, 8);
      campo.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
    });
  }

  // Biblioteca de icones SVG usados nos menus e categorias de produtos
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

  // Exibe a foto real do produto quando existir ou um icone da categoria como alternativa
  function fotoProduto(produto) {
    if (!produto) return "";
    if (Array.isArray(produto.imagens) && produto.imagens.length && produto.imagens[0]) {
      return String(produto.imagens[0]);
    }
    if (typeof produto.imagem === "string" && produto.imagem) {
      return produto.imagem;
    }
    return "";
  }

  function iconeProduto(produto) {
    const foto = fotoProduto(produto);
    if (foto) {
      return '<img class="mk-thumb-img" src="' + esc(foto) + '" alt="' + esc(produto.nome || "Produto") + '" loading="lazy">';
    }
    return icone(nomeIconeProduto(produto));
  }

  // Valida o arquivo de imagem e redimensiona no canvas para no maximo 600px antes de gerar o base64
  function lerImagem(arquivo) {
    return new Promise(function (resolve, reject) {
      if (!arquivo) return resolve("");
      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(arquivo.type)) {
        return reject(new Error("Selecione uma imagem PNG, JPG, WEBP ou GIF."));
      }
      if (arquivo.size > 10 * 1024 * 1024) {
        return reject(new Error("A imagem deve ter no máximo 10 MB."));
      }
      const leitor = new FileReader();
      leitor.onerror = function () { reject(new Error("Não foi possível ler a imagem.")); };
      leitor.onload = function () {
        const img = new Image();
        img.onerror = function () { reject(new Error("Arquivo de imagem inválido.")); };
        img.onload = function () {
          const max = 600;
          let largura = img.width;
          let altura = img.height;
          if (largura > max || altura > max) {
            if (largura >= altura) {
              altura = Math.round((altura * max) / largura);
              largura = max;
            } else {
              largura = Math.round((largura * max) / altura);
              altura = max;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = largura;
          canvas.height = altura;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, largura, altura);
          const tipoSaida = arquivo.type === "image/png" ? "image/png" : "image/jpeg";
          resolve(canvas.toDataURL(tipoSaida, 0.82));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  // Monta o cabecalho principal ocultando itens de compra quando a conta for de fornecedor
  function cabecalhoPadrao(placeholder) {
    const qtdCarrinho = carrinho.quantidade();
    const qtdFav = favoritos.quantidade();
    let ehFornecedor = false;
    try {
      ehFornecedor = localStorage.getItem("agro_tipo_conta") === "fornecedor";
    } catch (e) {}
    const ocultarAttr = ehFornecedor ? " hidden" : "";
    const ocultarBusca = ehFornecedor && document.body.dataset.busca !== "cotacoes" ? " hidden" : "";

    return (
      '<a class="mk-brand" href="dashboard.html"><span class="mk-brand-logo">' + icone("folha") + '</span>' +
      '<span class="mk-brand-text"><strong>AgroRecursos</strong><small>MarketPlace</small></span></a>' +
      '<div class="mk-header-body">' +
      '<form class="mk-search" id="mk-busca" role="search"' + ocultarBusca + '>' +
      '<input id="mk-busca-input" type="search" autocomplete="off" placeholder="' + esc(placeholder) + '" aria-label="Buscar">' +
      '<button type="submit" aria-label="Pesquisar">' + icone("busca") + "</button></form>" +
      '<nav class="mk-nav" aria-label="Navegação do marketplace">' +
      '<a href="catalogo.html" data-nav-comprador' + ocultarAttr + '>' + icone("pacote") + '<span>Catálogo</span></a>' +
      '<a href="cotacoes.html" data-nav-comprador' + ocultarAttr + '>' + icone("lista") + '<span>Cotações<b id="mk-cotacoes-qtd"></b></span></a>' +
      '<a href="dashboard.html?page=favoritos" data-nav-comprador' + ocultarAttr + '>' + icone("coracao") + '<span>Favoritos<b id="mk-favoritos-qtd">' + (qtdFav > 0 ? " (" + qtdFav + ")" : "") + '</b></span></a>' +
      '<a href="checkout.html" data-nav-comprador' + ocultarAttr + '>' + icone("carrinho") + '<span>Carrinho<b id="mk-carrinho-qtd">' + (qtdCarrinho > 0 ? " (" + qtdCarrinho + ")" : "") + '</b></span></a>' +
      '<a href="minha-conta.html">' + icone("usuario") + '<i id="mk-conta-nome">Conta</i></a></nav></div>'
    );
  }

  // Monta o cabecalho simplificado do checkout com as etapas da compra
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
    return '<p>© 2026 AgroRecursos MarketPlace</p>';
  }

  // Busca o usuario logado para aplicar o tema, sincronizar favoritos e contar cotacoes abertas
  async function carregarConta() {
    const alvo = document.querySelector("#mk-conta-nome");
    if (!alvo) {
      return;
    }
    try {
      const resposta = await fetch("/api/auth/me", { credentials: "same-origin" });
      const resultado = await resposta.json();
      if (resposta.ok && resultado.user && resultado.user.name) {
        alvo.textContent = "Conta";
        const ehFornecedor = resultado.user.accountType === "fornecedor";
        try {
          localStorage.setItem("agro_tipo_conta", resultado.user.accountType || "produtor");
        } catch (e) {}
        document.querySelectorAll("[data-nav-comprador]").forEach(function (el) {
          el.hidden = ehFornecedor;
        });
        const formBusca = document.querySelector("#mk-busca");
        if (formBusca && document.body.dataset.busca !== "cotacoes") {
          formBusca.hidden = ehFornecedor;
        }
        if (typeof resultado.user.darkMode === "boolean") {
          tema.aplicar(resultado.user.darkMode, resultado.user.id);
        }
        if (Array.isArray(resultado.user.addresses) && resultado.user.addresses.length) {
          try {
            localStorage.setItem("agro_enderecos", JSON.stringify(resultado.user.addresses));
          } catch (e) {}
        }
        if (Array.isArray(resultado.user.favoritos)) {
          const locais = favoritos.ler();
          const mesclados = resultado.user.favoritos.length ? resultado.user.favoritos : locais;
          favoritos.salvar(mesclados);
          if (!resultado.user.favoritos.length && locais.length) {
            fetch("/api/auth/preferences", {
              method: "PUT",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ favoritos: locais })
            }).catch(function () {});
          }
        }
        if (resultado.user.accountType === "produtor") {
          const cotacoes = await fetch("/api/cotacoes", { credentials: "same-origin" }).then(function (r) { return r.json(); });
          const contador = document.querySelector("#mk-cotacoes-qtd");
          if (contador && Array.isArray(cotacoes.itens)) {
            const abertas = cotacoes.itens.filter(function (c) { return c.status === "analise" || c.status === "aguardando"; }).length;
            contador.textContent = abertas > 0 ? " (" + abertas + ")" : "";
          }
        }
      }
    } catch (erro) {
      return;
    }
  }

  // Renderiza o cabecalho e o rodape ao abrir a pagina e ativa a barra de pesquisa do catalogo
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

  // Expoe as funcoes compartilhadas no objeto global AgroUI para uso nas demais telas
  window.AgroUI = { icone: icone, iconeProduto: iconeProduto, nomeIconeProduto: nomeIconeProduto, fotoProduto: fotoProduto, lerImagem: lerImagem, esc: esc, moeda: moeda, normalizar: normalizar, carrinho: carrinho, favoritos: favoritos, tema: tema, api: api, mascararCep: mascararCep };

  document.addEventListener("DOMContentLoaded", iniciar);
})();
