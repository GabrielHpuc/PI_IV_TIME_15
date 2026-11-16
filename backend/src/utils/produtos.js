import { CATEGORIAS, REGIOES, arredondar, escaparRegex, texto } from "./validacao.js";
import { numeroBrasileiro } from "./calculos.js";

const numero = (valor, padrao) => {
  if (valor === undefined || valor === null || valor === "") return padrao;
  const n = typeof valor === "number" ? valor : numeroBrasileiro(valor);
  return Number.isFinite(n) ? n : padrao;
};

export const chaveDuplicidade = (nome, marca) =>
  `${String(nome).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}|${String(marca).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}`;

export function lerProduto(corpo) {
  const nome = texto(corpo.nome, 120);
  const categoria = texto(corpo.categoria, 30);
  const marca = texto(corpo.marca, 60);
  const regiao = texto(corpo.regiao, 30);
  const preco = arredondar(numero(corpo.preco, NaN));
  const entregaDias = numero(corpo.entregaDias, NaN);
  const estoque = numero(corpo.estoque, 0);

  if (nome.length < 3) return { erro: "Informe o nome do produto (mínimo 3 caracteres)." };
  if (!CATEGORIAS.includes(categoria)) return { erro: "Selecione uma categoria válida." };
  if (!marca) return { erro: "Informe a marca." };
  if (!REGIOES.includes(regiao)) return { erro: "Selecione uma região válida." };
  if (!Number.isFinite(preco) || preco <= 0) return { erro: "Informe um preço maior que zero." };
  if (!Number.isInteger(entregaDias) || entregaDias < 1 || entregaDias > 60) return { erro: "O prazo de entrega deve ficar entre 1 e 60 dias." };
  if (!Number.isInteger(estoque) || estoque < 0) return { erro: "Estoque inválido." };

  return {
    dados: {
      nome, categoria, marca, regiao, preco, entregaDias, estoque,
      chave: chaveDuplicidade(nome, marca),
      cultura: texto(corpo.cultura, 60) || "Diversas",
      tecnologia: texto(corpo.tecnologia, 60),
      embalagem: texto(corpo.embalagem, 60),
      descricao: texto(corpo.descricao, 1000),
      vencimento: texto(corpo.vencimento, 10),
      condicao: corpo.condicao === "Usado" ? "Usado" : "Novo",
      germinacao: numero(corpo.germinacao, 0),
      vigor: numero(corpo.vigor, 0),
      pureza: numero(corpo.pureza, 0)
    }
  };
}

export const ORDENS = {
  preco: { preco: 1 },
  "-preco": { preco: -1 },
  entrega: { entregaDias: 1, preco: 1 },
  vendidos: { vendidos: -1 }
};

const lista = valor => String(valor ?? "").split(",").map(v => v.trim()).filter(Boolean).slice(0, 20);

const numeroDaConsulta = (valor, padrao) => {
  if (valor === undefined || valor === null || String(valor).trim() === "") return padrao;
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
};

export function montarConsulta(query = {}) {
  const base = { ativo: { $ne: false } };
  const busca = texto(query.q, 80);

  if (busca) {
    const rx = new RegExp(escaparRegex(busca), "i");
    base.$or = [{ nome: rx }, { marca: rx }, { cultura: rx }, { categoria: rx }, { tecnologia: rx }];
  }

  const filtro = { ...base };
  for (const campo of ["categoria", "marca", "regiao"]) {
    const valores = lista(query[campo]);
    if (valores.length) filtro[campo] = { $in: valores };
  }

  let minimo = numeroDaConsulta(query.precoMin, null);
  let maximo = numeroDaConsulta(query.precoMax, null);
  if (minimo !== null && minimo < 0) minimo = null;
  if (maximo !== null && maximo < 0) maximo = null;
  if (minimo !== null && maximo !== null && minimo > maximo) [minimo, maximo] = [maximo, minimo];

  if (minimo !== null || maximo !== null) {
    filtro.preco = {};
    if (minimo !== null) filtro.preco.$gte = minimo;
    if (maximo !== null) filtro.preco.$lte = maximo;
  }

  if (["true", "1"].includes(String(query.laudo))) filtro.laudoId = { $ne: null };

  const limite = Math.min(Math.max(Math.trunc(numeroDaConsulta(query.limite, 12)), 1), 48);
  const pagina = Math.max(Math.trunc(numeroDaConsulta(query.pagina, 1)), 1);
  const ordem = { ...(ORDENS[query.ordem] ?? ORDENS.vendidos), _id: 1 };

  return { base, filtro, ordem, pagina, limite };
}
