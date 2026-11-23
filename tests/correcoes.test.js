// Tom RA: 25015528
import test from "node:test";
import assert from "node:assert/strict";
import { selecionarConta } from "../backend/src/utils/contas.js";
import { statusDoPedido } from "../backend/src/utils/pedidos.js";

const conta = (accountType, senhaOk) => ({ profile: { accountType }, senhaOk });

test("login nunca abre a conta cuja senha não conferiu", () => {
  // senha do produtor confere, a do fornecedor não: pedir o fornecedor deve ser recusado
  const checados = [conta("produtor", true), conta("fornecedor", false)];
  assert.deepEqual(selecionarConta(checados, "fornecedor"), { negado: true });
  assert.equal(selecionarConta(checados, "produtor").escolhido.profile.accountType, "produtor");
});

test("sem tipo escolhido: uma conta válida entra direto, duas válidas pedem a escolha, nenhuma é negada", () => {
  assert.equal(selecionarConta([conta("produtor", true), conta("fornecedor", false)]).escolhido.profile.accountType, "produtor");
  assert.equal(selecionarConta([conta("produtor", true), conta("fornecedor", true)]).opcoes.length, 2);
  assert.deepEqual(selecionarConta([conta("produtor", false), conta("fornecedor", false)]), { negado: true });
  assert.deepEqual(selecionarConta([]), { negado: true });
});

test("status do pedido é o do item menos adiantado", () => {
  assert.equal(statusDoPedido([{ status: "enviado" }, { status: "criado" }]), "criado");
  assert.equal(statusDoPedido([{ status: "entregue" }, { status: "enviado" }]), "enviado");
  assert.equal(statusDoPedido([{ status: "entregue" }, { status: "entregue" }]), "entregue");
});

test("item cancelado de um fornecedor não cancela o pedido dos outros", () => {
  assert.equal(statusDoPedido([{ status: "cancelado" }, { status: "em_separacao" }]), "em_separacao");
  assert.equal(statusDoPedido([{ status: "cancelado" }, { status: "cancelado" }]), "cancelado");
});

test("itens antigos sem status usam o status que o pedido tinha", () => {
  assert.equal(statusDoPedido([{}, { status: "enviado" }], "confirmado"), "confirmado");
  assert.equal(statusDoPedido([{}, {}]), "criado");
});
