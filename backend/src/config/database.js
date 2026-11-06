
import { MongoClient } from "mongodb";

let client;
let database;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes("COLE_AQUI") || uri.includes("SEU-CLUSTER")) {
    throw new Error(
      "Configure MONGODB_URI no arquivo .env antes de iniciar."
    );
  }

  client = new MongoClient(uri);
  await client.connect();

  database = client.db("agrorecursos");

  await database.collection("users").createIndex(
    { email: 1 },
    { unique: true }
  );

  await database.collection("profiles").createIndex(
    { userId: 1 },
    { unique: true }
  );

  await database.collection("addresses").createIndex({
    userId: 1
  });

  const indices = [
    ["produtos", { categoria: 1, marca: 1 }],
    ["produtos", { fornecedorId: 1 }],
    ["produtos", { vendidos: -1 }],
    ["produtos", { fornecedorId: 1, chave: 1 }, { unique: true, partialFilterExpression: { ativo: true, chave: { $type: "string" } } }],
    ["auditoria", { userId: 1, criadoEm: -1 }],
    ["laudos", { numero: 1 }, { unique: true }],
    ["fornecedores", { userId: 1 }],
    ["avaliacoes", { produtoId: 1, userId: 1 }],
    ["cotacoes", { userId: 1, criadoEm: -1 }],
    ["cotacoes", { codigo: 1 }, { unique: true, partialFilterExpression: { codigo: { $type: "string" } } }],
    ["pedidos", { userId: 1, criadoEm: -1 }],
    ["pedidos", { "itens.fornecedorId": 1 }],
    ["password_resets", { expiresAt: 1 }, { expireAfterSeconds: 0 }],
    ["password_resets", { tokenHash: 1 }],
    ["profiles", { document: 1 }, { unique: true, partialFilterExpression: { document: { $type: "string" } } }]
  ];

  for (const [colecao, chaves, opcoes] of indices) {
    try {
      await database.collection(colecao).createIndex(chaves, opcoes);
    } catch (error) {
      console.warn(`Índice não criado em ${colecao}:`, error.message);
    }
  }

  await database.command({ ping: 1 });

  console.log("MongoDB conectado com sucesso.");
  return database;
}

export function getDatabase() {
  if (!database) {
    throw new Error("O banco de dados ainda não foi conectado.");
  }

  return database;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }
}

