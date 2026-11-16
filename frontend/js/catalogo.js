(function () {
  const ui = window.AgroUI;
  const params = new URLSearchParams(window.location.search);
  const termo = (params.get("q") || "").trim();
  const filtros = { categoria: new Set(), marca: new Set(), regiao: new Set() };
  const nomesGrupo = { categoria: "categorias", marca: "marcas", regiao: "regioes" };

  const grade = document.querySelector("#grade-produtos");
  const titulo = document.querySelector("#catalogo-titulo");
  const seletorOrdem = document.querySelector("#ordenar");
  const campoMinimo = document.querySelector("#preco-min");
  const campoMaximo = document.querySelector("#preco-max");
  const campoLaudo = document.querySelector("#filtro-laudo");
  const avisoPreco = document.querySelector("#preco-aviso");
  const mais = document.createElement("div");
  mais.className = "catalogo-mais";
  grade.after(mais);

  let pagina = 1;
  let acumulados = [];
  let sequencia = 0;

  function cartao(produto) {
    const selo = produto.laudo ? '<span class="mk-selo">Laudo MAPA</span>' : "";
    const detalhes = '<a class="mk-btn" href="produto.html?id=' + produto.id + '">Ver Detalhes</a>';
    const acao = produto.categoria === "Outros"
      ? detalhes
      : '<button class="mk-btn" type="button" data-comprar="' + produto.id + '">Comprar</button>' + detalhes;

    return '<article class="produto-card mk-card"><div class="produto-card-corpo">' +
      '<div class="produto-card-img"><div class="mk-thumb">' + ui.iconeProduto(produto) + "</div>" + selo + "</div>" +
      "<div><h3>" + ui.esc(produto.nome) + '</h3><span class="preco">' + ui.moeda(produto.preco) + "</span>" +
      '<span class="entrega">Entrega em ' + produto.entregaDias + " dias</span></div></div>" +
      '<div class="produto-card-acoes">' + acao + "</div></article>";
  }

  function renderFiltro(chave, idLista, facetas) {
    const lista = document.querySelector(idLista);
    const itens = facetas.slice();
    filtros[chave].forEach(function (valor) {
      if (!itens.some(function (f) { return f.nome === valor; })) {
        itens.push({ nome: valor, total: 0 });
      }
    });

    lista.innerHTML = itens.map(function (f) {
      const ativo = filtros[chave].has(f.nome) ? " ativo" : "";
      return '<li><button type="button" class="filtro-item' + ativo + '" data-chave="' + chave + '" data-valor="' + ui.esc(f.nome) + '">' +
        "<span>" + ui.esc(f.nome) + "</span><span>(" + f.total + ")</span></button></li>";
    }).join("");
  }

  function valorDoCampo(campo) {
    const bruto = campo.value.trim().replace(",", ".");
    const numero = Number(bruto);
    return bruto !== "" && Number.isFinite(numero) && numero >= 0 ? numero : null;
  }

  function faixaDePreco() {
    let minimo = valorDoCampo(campoMinimo);
    let maximo = valorDoCampo(campoMaximo);
    avisoPreco.textContent = "";
    if (minimo !== null && maximo !== null && minimo > maximo) {
      avisoPreco.textContent = "O valor mínimo era maior que o máximo, então a faixa foi invertida.";
      const troca = minimo;
      minimo = maximo;
      maximo = troca;
    }
    return { minimo: minimo, maximo: maximo };
  }

  function consulta() {
    const q = new URLSearchParams();
    if (termo) {
      q.set("q", termo);
    }
    Object.keys(filtros).forEach(function (chave) {
      if (filtros[chave].size) {
        q.set(chave, Array.from(filtros[chave]).join(","));
      }
    });
    const faixa = faixaDePreco();
    if (faixa.minimo !== null) {
      q.set("precoMin", faixa.minimo);
    }
    if (faixa.maximo !== null) {
      q.set("precoMax", faixa.maximo);
    }
    if (campoLaudo.checked) {
      q.set("laudo", "true");
    }
    q.set("ordem", seletorOrdem.value);
    q.set("pagina", pagina);
    q.set("limite", 12);
    return q.toString();
  }

  async function carregar() {
    const minha = ++sequencia;
    titulo.textContent = termo ? termo.charAt(0).toUpperCase() + termo.slice(1) : "Todos os produtos";

    try {
      const resposta = await ui.api("/api/produtos?" + consulta());
      if (minha !== sequencia) {
        return;
      }

      acumulados = pagina === 1 ? resposta.itens : acumulados.concat(resposta.itens);
      grade.innerHTML = acumulados.length
        ? acumulados.map(cartao).join("")
        : '<p class="mk-vazio mk-card">Nenhum produto encontrado para esta busca.</p>';

      mais.innerHTML = resposta.pagina < resposta.paginas
        ? '<button class="mk-btn mk-btn-verde" type="button" id="ver-mais">Ver mais produtos</button>'
        : "";

      Object.keys(nomesGrupo).forEach(function (chave) {
        renderFiltro(chave, "#filtro-" + chave, resposta.filtros[nomesGrupo[chave]]);
      });
    } catch (erro) {
      if (minha === sequencia) {
        grade.innerHTML = '<p class="mk-vazio mk-card">' + ui.esc(erro.message) + "</p>";
        mais.innerHTML = "";
      }
    }
  }

  function recarregar() {
    pagina = 1;
    carregar();
  }

  document.querySelector(".filtros").addEventListener("click", function (evento) {
    const botao = evento.target.closest(".filtro-item");
    if (!botao) {
      return;
    }
    const conjunto = filtros[botao.dataset.chave];
    if (conjunto.has(botao.dataset.valor)) {
      conjunto.delete(botao.dataset.valor);
    } else {
      conjunto.add(botao.dataset.valor);
    }
    recarregar();
  });

  document.querySelector("#limpar-filtros").addEventListener("click", function () {
    Object.keys(filtros).forEach(function (chave) { filtros[chave].clear(); });
    campoMinimo.value = "";
    campoMaximo.value = "";
    campoLaudo.checked = false;
    recarregar();
  });

  mais.addEventListener("click", function (evento) {
    if (evento.target.closest("#ver-mais")) {
      pagina += 1;
      carregar();
    }
  });

  grade.addEventListener("click", function (evento) {
    const botao = evento.target.closest("[data-comprar]");
    if (!botao) {
      return;
    }
    ui.carrinho.adicionar(botao.dataset.comprar, 1);
    window.location.href = "checkout.html";
  });

  let espera = null;
  function recarregarComAtraso() {
    clearTimeout(espera);
    espera = setTimeout(recarregar, 450);
  }

  campoMinimo.addEventListener("input", recarregarComAtraso);
  campoMaximo.addEventListener("input", recarregarComAtraso);
  campoLaudo.addEventListener("change", recarregar);
  seletorOrdem.addEventListener("change", recarregar);
  carregar();
})();
