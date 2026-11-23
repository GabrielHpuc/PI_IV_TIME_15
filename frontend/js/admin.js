// Painel do administrador (demonstração)
const telaLogin = document.querySelector("#tela-login");
const telaPainel = document.querySelector("#tela-painel");
const formLogin = document.querySelector("#form-login");
const msgLogin = document.querySelector("#msg-login");
const msgPainel = document.querySelector("#msg-painel");

const dinheiro = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBr = iso => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const STATUS = {
  criado: "Criado", aguardando_pagamento: "Aguardando pagamento", em_analise: "Em análise", confirmado: "Confirmado",
  pago: "Pago", em_separacao: "Em separação", enviado: "Enviado", entregue: "Entregue"
};

async function api(url, opcoes) {
  const resposta = await fetch(url, { credentials: "same-origin", ...opcoes });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(corpo.message || "Erro ao falar com o servidor.");
    erro.status = resposta.status;
    throw erro;
  }
  return corpo;
}

function mostrar(painel) {
  telaLogin.hidden = painel;
  telaPainel.hidden = !painel;
}

function celula(tr, texto, classe) {
  const td = document.createElement("td");
  td.textContent = texto;
  if (classe) td.className = classe;
  tr.append(td);
}

function preencherTabela(id, linhas, colunas, vazio) {
  const corpo = document.querySelector(id);
  corpo.replaceChildren();
  if (!linhas.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = colunas;
    td.className = "vazio";
    td.textContent = vazio;
    tr.append(td);
    corpo.append(tr);
    return;
  }
  linhas.forEach(valores => {
    const tr = document.createElement("tr");
    valores.forEach(([texto, classe]) => celula(tr, texto, classe));
    corpo.append(tr);
  });
}

function desenharGrafico(dias) {
  const area = document.querySelector("#grafico");
  area.replaceChildren();
  const maximo = Math.max(...dias.map(d => d.comissao), 0.01);
  dias.forEach(d => {
    const coluna = document.createElement("div");
    coluna.className = "coluna";
    coluna.title = `${dataBr(d.data + "T12:00:00-03:00")}: ${dinheiro(d.comissao)} de lucro (${d.pedidos} pedido(s))`;
    const barra = document.createElement("span");
    barra.style.height = `${Math.max((d.comissao / maximo) * 100, d.comissao > 0 ? 4 : 1)}%`;
    if (d.comissao > 0) barra.className = "ativa";
    coluna.append(barra);
    area.append(coluna);
  });
}

async function carregarPainel() {
  msgPainel.textContent = "";
  try {
    const r = await api("/api/admin/resumo");
    const t = r.totais;
    document.querySelector("#k-lucro").textContent = dinheiro(t.lucro);
    document.querySelector("#k-faturamento").textContent = dinheiro(t.faturamento);
    document.querySelector("#k-repasse").textContent = dinheiro(t.repasseFornecedores);
    document.querySelector("#k-pedidos").textContent = String(t.pedidos);
    document.querySelector("#k-ticket").textContent = `Ticket médio ${dinheiro(t.ticketMedio)}`;
    desenharGrafico(r.grafico);
    preencherTabela("#tb-fornecedores", r.fornecedores.map(f => [
      [f.nome], [String(f.pedidos), "num"], [dinheiro(f.vendas), "num"], [dinheiro(f.comissao), "num"]
    ]), 4, "Ainda não há vendas.");
    preencherTabela("#tb-pedidos", r.ultimosPedidos.map(p => [
      [p.numero], [dataBr(p.criadoEm)], [STATUS[p.status] ?? p.status], [dinheiro(p.total), "num"], [dinheiro(p.comissao), "num"]
    ]), 5, "Ainda não há pedidos.");
    mostrar(true);
  } catch (erro) {
    if (erro.status === 401) return mostrar(false);
    msgPainel.textContent = erro.message;
  }
}

formLogin.addEventListener("submit", async evento => {
  evento.preventDefault();
  msgLogin.textContent = "";
  const botao = formLogin.querySelector("button");
  botao.disabled = true;
  try {
    await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: formLogin.usuario.value.trim(), senha: formLogin.senha.value })
    });
    formLogin.senha.value = "";
    await carregarPainel();
  } catch (erro) {
    msgLogin.textContent = erro.message;
  } finally {
    botao.disabled = false;
  }
});

document.querySelector("#btn-atualizar").addEventListener("click", carregarPainel);
document.querySelector("#btn-sair").addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST" }).catch(() => {});
  mostrar(false);
});

// Ao abrir a página, mostra o painel se a sessão do administrador ainda estiver ativa
api("/api/admin/sessao")
  .then(r => (r.autenticado ? carregarPainel() : mostrar(false)))
  .catch(() => mostrar(false));
