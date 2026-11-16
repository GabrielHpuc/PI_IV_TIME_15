import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { BSON, MongoClient, ObjectId } from "mongodb";

const pasta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../banco");
const colecoes = ["fornecedores", "produtos", "laudos", "avaliacoes", "cotacoes"];
const SENHA_DEMO = "Demo@12345";

if (!process.env.MONGODB_URI) {
  throw new Error("Configure MONGODB_URI no arquivo .env.");
}

const client = new MongoClient(process.env.MONGODB_URI);

try {
  await client.connect();
  const db = client.db("agrorecursos");

  for (const nome of colecoes) {
    const docs = BSON.EJSON.parse(fs.readFileSync(path.join(pasta, nome + ".json"), "utf8"));
    await db.collection(nome).deleteMany({ seed: true });
    await db.collection(nome).insertMany(docs);
    console.log(`${nome}: ${docs.length} documentos`);
  }

  await db.collection("users").deleteMany({ seed: true });
  await db.collection("profiles").deleteMany({ seed: true });

  const passwordHash = await bcrypt.hash(SENHA_DEMO, 12);
  const agora = new Date();
  const base = { passwordHash, status: "active", emailVerified: true, seed: true, createdAt: agora, updatedAt: agora };
  const demos = [
    { email: "demo.produtor@agrorecursos.com", name: "Marcos Roberto", accountType: "produtor", document: "52998224725", phone: "(19) 99999-8888" },
    { email: "demo.fornecedor@agrorecursos.com", name: "Ana Souza", accountType: "fornecedor", document: "11222333000181", phone: "(19) 3333-4444" }
  ];

  for (const demo of demos) {
    const userId = new ObjectId();
    await db.collection("users").insertOne({ ...base, _id: userId, email: demo.email });
    await db.collection("profiles").insertOne({
      userId, name: demo.name, accountType: demo.accountType, phone: demo.phone, document: demo.document,
      companyName: demo.accountType === "fornecedor" ? "AgroVant Insumos Agrícolas Ltda" : null,
      tradeName: demo.accountType === "fornecedor" ? "AgroVant" : null,
      address: { cep: "13010111", street: "Rua Barão de Jaguara", number: "100", complement: "", neighborhood: "Centro", city: "Campinas", state: "SP" },
      registrationStatus: "complete", seed: true, createdAt: agora, updatedAt: agora
    });
    if (demo.accountType === "fornecedor") {
      await db.collection("fornecedores").updateOne({ nomeFantasia: "AgroVant", seed: true }, { $set: { userId } });
    }
  }

  console.log(`Usuários de demonstração criados (senha ${SENHA_DEMO}):`);
  demos.forEach(d => console.log(" -", d.email));
} finally {
  await client.close();
}
