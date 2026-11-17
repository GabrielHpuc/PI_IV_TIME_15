import { CATEGORIAS, REGIOES, arredondar, escaparRegex, texto } from "./validacao.js";
import { numeroBrasileiro } from "./calculos.js";

const numero = (valor, padrao) => {
  if (valor === undefined || valor === null || valor === "") return padrao;
  const n = typeof valor === "number" ? valor : numeroBrasileiro(valor);
  return Number.isFinite(n) ? n : padrao;
};

export const chaveDuplicidade = (nome, marca) =>
  `${String(nome).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}|${String(marca).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}`;

export function gerarImagemPadrao(nome = "Produto", categoria = "Outros") {
  const cores = {
    Sementes: ["#174d35", "#26734b"],
    Fertilizantes: ["#1d4e5f", "#2b7a78"],
    Defensivos: ["#4a3b1c", "#7a6229"],
    Outros: ["#2c3e50", "#3d5a73"]
  };
  const [c1, c2] = cores[categoria] || cores.Outros;
  const limpo = String(nome || "Produto").replace(/[<>&"']/g, "").slice(0, 26);
  const catLimpa = String(categoria || "Agro").replace(/[<>&"']/g, "").slice(0, 20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>
    <rect width="300" height="300" rx="24" fill="url(#g)"/>
    <circle cx="150" cy="115" r="46" fill="#ffffff22"/>
    <path d="M132 132c0-26 16-42 46-45 0 29-16 45-42 45zm0 0c10-16 20-26 32-32" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="150" y="205" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="18" font-weight="bold">${limpo}</text>
    <text x="150" y="232" text-anchor="middle" fill="#dcefe1" font-family="Arial, sans-serif" font-size="14">${catLimpa}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

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

  let listaBruta;
  if (Array.isArray(corpo.imagens)) {
    listaBruta = corpo.imagens;
  } else {
    const campoImagem = corpo.imagem !== undefined
      ? corpo.imagem
      : corpo.foto !== undefined
        ? corpo.foto
        : corpo.imagem_url !== undefined
          ? corpo.imagem_url
          : corpo.url_imagem !== undefined
            ? corpo.url_imagem
            : undefined;
    if (campoImagem !== undefined) {
      const s = String(campoImagem || "").trim();
      listaBruta = s ? [s] : [];
    }
  }

  let imagens;
  if (listaBruta !== undefined) {
    imagens = [];
    for (const item of listaBruta.slice(0, 6)) {
      const img = String(item || "").trim();
      if (!img) continue;
      const ehBase64 = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i.test(img);
      const ehUrl = /^https?:\/\/[^\s"<>]+$/i.test(img);
      const ehCaminhoRelativo = /^(\/|[a-z0-9_\-./]+\.(png|jpe?g|webp|gif|svg))$/i.test(img);
      if (!ehBase64 && !ehUrl && !ehCaminhoRelativo) {
        return { erro: "Formato de imagem inválido. Envie PNG, JPG, WEBP, GIF ou uma URL de imagem válida." };
      }
      if (img.length > 2_000_000) {
        return { erro: "A imagem é muito grande (máximo 1,5 MB)." };
      }
      imagens.push(img);
    }
  }

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
      pureza: numero(corpo.pureza, 0),
      ...(imagens !== undefined ? { imagens } : {})
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
