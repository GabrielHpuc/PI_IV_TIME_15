const form = document.querySelector("#register-form");
const message = document.querySelector("#message");
const avancar = document.querySelector("#cad-avancar");
const voltar = document.querySelector("#cad-voltar");
const passosLista = document.querySelector("#cad-passos");

const fluxos = {
  produtor: [
    { grupo: "g-produtor-1", nome: "Dados Básicos" },
    { grupo: "g-senha", nome: "Segurança" }
  ],
  fornecedor: [
    { grupo: "g-fornecedor-1", nome: "Dados Básicos" },
    { grupo: "g-fornecedor-2", nome: "Empresa & Catálogo" },
    { grupo: "g-senha", nome: "Segurança" }
  ]
};

let tipo = "produtor";
let passo = 0;

const digitos = (valor) => String(valor).replace(/\D/g, "");
const emailValido = (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);

function mascaraDocumento(valor) {
  const d = digitos(valor).slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

function mascaraTelefone(valor) {
  const d = digitos(valor).slice(0, 11);
  if (d.length <= 2) return d ? "(" + d : "";
  if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
  if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
  return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
}

function aplicarMascara(id, funcao) {
  const campo = document.getElementById(id);
  campo.addEventListener("input", () => { campo.value = funcao(campo.value); });
}

aplicarMascara("p-doc", mascaraDocumento);
aplicarMascara("f-cnpj", mascaraDocumento);
aplicarMascara("p-cel", mascaraTelefone);
aplicarMascara("f-cel", mascaraTelefone);

function render() {
  const fluxo = fluxos[tipo];
  const ultimo = passo === fluxo.length - 1;

  document.querySelectorAll(".cad-grupo").forEach((grupo) => {
    grupo.hidden = grupo.id !== fluxo[passo].grupo;
  });

  passosLista.innerHTML = fluxo.map((item, i) => {
    const classe = i === passo ? "atual" : i < passo ? "feito" : "";
    return '<li class="' + classe + '"><span>' + (i + 1) + "</span>" + item.nome + "</li>";
  }).join("");

  voltar.hidden = passo === 0;
  avancar.textContent = ultimo ? "Criar conta" : "Continuar →";
  message.textContent = "";
}

function erroCampo(nome, texto) {
  const campo = form.elements[nome];
  campo.closest(".rec-campo").classList.add("cad-erro");
  campo.focus();
  message.textContent = texto;
  return false;
}

function validar() {
  document.querySelectorAll(".cad-erro").forEach((el) => el.classList.remove("cad-erro"));
  const v = (nome) => form.elements[nome].value.trim();
  const grupo = fluxos[tipo][passo].grupo;

  if (grupo === "g-produtor-1") {
    if (v("nome").length < 2) return erroCampo("nome", "Informe seu nome completo.");
    if (![11, 14].includes(digitos(v("documento")).length)) return erroCampo("documento", "Informe um CPF ou CNPJ válido.");
    if (digitos(v("celular")).length < 10) return erroCampo("celular", "Informe o celular com DDD.");
    if (!emailValido(v("email"))) return erroCampo("email", "Informe um e-mail válido.");
  }

  if (grupo === "g-fornecedor-1") {
    if (v("razao").length < 2) return erroCampo("razao", "Informe a razão social.");
    if (digitos(v("cnpj")).length !== 14) return erroCampo("cnpj", "Informe um CNPJ com 14 dígitos.");
    if (v("fantasia").length < 2) return erroCampo("fantasia", "Informe o nome fantasia.");
  }

  if (grupo === "g-fornecedor-2") {
    if (v("responsavel").length < 2) return erroCampo("responsavel", "Informe o nome do responsável.");
    if (digitos(v("celularf")).length < 10) return erroCampo("celularf", "Informe o celular com DDD.");
    if (!emailValido(v("emailf"))) return erroCampo("emailf", "Informe um e-mail válido.");
  }

  if (grupo === "g-senha") {
    if (form.elements.senha.value.length < 8) return erroCampo("senha", "A senha deve ter no mínimo 8 caracteres.");
    if (form.elements.senha.value !== form.elements.confirma.value) return erroCampo("confirma", "As senhas não coincidem.");
  }

  return true;
}

function montarDados() {
  const v = (nome) => form.elements[nome].value.trim();

  if (tipo === "produtor") {
    return {
      accountType: "produtor",
      name: v("nome"),
      document: digitos(v("documento")),
      phone: v("celular"),
      email: v("email"),
      password: form.elements.senha.value
    };
  }

  return {
    accountType: "fornecedor",
    name: v("responsavel"),
    email: v("emailf"),
    phone: v("celularf"),
    document: digitos(v("cnpj")),
    companyName: v("razao"),
    tradeName: v("fantasia"),
    stateRegistration: v("ie"),
    categories: Array.from(form.querySelectorAll('input[name="categorias"]:checked')).map((c) => c.value),
    password: form.elements.senha.value
  };
}

document.querySelectorAll(".cad-tipo").forEach((botao) => {
  botao.addEventListener("click", () => {
    tipo = botao.dataset.tipo;
    passo = 0;
    document.querySelectorAll(".cad-tipo").forEach((b) => {
      const ativo = b === botao;
      b.classList.toggle("ativo", ativo);
      b.setAttribute("aria-pressed", String(ativo));
    });
    render();
  });
});

voltar.addEventListener("click", () => {
  passo -= 1;
  render();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validar()) return;

  if (passo < fluxos[tipo].length - 1) {
    passo += 1;
    render();
    return;
  }

  message.textContent = "";
  avancar.disabled = true;
  avancar.textContent = "Criando conta...";

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(montarDados())
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Não foi possível criar a conta.");
    }

    window.location.href = "dashboard.html";
  } catch (error) {
    message.textContent = error.message;
    avancar.disabled = false;
    avancar.textContent = "Criar conta";
  }
});

render();
