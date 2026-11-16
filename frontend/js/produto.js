(function () {
  const ui = window.AgroUI;
  const raiz = document.querySelector("#produto-conteudo");
  const id = new URLSearchParams(window.location.search).get("id") || "";

  function estrelas(nota) {
    let saida = "";
    for (let i = 1; i <= 5; i += 1) {
      saida += i <= Math.round(nota) ? "★" : '<span class="vazia">★</span>';
    }
    return '<span class="estrelas" aria-label="Nota ' + nota + ' de 5">' + saida + "</span>";
  }

  function mensagemErro(texto) {
    raiz.innerHTML = '<div class="mk-vazio mk-card"><h1>' + ui.esc(texto) + '</h1><a class="mk-btn" href="catalogo.html">Voltar ao catálogo</a></div>';
  }

  function montar(produto) {
    const miniaturas = [ui.nomeIconeProduto(produto), "pacote", "documento", "caminhao"];
    let atual = 0;
    const avaliacoes = produto.avaliacoes;

    const especificacoes = [
      ["Cultura", produto.cultura],
      ["Tecnologia", produto.tecnologia || "—"],
      ["Embalagem", (produto.embalagem || "—").replace(/^[^:]*:\s*/, "")],
      ["Vencimento", produto.vencimento || "—"]
    ];

    if (produto.germinacao) {
      especificacoes.splice(3, 0,
        ["Germinação", produto.germinacao + "%"],
        ["Vigor", produto.vigor + "%"],
        ["Pureza", produto.pureza + "%"]
      );
    }

    const linhasFicha = [];
    for (let i = 0; i < especificacoes.length; i += 2) {
      const a = especificacoes[i];
      const b = especificacoes[i + 1];
      linhasFicha.push("<tr><th>" + ui.esc(a[0]) + "</th><td>" + ui.esc(a[1]) + "</td>" +
        (b ? "<th>" + ui.esc(b[0]) + "</th><td>" + ui.esc(b[1]) + "</td>" : "<td></td><td></td>") + "</tr>");
    }

    const topicos = especificacoes.map(function (e) {
      return "<li>" + ui.esc(e[0]) + ": " + ui.esc(e[1]) + "</li>";
    }).join("");

    const laudo = produto.laudo
      ? '<div class="laudo-selo">' + ui.icone("documento") + '</div><h2>PRODUTO COM LAUDO DE CONFORMIDADE TÉCNICA DO MAPA</h2>' +
        '<a class="mk-btn" id="baixar-laudo" href="/api/laudos/' + encodeURIComponent(produto.laudo.numero) + '/download">Download do Laudo ' + ui.esc(produto.laudo.numero) + ".pdf</a>"
      : '<h2>Laudo MAPA não cadastrado</h2><p class="laudo-sem">O fornecedor ainda não anexou o laudo técnico deste produto.</p>';

    const media = avaliacoes.total ? String(avaliacoes.media).replace(".", ",") : "—";
    const minha = avaliacoes.minha;
    const notaFornecedor = produto.fornecedor && produto.fornecedor.totalAvaliacoes
      ? " " + estrelas(produto.fornecedor.avaliacao) + " " + String(produto.fornecedor.avaliacao).replace(".", ",") + " (" + produto.fornecedor.totalAvaliacoes + " avaliações)"
      : "";
    const fornecedor = produto.fornecedor ? '<br><strong>Vendido por:</strong> <a href="fornecedor.html?id=' + encodeURIComponent(produto.fornecedor.id) + '">' + ui.esc(produto.fornecedor.nome) + "</a>" + notaFornecedor : "";
    const opcoesNota = [[5, "Excelente"], [4, "Bom"], [3, "Regular"], [2, "Ruim"], [1, "Péssimo"]].map(function (n) {
      return '<option value="' + n[0] + '"' + (minha && minha.nota === n[0] ? " selected" : "") + ">" + n[0] + " - " + n[1] + "</option>";
    }).join("");

    document.title = produto.nome + " | AgroRecursos";

    raiz.innerHTML =
      '<div class="produto-layout">' +
      '<div class="galeria mk-card"><div class="galeria-principal" id="galeria-principal">' +
      '<button class="galeria-seta anterior" type="button" id="foto-anterior" aria-label="Foto anterior">‹</button>' +
      '<span id="foto-atual">' + ui.icone(miniaturas[0]) + "</span>" +
      '<button class="galeria-seta proxima" type="button" id="foto-proxima" aria-label="Próxima foto">›</button></div>' +
      '<div class="galeria-miniaturas" id="miniaturas">' +
      miniaturas.map(function (m, i) {
        return '<button type="button" class="miniatura' + (i === 0 ? " ativa" : "") + '" data-i="' + i + '" aria-label="Foto ' + (i + 1) + '">' + ui.icone(m) + "</button>";
      }).join("") + "</div></div>" +

      '<div class="produto-info"><small>' + ui.esc(produto.condicao) + " | " + produto.vendidos + " vendidos</small>" +
      "<h1>" + ui.esc(produto.nome) + "</h1>" +
      "<p><strong>Cultura:</strong> " + ui.esc(produto.cultura) + "<br><strong>Tecnologia:</strong> " + ui.esc(produto.tecnologia || "—") + fornecedor + "</p>" +
      "<ul>" + topicos + "</ul></div>" +

      '<aside class="caixa-compra mk-card"><h2>' + ui.esc(produto.nome) + "</h2>" +
      "<small>" + ui.esc(produto.condicao) + " | " + produto.vendidos + ' vendidos</small>' +
      '<span class="preco-grande">' + ui.moeda(produto.preco) + "</span>" +
      '<div class="frete"><strong>Cálculo de frete para entrega na fazenda</strong>' +
      '<div class="frete-linha"><input id="frete-cep" inputmode="numeric" placeholder="CEP da Fazenda" maxlength="9" aria-label="CEP da fazenda">' +
      '<button class="mk-btn mk-btn-verde" type="button" id="frete-calcular">Calcular</button></div>' +
      '<span class="frete-resultado" id="frete-resultado" role="status">Informe o CEP para estimar o frete.</span></div>' +
      '<button class="mk-btn mk-btn-verde mk-btn-grande" type="button" id="comprar-agora">Comprar agora</button>' +
      '<button class="mk-btn mk-btn-contorno-verde mk-btn-grande" type="button" id="add-carrinho">Adicionar ao carrinho</button>' +
      '<span class="frete-resultado" id="carrinho-aviso" role="status"></span></aside></div>' +

      '<div class="produto-baixo">' +
      '<section class="mk-card"><h2>Descrição Técnica</h2><p>' + ui.esc(produto.descricao || produto.nome) + "</p>" +
      '<table class="ficha"><tbody>' + linhasFicha.join("") + "</tbody></table></section>" +
      '<section class="mk-card laudo-box">' + laudo + "</section>" +
      '<section class="mk-card"><h2>Avaliações e comentários</h2>' +
      '<div class="avaliacoes-resumo"><div><strong>' + media + " " + estrelas(avaliacoes.media) + "</strong><small>Avaliação média</small></div>" +
      "<div><strong>" + produto.vendidos + "</strong><small>Vendidos</small></div>" +
      "<div><strong>" + avaliacoes.total + "</strong><small>Comentários</small></div></div>" +
      (avaliacoes.itens.length ? avaliacoes.itens.map(function (c) {
        return '<div class="comentario"><header><span>' + ui.esc(c.autor) + "</span>" + estrelas(c.nota) + "</header><p>" + ui.esc(c.comentario || "") + "</p></div>";
      }).join("") : '<p class="laudo-sem">Ainda não há avaliações para este produto.</p>') +
      '<form class="avaliar" id="form-avaliar" novalidate><h3>' + (minha ? "Sua avaliação (você pode editar)" : "Avalie este produto") + "</h3>" +
      '<label>Nota<select name="nota">' + opcoesNota + "</select></label>" +
      '<label>Comentário<textarea name="comentario" rows="2" maxlength="500" placeholder="Conte como foi sua experiência">' + ui.esc(minha ? minha.comentario : "") + "</textarea></label>" +
      '<button class="mk-btn mk-btn-verde" type="submit">' + (minha ? "Atualizar avaliação" : "Enviar avaliação") + '</button><p class="avaliar-msg" id="avaliar-msg" role="status"></p></form>' +
      "</section></div>";

    const foto = document.querySelector("#foto-atual");
    const botoes = Array.prototype.slice.call(document.querySelectorAll(".miniatura"));

    function mostrar(indice) {
      atual = (indice + miniaturas.length) % miniaturas.length;
      foto.innerHTML = ui.icone(miniaturas[atual]);
      botoes.forEach(function (b, i) { b.classList.toggle("ativa", i === atual); });
    }

    document.querySelector("#foto-anterior").addEventListener("click", function () { mostrar(atual - 1); });
    document.querySelector("#foto-proxima").addEventListener("click", function () { mostrar(atual + 1); });
    botoes.forEach(function (b) {
      b.addEventListener("click", function () { mostrar(Number(b.dataset.i)); });
    });

    const campoCep = document.querySelector("#frete-cep");
    const resultado = document.querySelector("#frete-resultado");
    ui.mascararCep(campoCep);

    document.querySelector("#frete-calcular").addEventListener("click", async function () {
      try {
        const frete = await ui.api("/api/frete?cep=" + encodeURIComponent(campoCep.value));
        resultado.textContent = "Estimativa: " + ui.moeda(frete.valor) + " (Entrega em " + produto.entregaDias + " dias)";
      } catch (erro) {
        resultado.textContent = erro.message;
      }
    });

    document.querySelector("#add-carrinho").addEventListener("click", function () {
      ui.carrinho.adicionar(produto.id, 1);
      document.querySelector("#mk-carrinho-qtd").textContent = ui.carrinho.quantidade();
      document.querySelector("#carrinho-aviso").textContent = "Produto adicionado ao carrinho.";
    });

    document.querySelector("#comprar-agora").addEventListener("click", function () {
      ui.carrinho.adicionar(produto.id, 1);
      window.location.href = "checkout.html";
    });

    document.querySelector("#form-avaliar").addEventListener("submit", async function (evento) {
      evento.preventDefault();
      const msg = document.querySelector("#avaliar-msg");
      const dados = new FormData(evento.target);
      msg.style.color = "";
      try {
        await ui.api("/api/produtos/" + produto.id + "/avaliacoes", {
          method: "POST",
          body: { nota: Number(dados.get("nota")), comentario: dados.get("comentario") }
        });
        iniciar();
      } catch (erro) {
        msg.style.color = "#b3261e";
        msg.innerHTML = erro.status === 401 ? 'Faça <a href="login.html">login</a> para avaliar.' : ui.esc(erro.message);
      }
    });
  }

  async function iniciar() {
    try {
      montar(await ui.api("/api/produtos/" + encodeURIComponent(id)));
    } catch (erro) {
      mensagemErro(erro.status === 404 ? "Produto não encontrado" : erro.message);
    }
  }

  iniciar();
})();
