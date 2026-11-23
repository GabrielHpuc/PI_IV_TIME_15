// Pedro RA: 25004075
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

  // Consulta os dados atualizados de cada produto que esta no carrinho
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

  // Recalcula o subtotal dos itens, o valor do frete, o prazo total e o valor final do pedido
  function atualizarResumo() {
    const quantidade = itens.reduce(function (s, i) { return s + i.qtd; }, 0);
    const subtotal = itens.reduce(function (s, i) { return s + i.qtd * i.produto.preco; }, 0);
    const valorFrete = frete && itens.length ? frete.valor : 0;

    document.querySelector("#resumo-subtotal-rotulo").textContent = "Subtotal (" + quantidade + (quantidade === 1 ? " item)" : " itens)");
    document.querySelector("#resumo-subtotal").textContent = ui.moeda(subtotal);
    document.querySelector("#resumo-frete").textContent = frete ? ui.moeda(frete.valor) : "—";
    document.querySelector("#resumo-frete-cep").textContent = frete ? "Frete calculado para CEP " + campoCep.value : "Informe o CEP";

    // prazo total = maior prazo de preparo do fornecedor + transporte até o CEP
    const preparo = itens.reduce(function (m, i) { return Math.max(m, i.produto.entregaDias); }, 0);
    if (frete && itens.length) {
      const total = preparo + frete.prazo;
      prazo.textContent = total;
      document.querySelector("#resumo-frete-cep").textContent += " · " + window.AgroCep.previsao(total);
    } else {
      prazo.textContent = preparo;
    }
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

  const enderecosWrap = document.querySelector("#enderecos-salvos-wrap");
  const seletorEndereco = document.querySelector("#seletor-endereco");
  let enderecosSalvos = [];

  function formatarCep(valor) {
    const d = String(valor || "").replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
  }

  function normalizarEnd(item) {
    if (!item || typeof item !== "object") return null;
    const cep = String(item.cep || "").replace(/\D/g, "").slice(0, 8);
    const rua = String(item.rua ?? item.street ?? "").trim();
    const numero = String(item.numero ?? item.number ?? "").trim();
    const complemento = String(item.complemento ?? item.complement ?? "").trim();
    const bairro = String(item.bairro ?? item.neighborhood ?? "").trim();
    const cidade = String(item.cidade ?? item.city ?? "").trim();
    const estado = String(item.estado ?? item.state ?? "").trim().toUpperCase().slice(0, 2);
    const observacoes = String(item.observacoes ?? "").trim();
    const label = String(item.label ?? item.apelido ?? "").trim();
    if (!cep && !rua && !cidade) return null;
    return {
      id: item.id || "",
      label: label,
      cep: cep,
      rua: rua,
      numero: numero,
      complemento: complemento,
      bairro: bairro,
      cidade: cidade,
      estado: estado,
      observacoes: observacoes,
      principal: Boolean(item.principal)
    };
  }

  function chaveEnd(e) {
    return [e.cep, e.rua.toLowerCase(), e.numero.toLowerCase()].join("|");
  }

  function textoOpcaoEndereco(e, idx) {
    const titulo = e.label || (e.principal ? "Endereço principal" : "Endereço " + (idx + 1));
    const ruaNum = [e.rua, e.numero].filter(Boolean).join(", ");
    const cidUf = [e.cidade, e.estado].filter(Boolean).join("/");
    const cepFmt = e.cep ? "CEP " + formatarCep(e.cep) : "";
    return [titulo + ":", ruaNum, e.bairro, cidUf, cepFmt].filter(Boolean).join(" · ");
  }

  function preencherFormularioEndereco(end) {
    if (!end) return;
    formulario.elements.cep.value = formatarCep(end.cep);
    formulario.elements.rua.value = end.rua || "";
    formulario.elements.numero.value = end.numero || "";
    formulario.elements.complemento.value = end.complemento || "";
    formulario.elements.bairro.value = end.bairro || "";
    formulario.elements.cidade.value = end.cidade || "";
    formulario.elements.estado.value = end.estado || "";
    if (formulario.elements.observacoes && end.observacoes !== undefined) {
      formulario.elements.observacoes.value = end.observacoes || "";
    }
    ["cep", "rua", "numero", "bairro", "cidade", "estado"].forEach(function (nome) {
      if (formulario.elements[nome].value.trim()) {
        formulario.elements[nome].classList.remove("campo-erro");
      }
    });
    if (end.cep && end.cep.length === 8) {
      calcular();
    }
  }

  function salvarEnderecoLocal(entrega) {
    const norm = normalizarEnd(entrega);
    if (!norm) return;
    try {
      localStorage.setItem("agro_ultimo_endereco", JSON.stringify(norm));
      const atuais = JSON.parse(localStorage.getItem("agro_enderecos")) || [];
      const lista = Array.isArray(atuais) ? atuais.map(normalizarEnd).filter(Boolean) : [];
      const chave = chaveEnd(norm);
      const filtrada = lista.filter(function (item) { return chaveEnd(item) !== chave; });
      filtrada.unshift(norm);
      localStorage.setItem("agro_enderecos", JSON.stringify(filtrada.slice(0, 15)));
    } catch (e) {}
  }

  // Carrega os enderecos salvos no perfil do usuario para facilitar o preenchimento da entrega
  async function carregarEnderecosSalvos() {
    const acumulados = [];
    const vistos = new Set();

    function adicionar(item) {
      const n = normalizarEnd(item);
      if (!n) return;
      const ch = chaveEnd(n);
      if (vistos.has(ch)) return;
      vistos.add(ch);
      acumulados.push(n);
    }

    let logado = false;
    try {
      const me = await fetch("/api/auth/me", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; });
      if (me && me.user) {
        logado = true;
        if (Array.isArray(me.user.addresses)) {
          const ordenados = me.user.addresses.slice().sort(function (a, b) {
            return (b.principal ? 1 : 0) - (a.principal ? 1 : 0);
          });
          ordenados.forEach(adicionar);
        }
        if (me.user.address) {
          adicionar(me.user.address);
        }
      }
    } catch (e) {}

    // Endereços guardados no navegador só valem sem conta carregada; com login, vale só o que é da conta
    // (senão os endereços de quem usou o computador antes apareceriam para a próxima pessoa).
    if (!logado) {
      try {
        const ultimo = JSON.parse(localStorage.getItem("agro_ultimo_endereco"));
        if (ultimo) adicionar(ultimo);
      } catch (e) {}

      try {
        const locais = JSON.parse(localStorage.getItem("agro_enderecos"));
        if (Array.isArray(locais)) locais.forEach(adicionar);
      } catch (e) {}
    }

    if (!acumulados.length) {
      try {
        const ped = await fetch("/api/pedidos", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; });
        if (ped && Array.isArray(ped.itens)) {
          ped.itens.forEach(function (p) { if (p.entrega) adicionar(p.entrega); });
        }
      } catch (e) {}
    }

    enderecosSalvos = acumulados;

    if (enderecosSalvos.length && enderecosWrap && seletorEndereco) {
      seletorEndereco.innerHTML = enderecosSalvos.map(function (e, idx) {
        return '<option value="' + idx + '">' + ui.esc(textoOpcaoEndereco(e, idx)) + "</option>";
      }).join("") + '<option value="novo">+ Usar outro endereço</option>';
      enderecosWrap.hidden = false;
      preencherFormularioEndereco(enderecosSalvos[0]);
    }
  }

  if (seletorEndereco) {
    seletorEndereco.addEventListener("change", function () {
      if (seletorEndereco.value === "novo") {
        ["cep", "rua", "numero", "complemento", "bairro", "cidade", "estado", "observacoes"].forEach(function (nome) {
          if (formulario.elements[nome]) formulario.elements[nome].value = "";
        });
        frete = null;
        atualizarResumo();
        campoCep.focus();
        return;
      }
      const escolhido = enderecosSalvos[Number(seletorEndereco.value)];
      if (escolhido) {
        preencherFormularioEndereco(escolhido);
      }
    });
  }

  // Digitou os 8 números do CEP: preenche rua, bairro, cidade e UF e já calcula frete e prazo.
  window.AgroCep.aoCompletar(campoCep, function (endereco) {
    ["rua", "bairro", "cidade", "estado"].forEach(function (nome) {
      if (endereco[nome]) {
        formulario.elements[nome].value = endereco[nome];
        formulario.elements[nome].classList.remove("campo-erro");
      }
    });
    calcular().then(function () {
      formulario.elements[endereco.rua ? "numero" : "rua"].focus();
    });
  }, function (texto, ok) {
    campoCep.classList.toggle("campo-erro", Boolean(texto) && !ok);
    aviso_(ui.esc(texto), ok && Boolean(texto));
  });

  // Valida o endereco de entrega e envia o pedido para registro na API
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
      const dadosEntrega = {
        cep: dados.get("cep"), rua: dados.get("rua"), numero: dados.get("numero"), complemento: dados.get("complemento"),
        bairro: dados.get("bairro"), cidade: dados.get("cidade"), estado: dados.get("estado"), observacoes: dados.get("observacoes")
      };
      const resposta = await ui.api("/api/pedidos", {
        method: "POST",
        body: {
          itens: itens.map(function (i) { return { produtoId: i.produto.id, quantidade: i.qtd }; }),
          entrega: dadosEntrega,
          pagamento: { metodo: metodo(), parcelas: Number(parcelas.value) }
        }
      });

      salvarEnderecoLocal(dadosEntrega);
      finalizado = true;
      localStorage.removeItem("agro_carrinho");
      const contador = document.querySelector("#mk-carrinho-qtd");
      if (contador) {
        contador.textContent = "";
      }
      window.location.href = "dashboard.html?page=pedidos";
    } catch (erro) {
      botaoPagar.disabled = false;
      botaoPagar.textContent = "Prosseguir para Pagamento ›";
      aviso_(erro.status === 401 ? 'Faça <a href="login.html">login</a> como produtor para finalizar.' : ui.esc(erro.message));
    }
  });

  carregarItens().then(function () {
    render();
    carregarEnderecosSalvos();
  });
})();
