// Gabriel RA: 25004669
(function () {
  const ui = window.AgroUI;
  const raiz = document.querySelector("#home");

  // Dicionarios com os textos e etapas de status das cotacoes e dos pedidos
  const rotulosCotacao = { analise: "Em análise", aguardando: "Aguardando propostas", fechada: "Fechada", recusada: "Recusada" };
  const classesCotacao = { analise: "analise", aguardando: "aguardando", fechada: "aprovada", recusada: "recusada" };
  const rotulosPedido = {
    criado: "Pedido criado",
    aguardando_pagamento: "Pedido criado",
    em_analise: "Pedido criado",
    confirmado: "Confirmado por vendedor",
    pago: "Confirmado por vendedor",
    em_separacao: "Em separação",
    enviado: "Enviado",
    entregue: "Chegou ao destino",
    cancelado: "Cancelado"
  };
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

  const data = valor => new Date(valor).toLocaleDateString("pt-BR");

  function vencimento(valor) {
    const dias = Math.ceil((new Date(valor) - Date.now()) / 86400000);
    return dias > 0 ? dias + (dias === 1 ? " dia" : " dias") : "Encerrada";
  }

  // Monta o card visual de cada produto com foto, selo do MAPA, botao de compra e favorito
  function cartaoProduto(produto) {
    const selo = produto.laudo ? '<span class="mk-selo">Laudo MAPA</span>' : "";
    const detalhes = '<a class="mk-btn" href="produto.html?id=' + produto.id + '">Ver Detalhes</a>';
    const acao = '<button class="mk-btn" type="button" data-comprar="' + produto.id + '">Comprar</button>' + detalhes;

    return '<article class="produto-card mk-card"><div class="produto-card-corpo">' +
      '<div class="produto-card-img"><div class="mk-thumb">' + ui.iconeProduto(produto) + "</div>" + selo + "</div>" +
      '<div class="produto-card-info"><h3>' + ui.esc(produto.nome) + '</h3><span class="preco">' + ui.moeda(produto.preco) + "</span></div>" +
      ui.favoritos.botaoEstrela(produto.id) + "</div>" +
      '<div class="produto-card-acoes">' + acao + "</div></article>";
  }

  const ETAPAS_PEDIDO = [
    "Pedido criado",
    "Confirmado por vendedor",
    "Em separação",
    "Enviado",
    "Chegou ao destino"
  ];

  let pedidosCache = [];

  // Desenha a linha do tempo horizontal mostrando em qual etapa da entrega o pedido esta
  function trilhaStatusPedido(status) {
    if (status === "cancelado") {
      return '<div class="pedido-trilha"><span class="status recusada">Pedido cancelado</span></div>';
    }
    const indiceAtual = INDICE_STATUS[status] !== undefined ? INDICE_STATUS[status] : 0;
    return '<ol class="pedido-trilha" aria-label="Andamento do pedido">' +
      ETAPAS_PEDIDO.map(function (etapa, idx) {
        const concluida = idx <= indiceAtual;
        const atual = idx === indiceAtual;
        const classe = (concluida ? "feito" : "pendente") + (atual ? " atual" : "");
        return '<li class="pedido-etapa ' + classe + '">' +
          '<span class="pedido-etapa-icone">' + (concluida ? "✓" : "○") + "</span>" +
          '<span class="pedido-etapa-nome">' + ui.esc(etapa) + "</span>" +
          "</li>";
      }).join('<li class="pedido-etapa-seta" aria-hidden="true">→</li>') +
      "</ol>";
  }

  // Monta o resumo do pedido com itens, cidade de destino, valor total e opcao de repetir compra
  function cartaoPedido(p) {
    const listaItens = Array.isArray(p.itens) && p.itens.length
      ? '<p class="pedido-itens">' + p.itens.map(function (i) {
          return ui.esc(i.quantidade + "x " + i.nome);
        }).join(" · ") + "</p>"
      : "";
    const destino = p.entrega && p.entrega.cidade
      ? '<span class="pedido-destino">Destino: ' + ui.esc(p.entrega.cidade + "/" + p.entrega.estado) + "</span>"
      : "";

    return '<article class="pedido-card mk-card">' +
      '<div class="pedido-card-topo">' +
      '<div><strong>Pedido ' + ui.esc(p.numero) + '</strong> <span class="pedido-data">· ' + data(p.criadoEm) + "</span> " + destino + "</div>" +
      '<div class="pedido-card-direita"><strong class="pedido-total">' + ui.moeda(p.total) + '</strong>' +
      '<button type="button" class="mk-btn mk-btn-verde btn-comparar" data-repetir-pedido="' + ui.esc(p.id) + '">Fazer pedido novamente</button></div>' +
      "</div>" +
      listaItens +
      trilhaStatusPedido(p.status) +
      "</article>";
  }

  function tabelaPedidos(pedidos) {
    pedidosCache = Array.isArray(pedidos) ? pedidos : [];
    if (!pedidosCache.length) {
      return '<p class="mk-vazio mk-card">Nenhum pedido até agora.</p>';
    }
    return '<div class="lista-pedidos">' + pedidosCache.map(cartaoPedido).join("") + "</div>";
  }

  let escutaProdutor = false;
  // Captura os cliques nos botoes de favoritar, repetir pedido e comprar dentro do painel do produtor
  function vincularCliquesCards() {
    if (escutaProdutor) return;
    escutaProdutor = true;
    raiz.addEventListener("click", function (evento) {
      const fav = evento.target.closest("[data-favorito]");
      if (fav) {
        ui.favoritos.alternar(fav.dataset.favorito);
        if (new URLSearchParams(window.location.search).get("page") === "favoritos") {
          paginaFavoritos();
        }
        return;
      }
      const repetir = evento.target.closest("[data-repetir-pedido]");
      if (repetir) {
        const alvo = pedidosCache.find(function (p) { return p.id === repetir.dataset.repetirPedido; });
        if (alvo && Array.isArray(alvo.itens) && alvo.itens.length) {
          alvo.itens.forEach(function (i) {
            if (i.produtoId) ui.carrinho.adicionar(String(i.produtoId), Number(i.quantidade) || 1);
          });
          window.location.href = "checkout.html";
        }
        return;
      }
      const botao = evento.target.closest("[data-comprar]");
      if (botao) {
        ui.carrinho.adicionar(botao.dataset.comprar, 1);
        window.location.href = "checkout.html";
      }
    });
  }

  // Carrega e exibe a lista completa de pedidos realizados pelo produtor
  async function paginaPedidos() {
    document.title = "Meus Pedidos | AgroRecursos";
    vincularCliquesCards();
    try {
      const r = await ui.api("/api/pedidos");
      const itens = r.itens || [];
      raiz.innerHTML =
        '<section class="home-secao"><div class="home-titulo"><h2>Meus Pedidos</h2><a class="mk-btn" href="dashboard.html">← Voltar ao início</a></div>' +
        tabelaPedidos(itens) +
        "</section>";
    } catch (erro) {
      raiz.innerHTML = '<p class="mk-vazio mk-card">' + ui.esc(erro.message) + "</p>";
    }
  }

  // Busca na API os produtos salvos nos favoritos e monta a grade na tela
  async function paginaFavoritos() {
    document.title = "Meus Favoritos | AgroRecursos";
    vincularCliquesCards();
    const ids = ui.favoritos.ler();
    if (!ids.length) {
      raiz.innerHTML =
        '<section class="home-secao"><div class="home-titulo"><h2>Meus Favoritos</h2><a class="mk-btn" href="dashboard.html">← Voltar ao início</a></div>' +
        '<p class="mk-vazio mk-card">Você ainda não favoritou nenhum produto. <a href="catalogo.html">Explorar o catálogo</a></p></section>';
      return;
    }
    try {
      const r = await ui.api("/api/produtos?ids=" + encodeURIComponent(ids.join(",")) + "&limite=48");
      const itens = r.itens || [];
      raiz.innerHTML =
        '<section class="home-secao"><div class="home-titulo"><h2>Meus Favoritos</h2><a class="mk-btn" href="dashboard.html">← Voltar ao início</a></div>' +
        (itens.length
          ? '<div class="grade-produtos">' + itens.map(cartaoProduto).join("") + "</div>"
          : '<p class="mk-vazio mk-card">Você ainda não favoritou nenhum produto. <a href="catalogo.html">Explorar o catálogo</a></p>') +
        "</section>";
    } catch (erro) {
      raiz.innerHTML = '<p class="mk-vazio mk-card">' + ui.esc(erro.message) + "</p>";
    }
  }

  // Renderiza a tela inicial do produtor com banner, cotacoes abertas, recomendados e ultimos pedidos
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
      '<section class="home-secao"><div class="home-titulo"><h2>Suas Cotações em Aberto</h2><a class="mk-btn mk-btn-verde" href="cotacoes.html">Nova cotação</a></div><div class="home-cotacoes">' + cotacoes + "</div></section>" +
      '<section class="home-secao"><h2>Recomendados para Você</h2><div class="grade-produtos">' + painel.recomendados.map(cartaoProduto).join("") + "</div></section>" +
      '<section class="home-secao" id="meus-pedidos"><div class="home-titulo"><h2>Meus Pedidos</h2><a class="mk-btn" href="dashboard.html?page=pedidos">Ver todos os pedidos</a></div>' + tabelaPedidos(painel.pedidos) + "</section>";

    vincularCliquesCards();
  }

  let ligado = false;
  let laudoAlvo = null;

  const CATEGORIAS = ["Sementes", "Fertilizantes", "Defensivos", "Outros"];
  const REGIOES = ["Sudeste", "Sul", "Centro-Oeste", "Nordeste", "Norte"];
  const opcoes = lista => lista.map(function (v) { return '<option value="' + v + '">' + v + "</option>"; }).join("");

  // Injeta na pagina os modais de cadastro de produto, vinculo de laudo PDF e importacao de fotos do CSV
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
      '<label>Foto(s) do produto<input type="file" name="foto" id="foto-produto" multiple accept="image/png,image/jpeg,image/webp,image/gif"></label>' +
      '<div class="previa-foto" id="previa-foto" hidden><img id="previa-foto-img" alt="Prévia da foto do produto"><button class="mk-btn" type="button" id="remover-foto">Remover foto</button></div>' +
      '<label>Descrição<textarea name="descricao" rows="3" maxlength="1000"></textarea></label>' +
      '<p class="dialogo-msg" id="msg-produto" role="status"></p>' +
      '<div class="dialogo-acoes"><button class="mk-btn" type="button" data-fechar>Cancelar</button><button class="mk-btn mk-btn-verde" type="submit">Salvar</button></div></form></dialog>' +
      '<dialog class="dialogo" id="dlg-laudo"><h2>Vincular laudo MAPA</h2><form id="form-laudo" novalidate>' +
      '<label>Número do laudo<input name="numero" maxlength="40" placeholder="MAPA-00123" required></label>' +
      '<label>Data de emissão<input name="emissao" type="date" required></label>' +
      '<label>Validade<input name="validade" type="date" required></label>' +
      '<label>Arquivo do laudo (PDF)<input name="arquivoPdf" id="laudo-pdf" type="file" accept=".pdf,application/pdf" required></label>' +
      '<p class="dialogo-msg" id="msg-laudo" role="status"></p>' +
      '<div class="dialogo-acoes"><button class="mk-btn" type="button" data-fechar>Cancelar</button><button class="mk-btn mk-btn-verde" type="submit">Vincular</button></div></form></dialog>' +
      '<dialog class="dialogo dialogo-largo" id="dlg-csv-fotos"><h2>Fotos dos produtos importados</h2>' +
      '<p class="muted" style="margin:0 0 10px;font-size:.88rem">Todo produto precisa ter foto. Caso o CSV já tenha a coluna <strong>imagem</strong> (URL ou base64), ela já aparece abaixo. Você também pode selecionar várias fotos de uma vez ou escolher individualmente para cada produto.</p>' +
      '<label class="csv-lote-label">Selecionar várias fotos de uma vez (associa por nome do arquivo ou na ordem da lista)<input type="file" id="csv-fotos-lote" multiple accept="image/png,image/jpeg,image/webp,image/gif"></label>' +
      '<div id="csv-lista-produtos" class="csv-lista-produtos"></div>' +
      '<p class="dialogo-msg" id="msg-dlg-csv" role="status"></p>' +
      '<div class="dialogo-acoes"><button class="mk-btn" type="button" data-fechar>Cancelar</button><button class="mk-btn mk-btn-verde" type="button" id="confirmar-csv">Confirmar importação</button></div></dialog>');

    document.querySelectorAll("[data-fechar]").forEach(function (b) {
      b.addEventListener("click", function () { b.closest("dialog").close(); });
    });
  }


  // Define para quais status o fornecedor pode avancar cada venda recebida
  const proximos = {
    criado: ["confirmado", "em_separacao", "enviado", "entregue", "cancelado"],
    aguardando_pagamento: ["confirmado", "em_separacao", "enviado", "entregue", "cancelado"],
    em_analise: ["confirmado", "em_separacao", "enviado", "entregue", "cancelado"],
    confirmado: ["em_separacao", "enviado", "entregue", "cancelado"],
    pago: ["em_separacao", "enviado", "entregue", "cancelado"],
    em_separacao: ["enviado", "entregue", "cancelado"],
    enviado: ["entregue"],
    entregue: [],
    cancelado: []
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
      '<p>Cadastre vários produtos de uma vez com foto. Colunas obrigatórias: nome, categoria, marca, regiao, preco, entregaDias (e coluna <strong>imagem</strong> ou seleção das fotos na importação).</p>' +
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

  // Faz o download do relatorio de pedidos do fornecedor em formato CSV
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

  // Le o texto do arquivo CSV no navegador identificando o separador e separando colunas e linhas
  function parseCsvCliente(texto) {
    const t = String(texto || "").replace(/^\uFEFF/, "");
    const primeira = t.split(/\r?\n/, 1)[0] || "";
    const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ";" : ",";
    const linhas = [];
    let campo = "";
    let linha = [];
    let aspas = false;
    for (let i = 0; i < t.length; i += 1) {
      const c = t[i];
      if (aspas) {
        if (c === '"') {
          if (t[i + 1] === '"') { campo += '"'; i += 1; }
          else { aspas = false; }
        } else { campo += c; }
      } else if (c === '"') {
        aspas = true;
      } else if (c === sep) {
        linha.push(campo); campo = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && t[i + 1] === "\n") i += 1;
        linha.push(campo); campo = ""; linhas.push(linha); linha = [];
      } else {
        campo += c;
      }
    }
    if (campo !== "" || linha.length) {
      linha.push(campo);
      linhas.push(linha);
    }
    const uteis = linhas.filter(function (l) { return l.some(function (x) { return x.trim() !== ""; }); });
    if (uteis.length < 2) return [];
    const cab = uteis[0].map(function (h) { return h.trim(); });
    return uteis.slice(1).map(function (l, i) {
      const valores = {};
      cab.forEach(function (h, k) { valores[h] = (l[k] || "").trim(); });
      return { linha: i + 2, valores: valores };
    });
  }

  let estadoImportacaoCsv = null;

  function ehImagemValidaCsv(str) {
    const s = String(str || "").trim();
    return /^(data:image\/|https?:\/\/|\/|[a-z0-9_\-./]+\.(png|jpe?g|webp|gif|svg)$)/i.test(s) && (/^(data:image\/|https?:\/\/|\/)/i.test(s));
  }

  function renderListaImportacaoCsv() {
    const container = document.querySelector("#csv-lista-produtos");
    if (!container || !estadoImportacaoCsv) return;
    container.innerHTML = estadoImportacaoCsv.registros.map(function (reg, idx) {
      const v = reg.valores;
      const foto = estadoImportacaoCsv.fotos[reg.linha] || "";
      const refOriginal = v.imagem || v.foto || "";
      const thumbHtml = foto
        ? '<img class="mk-thumb-img" src="' + ui.esc(foto) + '" alt="' + ui.esc(v.nome || "Produto") + '">'
        : '<span class="csv-sem-foto">Sem foto</span>';
      return '<div class="csv-item-produto" data-linha="' + reg.linha + '">' +
        '<div class="mk-thumb csv-item-thumb">' + thumbHtml + '</div>' +
        '<div class="csv-item-info"><strong>' + ui.esc(v.nome || ("Linha " + reg.linha)) + '</strong>' +
        '<small>' + ui.esc([v.categoria, v.marca, v.preco ? "R$ " + v.preco : ""].filter(Boolean).join(" · ")) +
        (refOriginal && !foto ? " (Arquivo: " + ui.esc(refOriginal) + ")" : "") + '</small></div>' +
        '<label class="mk-btn btn-comparar">Escolher foto<input type="file" class="sr-only" data-foto-linha="' + reg.linha + '" accept="image/png,image/jpeg,image/webp,image/gif"></label>' +
      '</div>';
    }).join("");
  }

  // Prepara os produtos lidos do CSV e abre o modal para associar as fotos antes de enviar ao servidor
  async function prepararImportacaoCsv(arquivo, msg) {
    const texto = await arquivo.text();
    const registros = parseCsvCliente(texto);
    if (!registros.length) {
      msg.textContent = "O arquivo CSV não possui linhas válidas para importar.";
      return;
    }
    const fotos = {};
    registros.forEach(function (reg) {
      const bruto = reg.valores.imagem || reg.valores.foto || reg.valores.imagem_url || reg.valores.url_imagem || "";
      if (ehImagemValidaCsv(bruto)) {
        fotos[reg.linha] = bruto.trim();
      }
    });

    estadoImportacaoCsv = { texto: texto, registros: registros, fotos: fotos, msgFora: msg };
    const dlgCsv = document.querySelector("#dlg-csv-fotos");
    const msgDlg = document.querySelector("#msg-dlg-csv");
    const inputLote = document.querySelector("#csv-fotos-lote");
    if (msgDlg) msgDlg.textContent = "";
    if (inputLote) inputLote.value = "";
    renderListaImportacaoCsv();
    dlgCsv.showModal();
  }

  // Valida se todos os itens do CSV possuem foto e envia o lote para cadastro na API
  async function enviarImportacaoCsvConfirmada() {
    if (!estadoImportacaoCsv) return;
    const msgDlg = document.querySelector("#msg-dlg-csv");
    const faltandoFoto = estadoImportacaoCsv.registros.filter(function (r) {
      return !estadoImportacaoCsv.fotos[r.linha];
    });
    if (faltandoFoto.length) {
      msgDlg.textContent = "Selecione uma foto para todos os produtos antes de importar (" + faltandoFoto.length + " produto(s) sem foto).";
      return;
    }

    msgDlg.textContent = "Importando produtos...";
    const mapaImagens = {};
    Object.keys(estadoImportacaoCsv.fotos).forEach(function (k) {
      mapaImagens[String(k)] = estadoImportacaoCsv.fotos[k];
    });

    const resposta = await fetch("/api/csv/produtos", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: estadoImportacaoCsv.texto, imagens: mapaImagens })
    });
    const dados = await resposta.json().catch(function () { return {}; });
    if (!resposta.ok) {
      msgDlg.textContent = dados.message || dados.erro || "Falha na importação.";
      return;
    }
    const ignoradas = (dados.ignorados || []).map(function (i) { return "linha " + i.linha + ": " + i.motivo; }).join("; ");
    const resumoTexto = (dados.importados || 0) + " produto(s) importado(s) com foto." + (ignoradas ? " Ignoradas: " + ignoradas : "");
    document.querySelector("#dlg-csv-fotos").close();
    estadoImportacaoCsv = null;
    await iniciar();
    const msgCsv = document.querySelector("#msg-csv");
    if (msgCsv) msgCsv.textContent = resumoTexto;
  }

  // Renderiza o painel do fornecedor com indicadores, tabela de produtos, vendas, CSV e auditoria
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
      return '<tr><td><div class="forn-prod-celula"><div class="mk-thumb forn-thumb">' + ui.iconeProduto(p) + "</div><span>" + ui.esc(p.nome) + "</span></div></td><td>" + ui.esc(p.categoria) + "</td><td>" + ui.moeda(p.preco) + "</td><td>" + p.entregaDias + " dias</td>" +
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
      const previa = document.querySelector("#previa-foto");
      if (previa) previa.hidden = true;
      dlgProduto.showModal();
    });

    if (ligado) {
      return;
    }
    ligado = true;

    let fotosSelecionadas = [];
    const campoFoto = document.querySelector("#foto-produto");
    const previaWrap = document.querySelector("#previa-foto");
    const previaImg = document.querySelector("#previa-foto-img");
    const btnRemoverFoto = document.querySelector("#remover-foto");

    // Converte as fotos selecionadas no cadastro de produto para base64 e mostra a previa
    if (campoFoto) {
      campoFoto.addEventListener("change", async function () {
        const arquivos = campoFoto.files ? Array.from(campoFoto.files).slice(0, 6) : [];
        if (!arquivos.length) return;
        try {
          document.querySelector("#msg-produto").textContent = "";
          fotosSelecionadas = await Promise.all(arquivos.map(function (a) { return ui.lerImagem(a); }));
          previaImg.src = fotosSelecionadas[0];
          previaWrap.hidden = false;
        } catch (erro) {
          campoFoto.value = "";
          fotosSelecionadas = [];
          previaWrap.hidden = true;
          document.querySelector("#msg-produto").textContent = erro.message;
        }
      });
    }

    if (btnRemoverFoto) {
      btnRemoverFoto.addEventListener("click", function () {
        if (campoFoto) campoFoto.value = "";
        fotosSelecionadas = [];
        previaImg.removeAttribute("src");
        previaWrap.hidden = true;
      });
    }

    const dlgCsv = document.querySelector("#dlg-csv-fotos");
    const inputFotosLote = document.querySelector("#csv-fotos-lote");
    const btnConfirmarCsv = document.querySelector("#confirmar-csv");

    // Associa varias fotos de uma vez aos produtos do CSV pelo nome do arquivo ou pela ordem da lista
    if (inputFotosLote) {
      inputFotosLote.addEventListener("change", async function () {
        if (!estadoImportacaoCsv || !inputFotosLote.files || !inputFotosLote.files.length) return;
        const msgDlg = document.querySelector("#msg-dlg-csv");
        if (msgDlg) msgDlg.textContent = "Processando fotos...";
        const arquivos = Array.from(inputFotosLote.files);
        const lidas = [];
        for (let i = 0; i < arquivos.length; i += 1) {
          try {
            const dataUrl = await ui.lerImagem(arquivos[i]);
            lidas.push({ nome: (arquivos[i].name || "").toLowerCase(), semExt: (arquivos[i].name || "").replace(/\.[^.]+$/, "").toLowerCase(), dataUrl: dataUrl });
          } catch (e) {}
        }
        const usadas = new Set();
        estadoImportacaoCsv.registros.forEach(function (reg) {
          const ref = String(reg.valores.imagem || reg.valores.foto || "").trim().toLowerCase();
          const nomeProd = String(reg.valores.nome || "").trim().toLowerCase();
          const match = lidas.find(function (img, idx) {
            if (usadas.has(idx)) return false;
            return (ref && (img.nome === ref || img.semExt === ref)) || (nomeProd && img.semExt === nomeProd);
          });
          if (match) {
            usadas.add(lidas.indexOf(match));
            estadoImportacaoCsv.fotos[reg.linha] = match.dataUrl;
          }
        });
        let cursor = 0;
        estadoImportacaoCsv.registros.forEach(function (reg) {
          if (estadoImportacaoCsv.fotos[reg.linha]) return;
          while (cursor < lidas.length && usadas.has(cursor)) cursor += 1;
          if (cursor < lidas.length) {
            usadas.add(cursor);
            estadoImportacaoCsv.fotos[reg.linha] = lidas[cursor].dataUrl;
            cursor += 1;
          }
        });
        if (msgDlg) msgDlg.textContent = "";
        renderListaImportacaoCsv();
      });
    }

    if (dlgCsv) {
      dlgCsv.addEventListener("change", async function (evento) {
        const inputLinha = evento.target.closest("[data-foto-linha]");
        if (!inputLinha || !estadoImportacaoCsv) return;
        const arq = inputLinha.files && inputLinha.files[0];
        if (!arq) return;
        const msgDlg = document.querySelector("#msg-dlg-csv");
        try {
          if (msgDlg) msgDlg.textContent = "";
          const dataUrl = await ui.lerImagem(arq);
          estadoImportacaoCsv.fotos[Number(inputLinha.dataset.fotoLinha)] = dataUrl;
          renderListaImportacaoCsv();
        } catch (erro) {
          if (msgDlg) msgDlg.textContent = erro.message;
        }
      });
    }

    if (btnConfirmarCsv) {
      btnConfirmarCsv.addEventListener("click", enviarImportacaoCsvConfirmada);
    }

    raiz.addEventListener("change", async function (evento) {
      const msg = document.querySelector("#msg-csv");
      if (evento.target.matches("#csv-arquivo") && evento.target.files[0]) {
        const arq = evento.target.files[0];
        evento.target.value = "";
        await prepararImportacaoCsv(arq, msg);
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

    // Trata o envio do formulario de novo produto formatando preco, estoque e imagens
    document.querySelector("#form-produto").addEventListener("submit", async function (evento) {
      evento.preventDefault();
      const d = new FormData(evento.target);
      const corpo = {};
      d.forEach(function (valor, chave) {
        if (chave !== "foto") corpo[chave] = valor;
      });
      corpo.preco = Number(String(corpo.preco).replace(/\./g, "").replace(",", "."));
      corpo.entregaDias = Number(corpo.entregaDias);
      corpo.estoque = corpo.estoque === "" ? 0 : Number(corpo.estoque);
      if (fotosSelecionadas.length) {
        corpo.imagens = fotosSelecionadas;
        corpo.imagem = fotosSelecionadas[0];
      }

      try {
        await ui.api("/api/produtos", { method: "POST", body: corpo });
        fotosSelecionadas = [];
        dlgProduto.close();
        iniciar();
      } catch (erro) {
        document.querySelector("#msg-produto").textContent = erro.message;
      }
    });

    // Valida o tipo e tamanho do arquivo PDF do laudo e converte para base64 antes de salvar
    function lerPdfBase64(arquivo) {
      return new Promise(function (resolve, reject) {
        if (!arquivo) return reject(new Error("Anexe o arquivo PDF do laudo MAPA."));
        const ehPdf = arquivo.type === "application/pdf" || /\.pdf$/i.test(arquivo.name || "");
        if (!ehPdf) return reject(new Error("Selecione um arquivo no formato PDF."));
        if (arquivo.size > 3.5 * 1024 * 1024) return reject(new Error("O arquivo PDF deve ter no máximo 3,5 MB."));
        const leitor = new FileReader();
        leitor.onerror = function () { reject(new Error("Não foi possível ler o arquivo PDF.")); };
        leitor.onload = function () {
          const res = String(leitor.result || "");
          resolve(res.replace(/^data:[^;]+;base64,/i, "data:application/pdf;base64,"));
        };
        leitor.readAsDataURL(arquivo);
      });
    }

    document.querySelector("#form-laudo").addEventListener("submit", async function (evento) {
      evento.preventDefault();
      const d = new FormData(evento.target);
      const campoPdf = document.querySelector("#laudo-pdf");
      const arquivo = campoPdf && campoPdf.files ? campoPdf.files[0] : null;
      try {
        const arquivoPdf = await lerPdfBase64(arquivo);
        await ui.api("/api/laudos", {
          method: "POST",
          body: { produtoId: laudoAlvo, numero: d.get("numero"), emissao: d.get("emissao"), validade: d.get("validade"), arquivoPdf: arquivoPdf, resultados: {} }
        });
        dlgLaudo.close();
        iniciar();
      } catch (erro) {
        document.querySelector("#msg-laudo").textContent = erro.message;
      }
    });
  }

  // Consulta os dados do painel na API e direciona para a visao de produtor ou de fornecedor
  async function iniciar() {
    try {
      const painel = await ui.api("/api/painel");
      const pagina = new URLSearchParams(window.location.search).get("page");
      if (pagina === "favoritos") {
        await paginaFavoritos();
        return;
      }
      if (pagina === "pedidos" && painel.tipo === "produtor") {
        await paginaPedidos();
        return;
      }
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
