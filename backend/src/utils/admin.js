// Tom RA: 25015528
import crypto from "node:crypto";
import { arredondar } from "./validacao.js";

// Painel de administração (apenas demonstração): a plataforma retém 3% de cada venda.
// Não há gateway de pagamento; o valor é calculado em cima dos pedidos registrados no banco.
export const TAXA_COMISSAO = 0.03;

// Login de demonstração do administrador. Pode ser trocado pelas variáveis ADMIN_USER e ADMIN_PASSWORD do .env.
const USUARIO = process.env.ADMIN_USER || "usuarioadmin";
const SENHA = process.env.ADMIN_PASSWORD || "1234";

const hash = valor => crypto.createHash("sha256").update(String(valor ?? "")).digest();
const iguais = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));

// Compara usuário e senha sem vazar diferenças de tempo de resposta
export function credenciaisValidas(usuario, senha) {
  return iguais(usuario, USUARIO) && iguais(senha, SENHA);
}

// 3% do valor dos produtos (o frete não é venda, então não entra na comissão)
export const calcularComissao = subtotal => arredondar(Number(subtotal || 0) * TAXA_COMISSAO);

const dia = data => new Date(data).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

// Transforma a lista de pedidos nos números exibidos no dashboard do administrador
export function resumirVendas(pedidos, nomesFornecedores = new Map(), hoje = new Date(), diasGrafico = 30) {
  const validos = pedidos.filter(p => p.status !== "cancelado");
  const porFornecedor = new Map();
  const porDia = new Map();
  const porStatus = {};
  let produtos = 0, frete = 0, total = 0, comissaoExata = 0;

  for (const p of validos) {
    const sub = Number(p.subtotal || 0);
    produtos += sub;
    frete += Number(p.frete?.valor || 0);
    total += Number(p.total || 0);
    comissaoExata += sub * TAXA_COMISSAO;
    porStatus[p.status] = (porStatus[p.status] ?? 0) + 1;

    const d = dia(p.criadoEm);
    const atual = porDia.get(d) ?? { data: d, pedidos: 0, vendas: 0 };
    atual.pedidos += 1;
    atual.vendas += sub;
    porDia.set(d, atual);

    for (const item of p.itens ?? []) {
      const id = String(item.fornecedorId);
      const f = porFornecedor.get(id) ?? { id, nome: nomesFornecedores.get(id) ?? "Fornecedor", pedidos: new Set(), vendas: 0 };
      f.pedidos.add(String(p._id));
      f.vendas += Number(item.subtotal || 0);
      porFornecedor.set(id, f);
    }
  }

  // últimos N dias, completando com zero os dias sem venda
  const grafico = [];
  for (let i = diasGrafico - 1; i >= 0; i--) {
    const d = dia(new Date(hoje.getTime() - i * 86400000));
    const v = porDia.get(d);
    grafico.push({ data: d, pedidos: v?.pedidos ?? 0, vendas: arredondar(v?.vendas ?? 0), comissao: calcularComissao(v?.vendas ?? 0) });
  }

  const comissao = arredondar(comissaoExata);
  return {
    taxa: TAXA_COMISSAO,
    totais: {
      pedidos: validos.length,
      cancelados: pedidos.length - validos.length,
      faturamento: arredondar(total),
      vendasProdutos: arredondar(produtos),
      frete: arredondar(frete),
      lucro: comissao,
      repasseFornecedores: arredondar(produtos - comissao),
      ticketMedio: validos.length ? arredondar(total / validos.length) : 0
    },
    porStatus,
    grafico,
    fornecedores: [...porFornecedor.values()]
      .map(f => ({ id: f.id, nome: f.nome, pedidos: f.pedidos.size, vendas: arredondar(f.vendas), comissao: calcularComissao(f.vendas) }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 10),
    ultimosPedidos: [...validos]
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
      .slice(0, 10)
      .map(p => ({
        numero: p.numero, criadoEm: p.criadoEm, status: p.status,
        total: arredondar(p.total || 0), subtotal: arredondar(p.subtotal || 0), comissao: calcularComissao(p.subtotal)
      }))
  };
}
