// Pedro RA: 25004075
(function () {
  const ui = window.AgroUI;
  const raiz = document.querySelector("#forn-conteudo");
  const params = new URLSearchParams(window.location.search);
  const CATEGORIAS = ["Sementes", "Fertilizantes", "Defensivos", "Outros"];

  const so = function (v) { return String(v || "").replace(/\D/g, ""); };

  function mascaraCnpj(v) {
    const d = so(v).slice(0, 14);
    return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  }

  // Valida os digitos verificadores do CNPJ informado no formulario da empresa
  function cnpjValido(valor) {
    const d = so(valor);
    if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
    const calc = function (tam) {
      let soma = 0;
      let peso = tam - 7;
      for (let i = 0; i < tam; i += 1) {
        soma += Number(d[i]) * peso;
        peso = peso === 2 ? 9 : peso - 1;
      }
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
  }

  function estrelas(nota) {
    let s = "";
    for (let i = 1; i <= 5; i += 1) s += i <= Math.round(nota) ? "★" : '<span class="vazia">★</span>';
    return '<span class="estrelas">' + s + "</span>";
  }

  function erro(texto) {
    raiz.innerHTML = '<div class="mk-vazio mk-card"><h1>' + ui.esc(texto) + '</h1><a class="mk-btn" href="catalogo.html">Voltar ao catálogo</a></div>';
  }

  function resumo(f) {
    const nota = f.totalAvaliacoes ? estrelas(f.avaliacao) + " " + String(f.avaliacao).replace(".", ",") + " (" + f.totalAvaliacoes + " avaliações)" : "Sem avaliações";
    return '<p class="forn-resumo"><span>' + nota + "</span><span>" + f.produtos + " produtos ativos</span></p>";
  }

  // Exibe a vitrine publica de um fornecedor com sua nota media e todos os seus produtos ativos
  async function publica(id) {
    try {
      const f = await ui.api("/api/fornecedores/" + encodeURIComponent(id));
      const lista = await ui.api("/api/produtos?fornecedor=" + encodeURIComponent(id) + "&limite=48");
      const cartoes = lista.itens.filter(function (p) { return p.fornecedor && p.fornecedor.id === id; }).map(function (p) {
        const selo = p.laudo ? '<span class="mk-selo">Laudo MAPA</span>' : "";
        return '<article class="produto-card mk-card"><div class="produto-card-corpo">' +
          '<div class="produto-card-img"><div class="mk-thumb">' + ui.iconeProduto(p) + "</div>" + selo + "</div>" +
          '<div class="produto-card-info"><h3>' + ui.esc(p.nome) + "</h3><small>" + ui.esc(p.marca) + '</small><span class="preco">' + ui.moeda(p.preco) + "</span></div>" +
          ui.favoritos.botaoEstrela(p.id) + "</div>" +
          '<div class="produto-card-acoes"><button class="mk-btn" type="button" data-comprar="' + p.id + '">Comprar</button>' +
          '<a class="mk-btn" href="produto.html?id=' + p.id + '">Ver Detalhes</a></div></article>';
      }).join("");
      raiz.innerHTML = '<div class="forn-topo"><h1>' + ui.esc(f.nomeFantasia || f.nome) + "</h1></div>" + resumo(f) +
        '<div class="grade-produtos">' + (cartoes || '<p class="forn-vazio">Nenhum produto disponível.</p>') + "</div>";
      raiz.addEventListener("click", function (evento) {
        const fav = evento.target.closest("[data-favorito]");
        if (fav) {
          ui.favoritos.alternar(fav.dataset.favorito);
          return;
        }
        const botao = evento.target.closest("[data-comprar]");
        if (botao) {
          ui.carrinho.adicionar(botao.dataset.comprar, 1);
          window.location.href = "checkout.html";
        }
      });
    } catch (e) {
      erro(e.status === 404 ? "Fornecedor não encontrado." : e.message);
    }
  }

  // Carrega e permite atualizar os dados cadastrais da empresa do fornecedor logado
  async function meu() {
    let f;
    try {
      f = await ui.api("/api/fornecedores/meu");
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        window.location.href = "login.html";
        return;
      }
      erro(e.message);
      return;
    }
    const cats = CATEGORIAS.map(function (c) {
      return '<label><input type="checkbox" name="categorias" value="' + c + '"' + (f.categorias.indexOf(c) >= 0 ? " checked" : "") + "> " + c + "</label>";
    }).join("");
    raiz.innerHTML = '<div class="forn-topo"><h1>Dados da empresa</h1><a class="mk-btn" href="meus-produtos.html">Meus produtos</a></div>' + resumo(f) +
      '<form class="mk-card forn-form" id="form-empresa" novalidate>' +
      '<label>Razão social<input name="nome" maxlength="120" value="' + ui.esc(f.nome) + '" required></label>' +
      '<label>Nome fantasia<input name="nomeFantasia" maxlength="120" value="' + ui.esc(f.nomeFantasia) + '" required></label>' +
      '<label>CNPJ<input name="cnpj" inputmode="numeric" placeholder="00.000.000/0000-00" value="' + ui.esc(mascaraCnpj(f.cnpj)) + '" required></label>' +
      '<label>Telefone<input name="telefone" inputmode="tel" placeholder="(19) 99999-9999" value="' + ui.esc(f.telefone) + '"></label>' +
      '<label>Inscrição estadual<input name="inscricaoEstadual" maxlength="20" value="' + ui.esc(f.inscricaoEstadual) + '"></label>' +
      "<fieldset><legend>Categorias que você vende</legend>" + cats + "</fieldset>" +
      '<p class="forn-msg" id="empresa-msg" role="status"></p>' +
      '<button class="mk-btn mk-btn-verde" type="submit">Salvar dados</button></form>';

    const form = document.querySelector("#form-empresa");
    const msg = document.querySelector("#empresa-msg");
    form.cnpj.addEventListener("input", function () { form.cnpj.value = mascaraCnpj(form.cnpj.value); });

    form.addEventListener("submit", async function (evento) {
      evento.preventDefault();
      msg.className = "forn-msg erro";
      if (!cnpjValido(form.cnpj.value)) {
        msg.textContent = "Informe um CNPJ válido.";
        return;
      }
      const d = new FormData(form);
      try {
        const r = await ui.api("/api/fornecedores/meu", {
          method: "PUT",
          body: {
            nome: d.get("nome"), nomeFantasia: d.get("nomeFantasia"), cnpj: d.get("cnpj"),
            telefone: d.get("telefone"), inscricaoEstadual: d.get("inscricaoEstadual"), categorias: d.getAll("categorias")
          }
        });
        msg.className = "forn-msg";
        msg.textContent = r.message;
      } catch (e) {
        msg.textContent = e.message;
      }
    });
  }

  const id = params.get("id");
  if (params.get("meu")) meu();
  else if (id) publica(id);
  else erro("Fornecedor não informado.");
})();
