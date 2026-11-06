import test from "node:test";
import assert from "node:assert/strict";
import { montarConsulta, ORDENS } from "../backend/src/utils/produtos.js";

test("consulta padrão só traz produtos ativos, 12 por página, mais vendidos primeiro", () => {
  const c = montarConsulta({});
  assert.deepEqual(c.filtro, { ativo: { $ne: false } });
  assert.equal(c.limite, 12);
  assert.equal(c.pagina, 1);
  assert.deepEqual(Object.keys(c.ordem).at(-1), "_id");
});

test("faixa de preço vira $gte/$lte e valores trocados são invertidos", () => {
  assert.deepEqual(montarConsulta({ precoMin: "10", precoMax: "50" }).filtro.preco, { $gte: 10, $lte: 50 });
  assert.deepEqual(montarConsulta({ precoMin: "50", precoMax: "10" }).filtro.preco, { $gte: 10, $lte: 50 });
  assert.deepEqual(montarConsulta({ precoMin: "100.5" }).filtro.preco, { $gte: 100.5 });
});

test("preço negativo ou inválido é ignorado", () => {
  assert.equal(montarConsulta({ precoMin: "-5", precoMax: "abc" }).filtro.preco, undefined);
});

test("filtro de laudo só vale para true/1", () => {
  assert.deepEqual(montarConsulta({ laudo: "true" }).filtro.laudoId, { $ne: null });
  assert.deepEqual(montarConsulta({ laudo: "1" }).filtro.laudoId, { $ne: null });
  assert.equal(montarConsulta({ laudo: "false" }).filtro.laudoId, undefined);
});

test("busca escapa caracteres de regex", () => {
  const c = montarConsulta({ q: "soja (.*)" });
  assert.ok(c.filtro.$or[0].nome.test("Soja (.*) premium"));
  assert.equal(c.filtro.$or[0].nome.test("soja xyz"), false);
});

test("categoria e marca aceitam várias opções; limite e página são limitados", () => {
  const c = montarConsulta({ categoria: "Sementes,Defensivos", limite: "999", pagina: "-3" });
  assert.deepEqual(c.filtro.categoria, { $in: ["Sementes", "Defensivos"] });
  assert.equal(c.limite, 48);
  assert.equal(c.pagina, 1);
});

test("ordem desconhecida cai no padrão", () => {
  const c = montarConsulta({ ordem: "xyz" });
  assert.deepEqual(c.ordem, { ...ORDENS.vendidos, _id: 1 });
});
