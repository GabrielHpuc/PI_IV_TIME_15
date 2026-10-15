
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

