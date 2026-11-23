import test from "node:test";
import assert from "node:assert/strict";
import { calcularComissao, credenciaisValidas, resumirVendas, TAXA_COMISSAO } from "../backend/src/utils/admin.js";

test("comissão é 3% do valor dos produtos, arredondada em centavos", () => {
  assert.equal(TAXA_COMISSAO, 0.03);
  assert.equal(calcularComissao(1000), 30);
  assert.equal(calcularComissao(99.9), 3);
  assert.equal(calcularComissao(0), 0);
  assert.equal(calcularComissao(undefined), 0);
});

test("login do administrador aceita apenas usuário e senha combinados", () => {
  assert.equal(credenciaisValidas("usuarioadmin", "1234"), true);
  assert.equal(credenciaisValidas("usarioadmin", "1234"), false);
  assert.equal(credenciaisValidas("usuarioadmin", "12345"), false);
  assert.equal(credenciaisValidas("outro", "1234"), false);
  assert.equal(credenciaisValidas("", ""), false);
  assert.equal(credenciaisValidas(undefined, undefined), false);
});

test("resumo soma faturamento, lucro de 3% e ignora pedidos cancelados", () => {
  const hoje = new Date("2026-06-10T15:00:00Z");
  const pedidos = [
    { _id: "1", numero: "PED000001", status: "criado", subtotal: 1000, frete: { valor: 50 }, total: 1050, criadoEm: new Date("2026-06-10T12:00:00Z"), itens: [{ fornecedorId: "f1", subtotal: 600 }, { fornecedorId: "f2", subtotal: 400 }] },
    { _id: "2", numero: "PED000002", status: "entregue", subtotal: 500, frete: { valor: 30 }, total: 530, criadoEm: new Date("2026-06-09T12:00:00Z"), itens: [{ fornecedorId: "f1", subtotal: 500 }] },
    { _id: "3", numero: "PED000003", status: "cancelado", subtotal: 9999, frete: { valor: 10 }, total: 10009, criadoEm: new Date("2026-06-09T12:00:00Z"), itens: [{ fornecedorId: "f2", subtotal: 9999 }] }
  ];
  const r = resumirVendas(pedidos, new Map([["f1", "AgroVant"], ["f2", "Campo Forte"]]), hoje);

  assert.equal(r.totais.pedidos, 2);
  assert.equal(r.totais.cancelados, 1);
  assert.equal(r.totais.faturamento, 1580);
  assert.equal(r.totais.vendasProdutos, 1500);
  assert.equal(r.totais.lucro, 45);
  assert.equal(r.totais.repasseFornecedores, 1455);
  assert.equal(r.totais.ticketMedio, 790);

  assert.equal(r.fornecedores[0].nome, "AgroVant");
  assert.equal(r.fornecedores[0].vendas, 1100);
  assert.equal(r.fornecedores[0].comissao, 33);
  assert.equal(r.fornecedores[0].pedidos, 2);
  assert.equal(r.fornecedores[1].comissao, 12);

  assert.equal(r.grafico.length, 30);
  assert.equal(r.grafico.at(-1).comissao, 30);
  assert.equal(r.grafico.at(-2).comissao, 15);
  assert.equal(r.ultimosPedidos[0].numero, "PED000001");
});

test("sem pedidos, tudo zerado", () => {
  const r = resumirVendas([]);
  assert.equal(r.totais.faturamento, 0);
  assert.equal(r.totais.lucro, 0);
  assert.equal(r.totais.ticketMedio, 0);
  assert.deepEqual(r.fornecedores, []);
});
