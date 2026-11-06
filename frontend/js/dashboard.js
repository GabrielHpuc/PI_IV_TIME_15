(function () {
  const ui = window.AgroUI;
  const raiz = document.querySelector("#home");

  const rotulosCotacao = { analise: "Em análise", aguardando: "Aguardando propostas", fechada: "Fechada", recusada: "Recusada" };
  const classesCotacao = { analise: "analise", aguardando: "aguardando", fechada: "aprovada", recusada: "recusada" };
  const rotulosPedido = { aguardando_pagamento: "Aguardando pagamento", em_analise: "Em análise", pago: "Pago", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado" };

  const data = valor => new Date(valor).toLocaleDateString("pt-BR");

  function vencimento(valor) {
    const dias = Math.ceil((new Date(valor) - Date.now()) / 86400000);
    return dias > 0 ? dias + (dias === 1 ? " dia" : " dias") : "Encerrada";
  }

  function cartaoProduto(produto) {
    const selo = produto.laudo ? '<span class="mk-selo">Laudo MAPA</span>' : "";
    const detalhes = '<a class="mk-btn" href="produto.html?id=' + produto.id + '">Ver Detalhes</a>';
    const acao = produto.categoria === "Outros"
      ? detalhes
      : '<button class="mk-btn" type="button" data-comprar="' + produto.id + '">Comprar</button>' + detalhes;

    return '<article class="produto-card mk-card"><div class="produto-card-corpo">' +
      '<div class="produto-card-img"><div class="mk-thumb">' + ui.iconeProduto(produto) + "</div>" + selo + "</div>" +
      "<div><h3>" + ui.esc(produto.nome) + '</h3><span class="preco">' + ui.moeda(produto.preco) + "</span></div></div>" +
      '<div class="produto-card-acoes">' + acao + "</div></article>";
  }

  function tabelaPedidos(pedidos) {
    if (!pedidos.length) {
      return '<p class="mk-vazio mk-card">Nenhum pedido até agora.</p>';
    }
    return '<div class="tabela-wrap mk-card"><table class="tabela-cotacoes"><thead><tr><th>Pedido</th><th>Data</th><th>Status</th><th>Total</th></tr></thead><tbody>' +
      pedidos.map(function (p) {
        return "<tr><td>" + ui.esc(p.numero) + "</td><td>" + data(p.criadoEm) + "</td><td>" + ui.esc(rotulosPedido[p.status] || p.status) + "</td><td>" + ui.moeda(p.total) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function produtor(painel) {
    document.title = "Início | AgroRecursos";

    const cotacoes = painel.cotacoes.length
      ? painel.cotacoes.map(function (c) {
          return '<article class="home-cotacao mk-card"><h3>' + ui.esc(c.item) + "</h3>" +
            "<p>Fornecedores: " + c.totalPropostas + "</p>" +
            '<p>Status: <span class="status ' + classesCotacao[c.status] + '">' + ui.esc(rotulosCotacao[c.status]) + "</span></p>" +
            "<p>Vence em: " + vencimento(c.vencimento) + "</p>" +
            '<a class="home-link" href="cotacoes.html">' + (c.status === "fechada" || c.status === "recusada" ? "Ver Detalhes" : "Ver Propostas") + "</a></article>";
        }).join("")
      : '<p class="mk-vazio mk-card">Você não tem cotações. <a href="cotacoes.html">Solicitar cotação</a></p>';

    raiz.innerHTML =
      '<section class="home-banner" aria-label="Ofertas"><div><span>GRANDES OFERTAS DE SEMENTES!</span>' +
      "<strong>CONFIRA NOSSOS PARCEIROS</strong>" +
      '<a class="mk-btn" href="catalogo.html?q=sementes">Ver Ofertas</a></div>' + ui.icone("folha") + "</section>" +
      '<section class="home-secao"><h2>Suas Cotações em Aberto</h2><div class="home-cotacoes">' + cotacoes + "</div></section>" +
      '<section class="home-secao"><h2>Recomendados para Você</h2><div class="grade-produtos">' + painel.recomendados.map(cartaoProduto).join("") + "</div></section>" +
      '<section class="home-secao"><h2>Status dos seus pedidos</h2>' + tabelaPedidos(painel.pedidos) + "</section>";

    raiz.addEventListener("click", function (evento) {
      const botao = evento.target.closest("[data-comprar]");
      if (botao) {
        ui.carrinho.adicionar(botao.dataset.comprar, 1);
        window.location.href = "checkout.html";
      }
    });
  }

  let ligado = false;
  let laudoAlvo = null;

  const CATEGORIAS = ["Sementes", "Fertilizantes", "Defensivos", "Outros"];
  const REGIOES = ["Sudeste", "Sul", "Centro-Oeste", "Nordeste", "Norte"];
  const opcoes = lista => lista.map(function (v) { return '<option value="' + v + '">' + v + "</option>"; }).join("");

  function dialogosFornecedor() {
    document.body.insertAdjacentHTML("beforeend",
      '<dialog class="dialogo" id="dlg-produto"><h2>Cadastrar produto</h2><form id="form-produto" novalidate>' +
      '<label>Nome<input name="nome" maxlength="120" required></label>' +
      '<label>Categoria<select name="categoria">' + opcoes(CATEGORIAS) + "</select></label>" +
      '<label>Marca<input name="marca" maxlength="60" required></label>' +
      '<label>Região<select name="regiao">' + opcoes(REGIOES) + "</select></label>" +
      '<label>Preço (R$)<input name="preco" inputmode="decimal" placeholder="0,00" required></label>' +
      '<label>Prazo de entrega (dias)<input name="entregaDias" inputmode="numeric" placeholder="3" required></label>' +
      '<label>Estoque<input name="estoque" inputmode="numeric" placeholder="0"></label>' +
      '<label>Cultura<input name="cultura" maxlength="60" placeholder="Soja"></label>' +
      '<label>Tecnologia<input name="tecnologia" maxlength="60"></label>' +
      '<label>Embalagem<input name="embalagem" maxlength="60" placeholder="Saco: 40kg"></label>' +
      '<p class="dialogo-msg" id="msg-produto" role="status"></p>' +
      '<div class="dialogo-acoes"><button class="mk-btn" type="button" data-fechar>Cancelar</button><button class="mk-btn mk-btn-verde" type="submit">Salvar</button></div></form></dialog>' +
      '<dialog class="dialogo" id="dlg-laudo"><h2>Vincular laudo MAPA</h2><form id="form-laudo" novalidate>' +
      '<label>Número do laudo<input name="numero" maxlength="40" placeholder="MAPA-00123" required></label>' +
      '<label>Data de emissão<input name="emissao" type="date" required></label>' +
      '<label>Validade<input name="validade" type="date" required></label>' +
      '<p class="dialogo-msg" id="msg-laudo" role="status"></p>' +
      '<div class="dialogo-acoes"><button class="mk-btn" type="button" data-fechar>Cancelar</button><button class="mk-btn mk-btn-verde" type="submit">Vincular</button></div></form></dialog>');

    document.querySelectorAll("[data-fechar]").forEach(function (b) {
      b.addEventListener("click", function () { b.closest("dialog").close(); });
    });
  }


  const proximos = {
    aguardando_pagamento: ["pago", "cancelado"], em_analise: ["pago", "cancelado"],
    pago: ["enviado", "cancelado"], enviado: ["entregue"], entregue: [], cancelado: []
  };

  function seletorStatus(venda) {
    const destinos = proximos[venda.status] || [];
    if (!destinos.length) {
      return ui.esc(rotulosPedido[venda.status] || venda.status);
    }
    return '<select class="campo-status" data-pedido="' + venda.id + '" aria-label="Alterar status do pedido ' + ui.esc(venda.numero) + '"><option value="">' +
      ui.esc(rotulosPedido[venda.status]) + "</option>" +
      destinos.map(function (d) { return '<option value="' + d + '">' + ui.esc(rotulosPedido[d]) + "</option>"; }).join("") + "</select>";
  }

  function ferramentasCsv() {
    return '<section class="home-secao"><h2>Importar e exportar (CSV)</h2><div class="mk-card cad-bloco">' +
      '<p>Cadastre vários produtos de uma vez. Colunas obrigatórias: nome, categoria, marca, regiao, preco, entregaDias.</p>' +
      '<div class="home-titulo"><a class="mk-btn" href="/api/csv/modelo-produtos">Baixar modelo</a>' +
      '<label class="mk-btn mk-btn-verde" for="csv-arquivo">Importar produtos</label>' +
      '<input type="file" id="csv-arquivo" accept=".csv,text/csv" class="sr-only">' +
      '<a class="mk-btn" href="/api/csv/produtos">Exportar produtos</a>' +
      '<button class="mk-btn" type="button" id="csv-pedidos">Exportar pedidos</button></div>' +
      '<p id="msg-csv" role="status"></p></div></section>';
  }

  function atividade(itens) {
    if (!itens || !itens.length) {
      return "";
    }
    return '<section class="home-secao"><h2>Atividade recente</h2><div class="tabela-wrap mk-card"><table class="tabela-cotacoes"><thead><tr><th>Quando</th><th>Ação</th></tr></thead><tbody>' +
      itens.map(function (a) {
        return "<tr><td>" + new Date(a.criadoEm).toLocaleString("pt-BR") + "</td><td>" + ui.esc(a.acao) + "</td></tr>";
      }).join("") + "</tbody></table></div></section>";
  }

  function alertaStatus(campo, texto) {
    campo.insertAdjacentHTML("afterend", '<small role="alert"> ' + ui.esc(texto) + "</small>");
  }

  async function baixarPedidos(msg) {
    const resposta = await fetch("/api/csv/pedidos", { credentials: "same-origin" });
    if (!resposta.ok) {
      const erro = await resposta.json().catch(function () { return {}; });
      msg.textContent = erro.message || erro.erro || "Não foi possível exportar.";
      return;
    }
    const url = URL.createObjectURL(await resposta.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "pedidos.csv";
    a.click();
    URL.revokeObjectURL(url);
    msg.textContent = "Exportação concluída.";
  }

  async function importarCsv(arquivo, msg) {
    msg.textContent = "Importando...";
    const resposta = await fetch("/api/csv/produtos", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "text/csv" }, body: await arquivo.text()
    });
    const dados = await resposta.json().catch(function () { return {}; });
    if (!resposta.ok) {
      msg.textContent = dados.message || dados.erro || "Falha na importação.";
      return false;
    }
    const ignoradas = (dados.ignorados || []).map(function (i) { return "linha " + i.linha + ": " + i.motivo; }).join("; ");
    msg.textContent = (dados.importados || 0) + " produto(s) importado(s)." + (ignoradas ? " Ignoradas: " + ignoradas : "");
    return true;
  }

  async function fornecedor(painel) {
    document.title = "Painel do fornecedor | AgroRecursos";
    if (!ligado) {
      dialogosFornecedor();
    }

    const [produtos, vendas] = await Promise.all([
      ui.api("/api/produtos/meus").catch(function () { return { itens: [] }; }),
      ui.api("/api/pedidos/vendas").catch(function () { return { itens: [] }; })
    ]);

    const linhasProdutos = produtos.itens.map(function (p) {
      return "<tr><td>" + ui.esc(p.nome) + "</td><td>" + ui.esc(p.categoria) + "</td><td>" + ui.moeda(p.preco) + "</td><td>" + p.entregaDias + " dias</td>" +
        "<td>" + (p.laudo ? '<span class="mk-selo">MAPA</span>' : '<button class="mk-btn btn-comparar" type="button" data-laudo="' + p.id + '">Vincular laudo</button>') + "</td>" +
        '<td><button class="mk-btn btn-comparar" type="button" data-remover="' + p.id + '">Remover</button></td></tr>';
    }).join("");

    const linhasVendas = vendas.itens.map(function (v) {
      return "<tr><td>" + ui.esc(v.numero) + "</td><td>" + data(v.criadoEm) + "</td><td>" + ui.esc(v.cidade) + "/" + ui.esc(v.estado) + "</td><td>" +
        v.itens.map(function (i) { return ui.esc(i.nome) + " (" + i.quantidade + ")"; }).join(", ") + "</td><td>" + ui.moeda(v.total) + "</td><td>" + seletorStatus(v) + "</td></tr>";
    }).join("");

    const auditoria = await ui.api("/api/auditoria?limite=8").catch(function () { return { itens: [] }; });

    raiz.innerHTML =
      '<section class="home-secao"><h2>Painel do fornecedor</h2><div class="home-cotacoes">' +
      '<article class="home-cotacao mk-card"><h3>Produtos ativos</h3><p class="home-numero">' + painel.produtos + "</p></article>" +
      '<article class="home-cotacao mk-card"><h3>Cotações abertas</h3><p class="home-numero">' + painel.cotacoesAbertas + '</p><a class="home-link" href="cotacoes.html">Enviar propostas</a></article>' +
      '<article class="home-cotacao mk-card"><h3>Pedidos recebidos</h3><p class="home-numero">' + painel.vendas + "</p></article></div></section>" +
      '<section class="home-secao"><div class="home-titulo"><h2>Meus produtos</h2><button class="mk-btn mk-btn-verde" type="button" id="novo-produto">Cadastrar produto</button></div>' +
      (linhasProdutos
        ? '<div class="tabela-wrap mk-card"><table class="tabela-cotacoes"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Entrega</th><th>Laudo</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody>' + linhasProdutos + "</tbody></table></div>"
        : '<p class="mk-vazio mk-card">Você ainda não cadastrou produtos.</p>') + "</section>" +
      '<section class="home-secao"><h2>Últimas vendas</h2>' +
      (linhasVendas
        ? '<div class="tabela-wrap mk-card"><table class="tabela-cotacoes"><thead><tr><th>Pedido</th><th>Data</th><th>Destino</th><th>Itens</th><th>Total</th><th>Status</th></tr></thead><tbody>' + linhasVendas + "</tbody></table></div>"
        : '<p class="mk-vazio mk-card">Nenhuma venda registrada.</p>') + "</section>" +
      ferramentasCsv() + atividade(auditoria.itens);

    const dlgProduto = document.querySelector("#dlg-produto");
    const dlgLaudo = document.querySelector("#dlg-laudo");

    document.querySelector("#novo-produto").addEventListener("click", function () {
      document.querySelector("#form-produto").reset();
      document.querySelector("#msg-produto").textContent = "";
      dlgProduto.showModal();
    });

    if (ligado) {
      return;
    }
    ligado = true;

    raiz.addEventListener("change", async function (evento) {
      const msg = document.querySelector("#msg-csv");
      if (evento.target.matches("#csv-arquivo") && evento.target.files[0]) {
        const ok = await importarCsv(evento.target.files[0], msg);
        const texto = msg.textContent;
        if (ok) {
          await iniciar();
          document.querySelector("#msg-csv").textContent = texto;
        }
      }
      if (evento.target.matches("[data-pedido]") && evento.target.value) {
        try {
          await ui.api("/api/pedidos/" + evento.target.dataset.pedido + "/status", { method: "PATCH", body: { status: evento.target.value } });
          iniciar();
        } catch (erro) {
          alertaStatus(evento.target, erro.message);
        }
      }
    });

    raiz.addEventListener("click", async function (evento) {
      if (evento.target.closest("#csv-pedidos")) {
        baixarPedidos(document.querySelector("#msg-csv"));
        return;
      }
      const laudo = evento.target.closest("[data-laudo]");
      const remover = evento.target.closest("[data-remover]");

      if (laudo) {
        laudoAlvo = laudo.dataset.laudo;
        document.querySelector("#form-laudo").reset();
        document.querySelector("#msg-laudo").textContent = "";
        dlgLaudo.showModal();
      }

      if (remover) {
        if (remover.dataset.confirmar !== "sim") {
          remover.dataset.confirmar = "sim";
          remover.textContent = "Confirmar?";
          return;
        }
        try {
          await ui.api("/api/produtos/" + remover.dataset.remover, { method: "DELETE" });
          iniciar();
        } catch (erro) {
          remover.textContent = erro.message;
        }
      }
    });

    document.querySelector("#form-produto").addEventListener("submit", async function (evento) {
      evento.preventDefault();
      const d = new FormData(evento.target);
      const corpo = {};
      d.forEach(function (valor, chave) { corpo[chave] = valor; });
      corpo.preco = Number(String(corpo.preco).replace(/\./g, "").replace(",", "."));
      corpo.entregaDias = Number(corpo.entregaDias);
      corpo.estoque = corpo.estoque === "" ? 0 : Number(corpo.estoque);

      try {
        await ui.api("/api/produtos", { method: "POST", body: corpo });
        dlgProduto.close();
        iniciar();
      } catch (erro) {
        document.querySelector("#msg-produto").textContent = erro.message;
      }
    });

    document.querySelector("#form-laudo").addEventListener("submit", async function (evento) {
      evento.preventDefault();
      const d = new FormData(evento.target);
      try {
        await ui.api("/api/laudos", {
          method: "POST",
          body: { produtoId: laudoAlvo, numero: d.get("numero"), emissao: d.get("emissao"), validade: d.get("validade"), resultados: {} }
        });
        dlgLaudo.close();
        iniciar();
      } catch (erro) {
        document.querySelector("#msg-laudo").textContent = erro.message;
      }
    });
  }

  async function iniciar() {
    try {
      const painel = await ui.api("/api/painel");
      await (painel.tipo === "produtor" ? produtor : fornecedor)(painel);
    } catch (erro) {
      if (erro.status === 401) {
        window.location.replace("login.html");
        return;
      }
      raiz.innerHTML = '<p class="mk-vazio mk-card">' + ui.esc(erro.message) + "</p>";
    }
  }

  iniciar();
})();
