(function () {
  const ui = window.AgroUI;
  const CATEGORIAS = ["Sementes", "Fertilizantes", "Defensivos", "Outros"];
  const REGIOES = ["Sudeste", "Sul", "Centro-Oeste", "Nordeste", "Norte"];
  const linhas = document.querySelector("#linhas");
  const aviso = document.querySelector("#lista-msg");
  const dialogo = document.querySelector("#dlg-produto");
  const form = document.querySelector("#form-produto");
  const msg = document.querySelector("#msg-produto");
  const campoFoto = document.querySelector("#foto-produto");
  const previaWrap = document.querySelector("#previa-foto");
  const previaImg = document.querySelector("#previa-foto-img");
  const btnRemoverFoto = document.querySelector("#remover-foto");
  let produtos = [];
  let editandoId = null;
  let imagemAtual = undefined;

  const opcoes = function (lista) {
    return lista.map(function (v) { return '<option value="' + v + '">' + v + "</option>"; }).join("");
  };
  form.categoria.innerHTML = opcoes(CATEGORIAS);
  form.regiao.innerHTML = opcoes(REGIOES);

  function atualizarPrevia(src) {
    if (src) {
      previaImg.src = src;
      previaWrap.hidden = false;
    } else {
      previaImg.removeAttribute("src");
      previaWrap.hidden = true;
    }
  }

  campoFoto.addEventListener("change", async function () {
    const arquivo = campoFoto.files && campoFoto.files[0];
    if (!arquivo) return;
    try {
      msg.textContent = "";
      imagemAtual = await ui.lerImagem(arquivo);
      atualizarPrevia(imagemAtual);
    } catch (erro) {
      campoFoto.value = "";
      msg.textContent = erro.message;
    }
  });

  btnRemoverFoto.addEventListener("click", function () {
    campoFoto.value = "";
    imagemAtual = "";
    atualizarPrevia("");
  });

  function desenhar() {
    if (!produtos.length) {
      linhas.innerHTML = '<tr><td colspan="6" class="forn-vazio">Você ainda não cadastrou produtos.</td></tr>';
      return;
    }
    linhas.innerHTML = produtos.map(function (p) {
      return '<tr><td><div class="forn-prod-celula"><div class="mk-thumb forn-thumb">' + ui.iconeProduto(p) + '</div><div><strong>' + ui.esc(p.nome) + "</strong><br><small>" + ui.esc(p.marca) + "</small></div></div></td>" +
        "<td>" + ui.esc(p.categoria) + "</td><td>" + ui.moeda(p.preco) + "</td><td>" + ui.esc(p.estoque) + "</td>" +
        "<td>" + (p.laudo ? "Sim" : "Não") + "</td>" +
        '<td class="forn-acoes"><button class="mk-btn" type="button" data-editar="' + p.id + '">Editar</button>' +
        '<button class="mk-btn" type="button" data-remover="' + p.id + '">Remover</button></td></tr>';
    }).join("");
  }

  async function carregar() {
    try {
      const r = await ui.api("/api/produtos/meus");
      produtos = r.itens;
      aviso.textContent = "";
      desenhar();
    } catch (erro) {
      if (erro.status === 401 || erro.status === 403) {
        window.location.href = "login.html";
        return;
      }
      aviso.textContent = erro.message;
    }
  }

  function abrir(produto) {
    editandoId = produto ? produto.id : null;
    imagemAtual = undefined;
    form.reset();
    msg.textContent = "";
    document.querySelector("#dlg-titulo").textContent = produto ? "Editar produto" : "Cadastrar produto";
    if (produto) {
      ["nome", "categoria", "marca", "regiao", "entregaDias", "estoque", "cultura", "tecnologia", "embalagem", "descricao"].forEach(function (c) {
        if (form[c]) form[c].value = produto[c] === undefined || produto[c] === null ? "" : produto[c];
      });
      form.preco.value = String(produto.preco).replace(".", ",");
      atualizarPrevia(ui.fotoProduto(produto));
    } else {
      atualizarPrevia("");
    }
    dialogo.showModal();
  }

  document.querySelector("#novo-produto").addEventListener("click", function () { abrir(null); });
  document.querySelector("#cancelar").addEventListener("click", function () { dialogo.close(); });

  linhas.addEventListener("click", async function (evento) {
    const editar = evento.target.closest("[data-editar]");
    const remover = evento.target.closest("[data-remover]");
    if (editar) {
      abrir(produtos.find(function (p) { return p.id === editar.dataset.editar; }));
    }
    if (remover) {
      if (remover.dataset.confirmar !== "sim") {
        remover.dataset.confirmar = "sim";
        remover.textContent = "Confirmar?";
        return;
      }
      try {
        await ui.api("/api/produtos/" + remover.dataset.remover, { method: "DELETE" });
        await carregar();
      } catch (erro) {
        remover.dataset.confirmar = "";
        remover.textContent = "Remover";
        aviso.textContent = erro.message;
      }
    }
  });

  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    const corpo = {};
    new FormData(form).forEach(function (valor, chave) {
      if (chave !== "foto") corpo[chave] = valor;
    });
    corpo.preco = Number(String(corpo.preco).replace(/\./g, "").replace(",", "."));
    corpo.entregaDias = Number(corpo.entregaDias);
    corpo.estoque = corpo.estoque === "" ? 0 : Number(corpo.estoque);
    if (imagemAtual !== undefined) {
      corpo.imagem = imagemAtual;
    }
    try {
      await ui.api(editandoId ? "/api/produtos/" + editandoId : "/api/produtos", { method: editandoId ? "PUT" : "POST", body: corpo });
      dialogo.close();
      aviso.textContent = editandoId ? "Produto atualizado." : "Produto cadastrado.";
      await carregar();
    } catch (erro) {
      msg.textContent = erro.message;
    }
  });

  const inputCsv = document.querySelector("#csv-arquivo");
  const dlgCsv = document.querySelector("#dlg-csv-fotos");
  const inputFotosLote = document.querySelector("#csv-fotos-lote");
  const btnConfirmarCsv = document.querySelector("#confirmar-csv");
  const btnCancelarCsv = document.querySelector("#cancelar-csv");
  const msgDlgCsv = document.querySelector("#msg-dlg-csv");
  const listaCsvContainer = document.querySelector("#csv-lista-produtos");
  let estadoCsv = null;

  function parseCsv(texto) {
    const t = String(texto || "").replace(/^\uFEFF/, "");
    const primeira = t.split(/\r?\n/, 1)[0] || "";
    const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ";" : ",";
    const linhasCsv = [];
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
        linha.push(campo); campo = ""; linhasCsv.push(linha); linha = [];
      } else {
        campo += c;
      }
    }
    if (campo !== "" || linha.length) {
      linha.push(campo);
      linhasCsv.push(linha);
    }
    const uteis = linhasCsv.filter(function (l) { return l.some(function (x) { return x.trim() !== ""; }); });
    if (uteis.length < 2) return [];
    const cab = uteis[0].map(function (h) { return h.trim(); });
    return uteis.slice(1).map(function (l, i) {
      const valores = {};
      cab.forEach(function (h, k) { valores[h] = (l[k] || "").trim(); });
      return { linha: i + 2, valores: valores };
    });
  }

  function renderListaCsv() {
    if (!listaCsvContainer || !estadoCsv) return;
    listaCsvContainer.innerHTML = estadoCsv.registros.map(function (reg) {
      const v = reg.valores;
      const foto = estadoCsv.fotos[reg.linha] || "";
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

  if (btnCancelarCsv && dlgCsv) {
    btnCancelarCsv.addEventListener("click", function () { dlgCsv.close(); });
  }

  if (inputCsv) {
    inputCsv.addEventListener("change", async function () {
      const arq = inputCsv.files && inputCsv.files[0];
      if (!arq) return;
      inputCsv.value = "";
      const texto = await arq.text();
      const registros = parseCsv(texto);
      if (!registros.length) {
        aviso.textContent = "O arquivo CSV não possui linhas válidas para importar.";
        return;
      }
      const fotos = {};
      registros.forEach(function (reg) {
        const bruto = String(reg.valores.imagem || reg.valores.foto || reg.valores.imagem_url || reg.valores.url_imagem || "").trim();
        if (/^(data:image\/|https?:\/\/|\/)/i.test(bruto)) {
          fotos[reg.linha] = bruto;
        }
      });
      estadoCsv = { texto: texto, registros: registros, fotos: fotos };
      if (msgDlgCsv) msgDlgCsv.textContent = "";
      if (inputFotosLote) inputFotosLote.value = "";
      renderListaCsv();
      dlgCsv.showModal();
    });
  }

  if (inputFotosLote) {
    inputFotosLote.addEventListener("change", async function () {
      if (!estadoCsv || !inputFotosLote.files || !inputFotosLote.files.length) return;
      if (msgDlgCsv) msgDlgCsv.textContent = "Processando fotos...";
      const arquivos = Array.from(inputFotosLote.files);
      const lidas = [];
      for (let i = 0; i < arquivos.length; i += 1) {
        try {
          const dataUrl = await ui.lerImagem(arquivos[i]);
          lidas.push({ nome: (arquivos[i].name || "").toLowerCase(), semExt: (arquivos[i].name || "").replace(/\.[^.]+$/, "").toLowerCase(), dataUrl: dataUrl });
        } catch (e) {}
      }
      const usadas = new Set();
      estadoCsv.registros.forEach(function (reg) {
        const ref = String(reg.valores.imagem || reg.valores.foto || "").trim().toLowerCase();
        const nomeProd = String(reg.valores.nome || "").trim().toLowerCase();
        const match = lidas.find(function (img, idx) {
          if (usadas.has(idx)) return false;
          return (ref && (img.nome === ref || img.semExt === ref)) || (nomeProd && img.semExt === nomeProd);
        });
        if (match) {
          usadas.add(lidas.indexOf(match));
          estadoCsv.fotos[reg.linha] = match.dataUrl;
        }
      });
      let cursor = 0;
      estadoCsv.registros.forEach(function (reg) {
        if (estadoCsv.fotos[reg.linha]) return;
        while (cursor < lidas.length && usadas.has(cursor)) cursor += 1;
        if (cursor < lidas.length) {
          usadas.add(cursor);
          estadoCsv.fotos[reg.linha] = lidas[cursor].dataUrl;
          cursor += 1;
        }
      });
      if (msgDlgCsv) msgDlgCsv.textContent = "";
      renderListaCsv();
    });
  }

  if (dlgCsv) {
    dlgCsv.addEventListener("change", async function (evento) {
      const inputLinha = evento.target.closest("[data-foto-linha]");
      if (!inputLinha || !estadoCsv) return;
      const arq = inputLinha.files && inputLinha.files[0];
      if (!arq) return;
      try {
        if (msgDlgCsv) msgDlgCsv.textContent = "";
        const dataUrl = await ui.lerImagem(arq);
        estadoCsv.fotos[Number(inputLinha.dataset.fotoLinha)] = dataUrl;
        renderListaCsv();
      } catch (erro) {
        if (msgDlgCsv) msgDlgCsv.textContent = erro.message;
      }
    });
  }

  if (btnConfirmarCsv) {
    btnConfirmarCsv.addEventListener("click", async function () {
      if (!estadoCsv) return;
      const faltando = estadoCsv.registros.filter(function (r) { return !estadoCsv.fotos[r.linha]; });
      if (faltando.length) {
        if (msgDlgCsv) msgDlgCsv.textContent = "Selecione uma foto para todos os produtos antes de importar (" + faltando.length + " produto(s) sem foto).";
        return;
      }
      if (msgDlgCsv) msgDlgCsv.textContent = "Importando produtos...";
      const mapaImagens = {};
      Object.keys(estadoCsv.fotos).forEach(function (k) { mapaImagens[String(k)] = estadoCsv.fotos[k]; });
      const resposta = await fetch("/api/csv/produtos", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: estadoCsv.texto, imagens: mapaImagens })
      });
      const dados = await resposta.json().catch(function () { return {}; });
      if (!resposta.ok) {
        if (msgDlgCsv) msgDlgCsv.textContent = dados.message || dados.erro || "Falha na importação.";
        return;
      }
      const ignoradas = (dados.ignorados || []).map(function (i) { return "linha " + i.linha + ": " + i.motivo; }).join("; ");
      aviso.textContent = (dados.importados || 0) + " produto(s) importado(s) com foto." + (ignoradas ? " Ignoradas: " + ignoradas : "");
      dlgCsv.close();
      estadoCsv = null;
      await carregar();
    });
  }

  carregar();
})();
