
import "dotenv/config";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/auth.js";

import {
  connectDatabase,
  closeDatabase
} from "./config/database.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, "../../frontend");

if (!process.env.SESSION_SECRET) {
  throw new Error("Configure SESSION_SECRET no arquivo .env.");
}

if (!process.env.MONGODB_URI) {
  throw new Error("Configure MONGODB_URI no arquivo .env.");
}

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

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

app.use("/api/auth", authLimiter);
app.use("/api/auth", authRoutes);

app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

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

async function shutdown() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await closeDatabase();
  process.exit();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

