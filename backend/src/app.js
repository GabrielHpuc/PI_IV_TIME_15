// Gabriel RA: 25004669
import "dotenv/config";
import dns from "node:dns";
// Define o DNS do Google para evitar falha de resolucao ao conectar no MongoDB Atlas
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/auth.js";
import produtosRoutes from "./routes/produtos.js";
import laudosRoutes from "./routes/laudos.js";
import cotacoesRoutes from "./routes/cotacoes.js";
import pedidosRoutes from "./routes/pedidos.js";
import freteRoutes from "./routes/frete.js";
import cepRoutes from "./routes/cep.js";
import painelRoutes from "./routes/painel.js";
import csvRoutes from "./routes/csv.js";
import fornecedoresRoutes from "./routes/fornecedores.js";
import auditoriaRoutes from "./routes/auditoria.js";

import {
  connectDatabase,
  closeDatabase
} from "./config/database.js";

// Inicializa a aplicacao Express e resolve o caminho da pasta do frontend
const app = express();
const PORT = Number(process.env.PORT) || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, "../../frontend");

console.log("Pasta frontend:", frontendPath);
console.log(
  "index.html encontrado:",
  (await import("node:fs")).existsSync(
    path.join(frontendPath, "index.html")
  )
);

// Valida se as variaveis obrigatorias de sessao e banco foram configuradas no .env
if (!process.env.SESSION_SECRET) {
  throw new Error("Configure SESSION_SECRET no arquivo .env.");
}

if (!process.env.MONGODB_URI) {
  throw new Error("Configure MONGODB_URI no arquivo .env.");
}

// Configura o Helmet para seguranca dos cabecalhos HTTP e libera imagens em base64 e links externos
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "blob:", "https:", "http:"]
      }
    }
  })
);
// Aumenta o limite do corpo da requisicao para 15mb para suportar envio de fotos e laudos em PDF
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: false, limit: "15mb" }));

// Gerencia a sessao do usuario salvando os dados no MongoDB com validade de 8 horas
app.use(
  session({
    name: "agrorecursos.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 8
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

// Limita a quantidade de requisicoes seguidas no login e cadastro para evitar ataques de forca bruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    application: "AgroRecursos MarketPlace"
  });
});

// Registra os modulos de rotas da API
app.use("/api/auth", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/produtos", produtosRoutes);
app.use("/api/laudos", laudosRoutes);
app.use("/api/cotacoes", cotacoesRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/frete", freteRoutes);
app.use("/api/cep", cepRoutes);
app.use("/api/painel", painelRoutes);
app.use("/api/csv", csvRoutes);
app.use("/api/fornecedores", fornecedoresRoutes);
app.use("/api/auditoria", auditoriaRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

// Entrega os arquivos estaticos do frontend e abre o index.html na rota principal
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Middleware de erro para capturar falhas internas sem derrubar o servidor
app.use((err, req, res, next) => {
  console.error("Erro na aplicação:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    message: "Ocorreu um erro interno. Tente novamente."
  });
});


let server;

// Conecta ao banco de dados primeiro e so depois inicia o servidor na porta configurada
try {
  await connectDatabase();

  server = app.listen(PORT, () => {
    console.log(`AgroRecursos disponível em http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("Falha ao iniciar:", error.message);
  await closeDatabase();
  process.exitCode = 1;
}

// Encerra o servidor HTTP e a conexao com o MongoDB de forma limpa ao desligar o sistema
async function shutdown() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await closeDatabase();
  process.exit();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

