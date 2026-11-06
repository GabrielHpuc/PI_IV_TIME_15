const base = process.env.BASE_URL || "http://localhost:3000";
let cookie = "";
let falhas = 0;

async function chamar(metodo, rota, corpo, tipo = "application/json") {
  const resposta = await fetch(base + rota, {
    method: metodo,
    headers: { ...(corpo !== undefined ? { "Content-Type": tipo } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo)
  });
  const novo = resposta.headers.getSetCookie?.().map(c => c.split(";")[0]).join("; ");
  if (novo) cookie = novo;
  const texto = await resposta.text();
  let dados = texto;
  try { dados = JSON.parse(texto); } catch { dados = texto; }
  return { status: resposta.status, dados };
}

function verificar(nome, condicao, detalhe = "") {
  console.log(`${condicao ? "OK   " : "FALHA"} ${nome}${condicao ? "" : " -> " + JSON.stringify(detalhe)}`);
  if (!condicao) falhas += 1;
}

const entrar = (email) => chamar("POST", "/api/auth/login", { login: email, password: "Demo@12345" });

let r = await chamar("GET", "/api/health");
verificar("servidor no ar", r.status === 200, r);

r = await chamar("GET", "/api/painel");
verificar("painel exige login", r.status === 401, r);

r = await entrar("demo.produtor@agrorecursos.com");
verificar("login do produtor", r.status === 200, r);
r = await entrar("52998224725");
verificar("login por CPF", r.status === 200, r);

r = await chamar("GET", "/api/produtos?categoria=Sementes&ordem=preco&limite=5");
verificar("catálogo com filtro e ordenação", r.status === 200 && r.dados.itens.length > 0 && r.dados.itens[0].preco <= r.dados.itens.at(-1).preco, r);
const produto = r.dados.itens?.[0];

r = await chamar("GET", "/api/produtos/" + produto?.id);
verificar("detalhe do produto", r.status === 200 && r.dados.id === produto.id, r);

r = await chamar("POST", `/api/produtos/${produto.id}/avaliacoes`, { nota: 5, comentario: "Teste automático" });
verificar("lançar avaliação", [200, 201].includes(r.status), r);
r = await chamar("POST", `/api/produtos/${produto.id}/avaliacoes`, { nota: 4, comentario: "Teste automático (atualizada)" });
verificar("atualizar avaliação", r.status === 200, r);

r = await chamar("GET", "/api/cotacoes");
verificar("cotações do produtor", r.status === 200 && r.dados.itens.length >= 3, r);
r = await chamar("POST", "/api/cotacoes", { item: "Item de teste", quantidade: "10 sacos", diasValidade: 3 });
verificar("criar cotação", r.status === 201, r);
const nova = r.dados.id;
r = await chamar("DELETE", "/api/cotacoes/" + nova);
verificar("excluir cotação sem propostas", r.status === 200, r);

r = await chamar("GET", "/api/frete?cep=01001000");
verificar("frete", r.status === 200 && r.dados.valor === 45, r);

r = await chamar("GET", "/api/produtos?limite=48");
const produtoVenda = r.dados.itens.find(i => i.fornecedor?.nome === "AgroVant") ?? produto;

r = await chamar("POST", "/api/pedidos", {
  itens: [{ produtoId: produtoVenda.id, quantidade: 2 }],
  entrega: { cep: "01001-000", rua: "Rua A", numero: "10", bairro: "Centro", cidade: "São Paulo", estado: "SP" },
  pagamento: { metodo: "cartao", parcelas: 3 }
});
verificar("criar pedido", r.status === 201 && r.dados.pedido.total === produtoVenda.preco * 2 + 45, r);
const pedido = r.dados.pedido;

r = await chamar("GET", "/api/csv/pedidos");
verificar("exportação bloqueada com pedido pendente", r.status === 409, r);

r = await chamar("GET", "/api/auditoria?limite=5");
verificar("auditoria registra ações", r.status === 200 && r.dados.itens.some(a => a.acao === "pedido.criado"), r);

r = await chamar("POST", "/api/auth/logout");
verificar("logout", r.status === 200, r);
r = await chamar("GET", "/api/auth/me");
verificar("sessão encerrada", r.status === 401, r);

r = await entrar("demo.fornecedor@agrorecursos.com");
verificar("login do fornecedor", r.status === 200, r);

const csv = "nome;categoria;marca;regiao;preco;entregaDias\nProduto Smoke A;Sementes;Marca X;Sul;10,50;3\nProduto Smoke A;Sementes;Marca X;Sul;10,50;3\nInvalido;Nada;Marca X;Sul;10;3";
r = await chamar("POST", "/api/csv/produtos", csv, "text/csv");
verificar("importar CSV (1 válido, duplicado e inválido ignorados)", r.status === 201 && r.dados.importados === 1 && r.dados.ignorados.length === 2, r);
r = await chamar("POST", "/api/csv/produtos", csv, "text/csv");
verificar("reimportar não duplica", r.status === 200 && r.dados.importados === 0, r);

r = await chamar("GET", "/api/produtos/meus");
const smoke = r.dados.itens?.filter(p => p.nome === "Produto Smoke A").map(p => p.id) ?? [];
verificar("produto importado aparece em Meus produtos", smoke.length === 1, r);
r = await chamar("POST", "/api/produtos/remover", { ids: smoke });
verificar("remoção em lote", r.status === 200 && r.dados.removidos === 1, r);

r = await chamar("GET", "/api/pedidos/vendas");
const venda = r.dados.itens?.find(v => v.numero === pedido.numero);
verificar("fornecedor vê a venda", Boolean(venda), r);
if (venda) {
  r = await chamar("PATCH", `/api/pedidos/${venda.id}/status`, { status: "enviado" });
  verificar("transição inválida é recusada", r.status === 409, r);
  r = await chamar("PATCH", `/api/pedidos/${venda.id}/status`, { status: "pago" });
  verificar("confirmar pagamento", r.status === 200, r);
}
r = await chamar("GET", "/api/csv/pedidos");
const outros = r.status === 409;
verificar("exportação de vendas responde", r.status === 200 || outros, r);

await chamar("POST", "/api/auth/logout");
console.log(falhas ? `\n${falhas} verificação(ões) falharam.` : "\nTodas as verificações passaram.");
process.exitCode = falhas ? 1 : 0;
