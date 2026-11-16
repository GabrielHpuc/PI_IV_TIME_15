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

  carregar();
})();
