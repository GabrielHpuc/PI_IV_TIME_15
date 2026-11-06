(function () {
  const ui = window.AgroUI;

  const listaItens = document.querySelector("#itens-pedido");
  const aviso = document.querySelector("#aviso-entrega");
  const prazo = document.querySelector("#prazo-entrega");
  const campoCep = document.querySelector("#cep");
  const formulario = document.querySelector("#form-entrega");
  const mensagem = document.querySelector("#mensagem-checkout");
  const botaoPagar = document.querySelector("#prosseguir");
  const parcelas = document.querySelector("#parcelas");
  const rotuloParcelas = document.querySelector("#parcelas-rotulo");

  let frete = null;
  let itens = [];
  let finalizado = false;

  ui.mascararCep(campoCep);

  for (let i = 1; i <= 12; i += 1) {
    parcelas.insertAdjacentHTML("beforeend", '<option value="' + i + '">' + i + "x sem juros</option>");
  }

  function metodo() {
    return document.querySelector('input[name="pagamento"]:checked').value;
  }

  function atualizarParcelas() {
    rotuloParcelas.hidden = metodo() !== "cartao";
  }

  document.querySelectorAll('input[name="pagamento"]').forEach(function (radio) {
    radio.addEventListener("change", atualizarParcelas);
  });
  atualizarParcelas();

  function aviso_(texto, ok) {
    mensagem.className = "mensagem-checkout" + (ok ? " ok" : "");
    mensagem.innerHTML = texto;
  }

  async function carregarItens() {
    const carrinho = ui.carrinho.ler();
    const respostas = await Promise.all(carrinho.map(function (item) {
      return ui.api("/api/produtos/" + item.id).then(function (produto) {
        return { produto: produto, qtd: item.qtd };
      }).catch(function () {
        ui.carrinho.remover(item.id);
        return null;
      });
    }));
    itens = respostas.filter(Boolean);
  }

  function atualizarResumo() {
    const quantidade = itens.reduce(function (s, i) { return s + i.qtd; }, 0);
    const subtotal = itens.reduce(function (s, i) { return s + i.qtd * i.produto.preco; }, 0);
    const valorFrete = frete && itens.length ? frete.valor : 0;

    document.querySelector("#resumo-subtotal-rotulo").textContent = "Subtotal (" + quantidade + (quantidade === 1 ? " item)" : " itens)");
    document.querySelector("#resumo-subtotal").textContent = ui.moeda(subtotal);
    document.querySelector("#resumo-frete").textContent = frete ? ui.moeda(frete.valor) : "—";
    document.querySelector("#resumo-frete-cep").textContent = frete ? "Frete calculado para CEP " + campoCep.value : "Informe o CEP";
    document.querySelector("#resumo-total").textContent = ui.moeda(subtotal + valorFrete);
  }

  function render() {
    if (!itens.length) {
      listaItens.innerHTML = '<div class="mk-vazio">Seu carrinho está vazio. <a href="catalogo.html">Explorar o catálogo</a></div>';
      aviso.hidden = true;
      atualizarResumo();
      return;
    }

    listaItens.innerHTML = itens.map(function (i) {
      return '<div class="item-pedido" data-id="' + i.produto.id + '">' +
        '<div class="mk-thumb">' + ui.iconeProduto(i.produto) + "</div>" +
        "<strong>" + ui.esc(i.produto.nome) + "</strong>" +
        '<span class="item-qtd"><button type="button" data-acao="menos" aria-label="Diminuir">−</button><span>' + i.qtd + 'x</span><button type="button" data-acao="mais" aria-label="Aumentar">+</button></span>' +
        "<strong>" + ui.moeda(i.produto.preco * i.qtd) + "</strong>" +
        '<button type="button" class="item-remover" data-acao="remover">Remover</button></div>';
    }).join("");

    prazo.textContent = itens.reduce(function (m, i) { return Math.max(m, i.produto.entregaDias); }, 0);
    aviso.hidden = false;
    atualizarResumo();
  }

  listaItens.addEventListener("click", function (evento) {
    const botao = evento.target.closest("[data-acao]");
    const linha = evento.target.closest(".item-pedido");
    if (!botao || !linha || finalizado) {
      return;
    }
    const item = itens.find(function (i) { return i.produto.id === linha.dataset.id; });
    if (!item) {
      return;
    }

    if (botao.dataset.acao === "mais") {
      item.qtd += 1;
      ui.carrinho.alterar(item.produto.id, item.qtd);
    } else if (botao.dataset.acao === "menos") {
      item.qtd -= 1;
      ui.carrinho.alterar(item.produto.id, item.qtd);
    } else {
      item.qtd = 0;
      ui.carrinho.remover(item.produto.id);
    }
    itens = itens.filter(function (i) { return i.qtd > 0; });
    render();
  });

  async function calcular() {
    try {
      frete = await ui.api("/api/frete?cep=" + encodeURIComponent(campoCep.value));
      campoCep.classList.remove("campo-erro");
      aviso_("");
    } catch (erro) {
      frete = null;
      campoCep.classList.add("campo-erro");
      aviso_(ui.esc(erro.message));
    }
    atualizarResumo();
    return frete;
  }

  document.querySelector("#calcular-frete").addEventListener("click", calcular);

  botaoPagar.addEventListener("click", async function () {
    if (finalizado) {
      return;
    }
    aviso_("");

    if (!itens.length) {
      aviso_("Adicione produtos ao carrinho para continuar.");
      return;
    }

    let invalido = false;
    ["cep", "rua", "numero", "bairro", "cidade", "estado"].forEach(function (nome) {
      const campo = formulario.elements[nome];
      const vazio = !campo.value.trim();
      campo.classList.toggle("campo-erro", vazio);
      invalido = invalido || vazio;
    });

    if (invalido) {
      aviso_("Preencha os campos obrigatórios da entrega.");
      return;
    }

    if (!frete && !(await calcular())) {
      return;
    }

    botaoPagar.disabled = true;
    botaoPagar.textContent = "Enviando...";

    try {
      const dados = new FormData(formulario);
      const resposta = await ui.api("/api/pedidos", {
        method: "POST",
        body: {
          itens: itens.map(function (i) { return { produtoId: i.produto.id, quantidade: i.qtd }; }),
          entrega: {
            cep: dados.get("cep"), rua: dados.get("rua"), numero: dados.get("numero"), complemento: dados.get("complemento"),
            bairro: dados.get("bairro"), cidade: dados.get("cidade"), estado: dados.get("estado"), observacoes: dados.get("observacoes")
          },
          pagamento: { metodo: metodo(), parcelas: Number(parcelas.value) }
        }
      });

      finalizado = true;
      localStorage.removeItem("agro_carrinho");
      const contador = document.querySelector("#mk-carrinho-qtd");
      if (contador) {
        contador.textContent = "0";
      }
      listaItens.innerHTML = '<div class="checkout-sucesso"><h2>Pedido ' + ui.esc(resposta.pedido.numero) + ' registrado</h2>' +
        "<p>Total: <strong>" + ui.moeda(resposta.pedido.total) + '</strong>. Acompanhe o andamento com o fornecedor.</p>' +
        '<a class="mk-btn mk-btn-verde" href="catalogo.html">Continuar comprando</a></div>';
      aviso.hidden = true;
      aviso_("Pedido registrado com sucesso.", true);
      botaoPagar.textContent = "Pedido concluído";
    } catch (erro) {
      botaoPagar.disabled = false;
      botaoPagar.textContent = "Prosseguir para Pagamento ›";
      aviso_(erro.status === 401 ? 'Faça <a href="login.html">login</a> como produtor para finalizar.' : ui.esc(erro.message));
    }
  });

  carregarItens().then(render);
})();
