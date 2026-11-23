// Tom RA: 25015528
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getDatabase } from "../config/database.js";
import { credenciaisValidas, resumirVendas } from "../utils/admin.js";
import { texto } from "../utils/validacao.js";

const router = Router();

// Poucas tentativas de login por IP para dificultar adivinhar a senha
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Muitas tentativas. Aguarde alguns minutos." }
});

// Libera a rota apenas para quem entrou pela tela /admin (sessão separada do login de produtor e fornecedor)
function exigirAdmin(req, res, next) {
  if (req.session?.admin === true) return next();
  return res.status(401).json({ message: "Acesso restrito ao administrador." });
}

router.post("/login", limitadorLogin, (req, res) => {
  const usuario = texto(req.body?.usuario, 60);
  const senha = texto(req.body?.senha, 100);
  if (!credenciaisValidas(usuario, senha)) {
    return res.status(401).json({ message: "Usuário ou senha incorretos." });
  }
  req.session.admin = true;
  req.session.save(erro => {
    if (erro) return res.status(500).json({ message: "Não foi possível iniciar a sessão." });
    res.json({ message: "Bem-vindo, administrador." });
  });
});

router.post("/logout", (req, res) => {
  delete req.session.admin;
  req.session.save(() => res.json({ message: "Sessão encerrada." }));
});

router.get("/sessao", (req, res) => {
  res.json({ autenticado: req.session?.admin === true });
});

router.get("/resumo", exigirAdmin, async (req, res, next) => {
  try {
    const db = getDatabase();
    const pedidos = await db.collection("pedidos")
      .find({}, { projection: { numero: 1, status: 1, subtotal: 1, "frete.valor": 1, total: 1, criadoEm: 1, "itens.fornecedorId": 1, "itens.subtotal": 1 } })
      .toArray();
    const fornecedores = await db.collection("fornecedores")
      .find({}, { projection: { nomeFantasia: 1, nome: 1 } })
      .toArray();
    const nomes = new Map(fornecedores.map(f => [String(f._id), f.nomeFantasia || f.nome]));
    res.json(resumirVendas(pedidos, nomes));
  } catch (error) {
    next(error);
  }
});

export default router;
