(function () {
  const ui = window.AgroUI;

  const rotulos = { analise: "Em Análise", aguardando: "Aguar. Fornec.", fechada: "Aprovada", recusada: "Recusada" };
  const classes = { analise: "analise", aguardando: "aguardando", fechada: "aprovada", recusada: "recusada" };

  const corpo = document.querySelector("#corpo-cotacoes");
  const vazio = document.querySelector("#cotacoes-vazio");
  const dialogo = document.querySelector("#comparativo");
  const tabela = document.querySelector("#comparativo-tabela");
  const acoes = document.querySelector("#comparativo-acoes");
  const nota = document.querySelector("#comparativo-nota");
  const campoBusca = document.querySelector("#mk-busca-input");
  const botaoNova = document.querySelector("#nova-cotacao");
  const dialogoNova = document.querySelector("#dialogo-nova");
  const dialogoProposta = document.querySelector("#dialogo-proposta");

  let tipo = "produtor";
  let aberta = null;
  let escolhida = 0;
  let propostaAlvo = null;
  let temporizador = null;

  const data = valor => new Date(valor).toLocaleDateString("pt-BR");

  function estrelas(valor) {
    let saida = "";
    for (let i = 1; i <= 5; i += 1) {
      saida += valor >= i - 0.5 ? "★" : '<span class="vazia">★</span>';
    }
    return '<span class="estrelas" aria-label="Nota ' + valor + ' de 5">' + saida + "</span>";
  }

  function indiceMelhor(cotacao) {
    let melhor = 0;
    cotacao.propostas.forEach(function (p, i) {
      if (p.preco < cotacao.propostas[melhor].preco) {
        melhor = i;
      }
    });
    return melhor;
  }

  function mostrarVazio(html) {
    vazio.innerHTML = html;
    vazio.hidden = false;
  }

  async function carregar() {
    const busca = campoBusca ? campoBusca.value.trim() : "";
    try {
      const resposta = await ui.api("/api/cotacoes" + (busca ? "?busca=" + encodeURIComponent(busca) : ""));
      corpo.innerHTML = resposta.itens.map(function (c) {
        const botao = tipo === "fornecedor"
          ? '<button class="mk-btn" type="button" data-proposta="' + c.id + '">Enviar proposta</button>'
          : '<button class="mk-btn btn-comparar" type="button" data-id="' + c.id + '" aria-label="Comparar propostas de ' + ui.esc(c.codigo) + '">Comparar</button>';
        return "<tr><td>" + ui.esc(c.codigo) + "</td><td>" + ui.esc(c.item) + "</td><td>" + ui.esc(c.quantidade) + "</td>" +
          "<td>" + data(c.criadoEm) + "</td><td>" + data(c.vencimento) + "</td>" +
          '<td><span class="status ' + classes[c.status] + '">' + rotulos[c.status] + "</span></td>" +
          "<td>" + c.totalPropostas + "</td><td>" + botao + "</td></tr>";
      }).join("");

      if (resposta.itens.length) {
        vazio.hidden = true;
      } else {
        mostrarVazio("Nenhuma cotação encontrada.");
      }
    } catch (erro) {
      corpo.innerHTML = "";
      mostrarVazio(erro.status === 401 ? 'Faça <a href="login.html">login</a> para ver suas cotações.' : ui.esc(erro.message));
    }
  }

  function renderComparativo() {
    const c = aberta;
    const encerrada = c.status === "fechada" || c.status === "recusada";

    if (!c.propostas.length) {
      tabela.innerHTML = "<tr><td>Nenhum fornecedor enviou proposta ainda.</td></tr>";
      acoes.hidden = true;
      nota.textContent = "Volte mais tarde para comparar as propostas.";
      return;
    }

    const melhor = indiceMelhor(c);
    const aprovada = c.propostas.findIndex(function (p) { return p.id === c.propostaAprovadaId; });
    const marcada = c.status === "fechada" ? aprovada : escolhida;

    function celula(conteudo, i) {
      const classe = "col-sel" + (i === melhor ? " melhor" : "") + (i === marcada ? " escolhida" : "");
      return '<td class="' + classe + '" data-i="' + i + '">' + conteudo + "</td>";
    }

    let cabecalho = "<tr><th>" + ui.esc(c.item) + "</th>";
    let preco = "<tr><td>Preço Total (R$)</td>";
    let laudo = "<tr><td>Laudo MAPA</td>";
    let prazo = "<tr><td>Prazo de Entrega</td>";
    let avaliacao = "<tr><td>Avaliação Fornec.</td>";

    c.propostas.forEach(function (p, i) {
      const classe = "col-sel" + (i === melhor ? " melhor" : "") + (i === marcada ? " escolhida" : "");
      cabecalho += '<th class="' + classe + '" data-i="' + i + '">' + ui.esc(p.fornecedor) + "</th>";
      preco += celula("<strong>" + ui.moeda(p.preco) + "</strong>", i);
      laudo += celula(p.laudo ? '<span class="mk-selo">MAPA</span>' : "—", i);
      prazo += celula(p.prazo + " dias", i);
      avaliacao += celula(estrelas(p.avaliacao), i);
    });

    tabela.innerHTML = cabecalho + "</tr>" + preco + "</tr>" + laudo + "</tr>" + prazo + "</tr>" + avaliacao + "</tr>";
    acoes.hidden = encerrada;
    nota.textContent = encerrada
      ? "Esta cotação já foi " + (c.status === "fechada" ? "aprovada." : "recusada.")
      : "Clique em uma coluna para escolher o fornecedor. A coluna verde é o menor preço.";
  }

  corpo.addEventListener("click", async function (evento) {
    const comparar = evento.target.closest("[data-id]");
    const proposta = evento.target.closest("[data-proposta]");

    if (proposta) {
      propostaAlvo = proposta.dataset.proposta;
      document.querySelector("#form-proposta").reset();
      document.querySelector("#proposta-msg").textContent = "";
      dialogoProposta.showModal();
      return;
    }

    if (!comparar) {
      return;
    }

    try {
      aberta = await ui.api("/api/cotacoes/" + comparar.dataset.id);
      escolhida = aberta.propostas.length ? indiceMelhor(aberta) : 0;
      document.querySelector("#comparativo-titulo").textContent = "Cotação " + aberta.codigo;
      renderComparativo();
      dialogo.showModal();
    } catch (erro) {
      mostrarVazio(ui.esc(erro.message));
    }
  });

  tabela.addEventListener("click", function (evento) {
    const alvo = evento.target.closest("[data-i]");
    if (!alvo || aberta.status === "fechada" || aberta.status === "recusada") {
      return;
    }
    escolhida = Number(alvo.dataset.i);
    renderComparativo();
  });

  async function decidir(caminho, corpoRequisicao) {
    try {
      await ui.api("/api/cotacoes/" + aberta.id + "/" + caminho, { method: "POST", body: corpoRequisicao });
      dialogo.close();
      carregar();
    } catch (erro) {
      nota.textContent = erro.message;
    }
  }

  document.querySelector("#aprovar").addEventListener("click", function () {
    decidir("aprovar", { propostaId: aberta.propostas[escolhida].id });
  });

  document.querySelector("#recusar").addEventListener("click", function () {
    decidir("recusar", {});
  });

  document.querySelector("#comparativo-fechar").addEventListener("click", function () { dialogo.close(); });

  document.querySelectorAll("[data-fechar]").forEach(function (botao) {
    botao.addEventListener("click", function () { botao.closest("dialog").close(); });
  });

  botaoNova.addEventListener("click", function () {
    document.querySelector("#form-nova").reset();
    document.querySelector("#nova-msg").textContent = "";
    dialogoNova.showModal();
  });

  document.querySelector("#form-nova").addEventListener("submit", async function (evento) {
    evento.preventDefault();
    const dados = new FormData(evento.target);
    const msg = document.querySelector("#nova-msg");
    try {
      await ui.api("/api/cotacoes", {
        method: "POST",
        body: { item: dados.get("item"), quantidade: dados.get("quantidade"), diasValidade: Number(dados.get("diasValidade")) }
      });
      dialogoNova.close();
      carregar();
    } catch (erro) {
      msg.textContent = erro.message;
    }
  });

  document.querySelector("#form-proposta").addEventListener("submit", async function (evento) {
    evento.preventDefault();
    const dados = new FormData(evento.target);
    const msg = document.querySelector("#proposta-msg");
    msg.className = "dialogo-msg";
    try {
      await ui.api("/api/cotacoes/" + propostaAlvo + "/propostas", {
        method: "POST",
        body: {
          preco: Number(String(dados.get("preco")).replace(/\./g, "").replace(",", ".")),
          prazo: Number(dados.get("prazo")),
          laudo: dados.get("laudo") === "on"
        }
      });
      dialogoProposta.close();
      carregar();
    } catch (erro) {
      msg.textContent = erro.message;
    }
  });

  if (campoBusca) {
    campoBusca.addEventListener("input", function () {
      clearTimeout(temporizador);
      temporizador = setTimeout(carregar, 250);
    });
  }

  async function iniciar() {
    try {
      const conta = await ui.api("/api/auth/me");
      tipo = conta.user.accountType;
      botaoNova.hidden = tipo !== "produtor";
    } catch (erro) {
      tipo = "produtor";
    }
    carregar();
  }

  iniciar();
})();
