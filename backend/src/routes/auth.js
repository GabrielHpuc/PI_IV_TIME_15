import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";
import { auditar } from "../utils/auditoria.js";
import { CATEGORIAS, validarCpfCnpj } from "../utils/validacao.js";

const router = Router();
const normalizeEmail = email => String(email ?? "").trim().toLowerCase();
const cleanString = (value, max = 120) => String(value ?? "").trim().slice(0, max);
const digitsOnly = value => String(value ?? "").replace(/\D/g, "");

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");
    const accountType = req.body.accountType;
    const document = digitsOnly(req.body.document);
    const phone = cleanString(req.body.phone, 20);
    const companyName = cleanString(req.body.companyName, 120);
    const tradeName = cleanString(req.body.tradeName, 120);
    const stateRegistration = cleanString(req.body.stateRegistration, 20);
    const categories = Array.isArray(req.body.categories) ? [...new Set(req.body.categories.filter(c => CATEGORIAS.includes(c)))] : [];
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: "Informe um nome entre 2 e 100 caracteres." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ message: "Informe um e-mail válido." });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ message: "A senha deve ter entre 8 e 72 caracteres." });
    if (!["produtor", "fornecedor"].includes(accountType)) return res.status(400).json({ message: "Selecione produtor rural ou fornecedor." });
    if (document && !validarCpfCnpj(document)) return res.status(400).json({ message: "Informe um CPF ou CNPJ válido." });
    if (accountType === "fornecedor" && document.length !== 14) return res.status(400).json({ message: "Fornecedores devem informar um CNPJ válido." });
    if (phone && (digitsOnly(phone).length < 10 || digitsOnly(phone).length > 13)) return res.status(400).json({ message: "Informe um telefone válido com DDD." });

    const db = getDatabase(), users = db.collection("users"), profiles = db.collection("profiles");
    if (document && await profiles.findOne({ document })) return res.status(409).json({ message: "Não foi possível criar a conta com esses dados." });
    if (await users.findOne({ email })) return res.status(409).json({ message: "Não foi possível criar a conta com esse e-mail." });
    const passwordHash = await bcrypt.hash(password, 12), userId = new ObjectId(), now = new Date();
    try {
      await users.insertOne({ _id: userId, email, passwordHash, status: "active", emailVerified: false, createdAt: now, updatedAt: now });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: "Não foi possível criar a conta com esse e-mail." });
      throw error;
    }
    try {
      await profiles.insertOne({ userId, name, accountType, phone: phone || null, document: document || null,
        companyName: companyName || null, tradeName: tradeName || null, stateRegistration: stateRegistration || null, categories,
        address: { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
        registrationStatus: "basic", createdAt: now, updatedAt: now });
      if (accountType === "fornecedor") {
        await db.collection("fornecedores").insertOne({
          userId, nome: companyName || name, nomeFantasia: tradeName || companyName || name,
          avaliacao: 0, totalAvaliacoes: 0, criadoEm: now
        });
      }
    } catch (error) {
      await profiles.deleteOne({ userId });
      await users.deleteOne({ _id: userId });
      throw error;
    }

    req.session.regenerate(sessionError => {
      if (sessionError) return next(sessionError);
      req.session.userId = userId.toString();
      req.session.save(async saveError => {
        if (saveError) return next(saveError);
        await auditar(req, { acao: "conta.criada", entidade: "usuario", entidadeId: userId, userId, detalhes: { tipo: accountType } });
        return res.status(201).json({ message: "Conta criada com sucesso!", user: { id: userId.toString(), name, email, accountType } });
      });
    });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const identificador = String(req.body.login ?? req.body.email ?? "").trim(), password = String(req.body.password ?? "");
    if (!identificador || identificador.length > 254 || !password || password.length > 72) return res.status(400).json({ message: "Informe CNPJ/CPF ou e-mail e a senha." });
    const db = getDatabase();
    let user = null;
    if (identificador.includes("@")) {
      user = await db.collection("users").findOne({ email: normalizeEmail(identificador) });
    } else {
      const doc = digitsOnly(identificador);
      const perfil = [11, 14].includes(doc.length) ? await db.collection("profiles").findOne({ document: doc }) : null;
      if (perfil) user = await db.collection("users").findOne({ _id: perfil.userId });
    }
    if (!user || user.status !== "active" || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "E-mail ou senha incorretos." });
    const profile = await db.collection("profiles").findOne({ userId: user._id });
    if (!profile) return res.status(500).json({ message: "Não foi possível carregar seu perfil." });
    req.session.regenerate(sessionError => {
      if (sessionError) return next(sessionError);
      req.session.userId = user._id.toString();
      req.session.save(async saveError => {
        if (saveError) return next(saveError);
        await auditar(req, { acao: "login", entidade: "usuario", entidadeId: user._id, userId: user._id });
        return res.json({ message: "Login realizado com sucesso!", user: { id: user._id.toString(), name: profile.name, email: user.email, accountType: profile.accountType } });
      });
    });
  } catch (error) { next(error); }
});

router.get("/me", async (req, res, next) => {
  try {
    if (!req.session.userId || !ObjectId.isValid(req.session.userId)) return res.status(401).json({ message: "Você não está autenticado." });
    const db = getDatabase(), userId = new ObjectId(req.session.userId);
    const user = await db.collection("users").findOne({ _id: userId }, { projection: { passwordHash: 0 } });
    const profile = await db.collection("profiles").findOne({ userId });
    if (!user || !profile || user.status !== "active") return res.status(401).json({ message: "Sessão inválida. Entre novamente." });
    return res.json({ user: {
      id: user._id.toString(), name: profile.name, email: user.email, accountType: profile.accountType,
      registrationStatus: profile.registrationStatus || "basic", phone: profile.phone || "",
      document: profile.document || "", address: profile.address || {}
    }});
  } catch (error) { next(error); }
});

router.put("/profile", async (req, res, next) => {
  try {
    if (!req.session.userId || !ObjectId.isValid(req.session.userId)) return res.status(401).json({ message: "Faça login para atualizar seu perfil." });
    const name = String(req.body.name ?? "").trim(), email = normalizeEmail(req.body.email);
    const phone = cleanString(req.body.phone, 20), document = digitsOnly(req.body.document);
    const input = req.body.address && typeof req.body.address === "object" ? req.body.address : {};
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: "O nome deve ter entre 2 e 100 caracteres." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ message: "Informe um e-mail válido." });
    if (phone && (digitsOnly(phone).length < 10 || digitsOnly(phone).length > 13)) return res.status(400).json({ message: "Informe um telefone válido com DDD." });
    if (document && !validarCpfCnpj(document)) return res.status(400).json({ message: "Informe um CPF ou CNPJ válido." });
    const address = {
      cep: digitsOnly(input.cep).slice(0, 8), street: cleanString(input.street, 120),
      number: cleanString(input.number, 20), complement: cleanString(input.complement, 80),
      neighborhood: cleanString(input.neighborhood, 80), city: cleanString(input.city, 80),
      state: cleanString(input.state, 2).toUpperCase()
    };
    if (address.cep && address.cep.length !== 8) return res.status(400).json({ message: "O CEP deve conter 8 dígitos." });
    if (address.state && !/^[A-Z]{2}$/.test(address.state)) return res.status(400).json({ message: "Selecione uma UF válida." });

    const db = getDatabase(), userId = new ObjectId(req.session.userId);
    const users = db.collection("users"), profiles = db.collection("profiles");
    const currentUser = await users.findOne({ _id: userId });
    if (!currentUser || currentUser.status !== "active") return res.status(401).json({ message: "Conta não encontrada ou inativa." });
    if (await users.findOne({ email, _id: { $ne: userId } })) return res.status(409).json({ message: "Este e-mail já está sendo utilizado." });
    const oldProfile = await profiles.findOne({ userId });
    if (!oldProfile) return res.status(404).json({ message: "Perfil não encontrado." });

    const complete = Boolean(phone && [11, 14].includes(document.length) &&
      address.cep && address.street && address.number && address.neighborhood && address.city && address.state);
    const now = new Date();
    await profiles.updateOne({ userId }, { $set: {
      name, phone: phone || null, document: document || null, address,
      registrationStatus: complete ? "complete" : "basic", updatedAt: now
    }});
    try {
      await users.updateOne({ _id: userId }, { $set: { email, updatedAt: now } });
    } catch (error) {
      await profiles.updateOne({ userId }, { $set: {
        name: oldProfile.name, phone: oldProfile.phone ?? null, document: oldProfile.document ?? null,
        address: oldProfile.address ?? {}, registrationStatus: oldProfile.registrationStatus ?? "basic", updatedAt: new Date()
      }});
      throw error;
    }
    const saved = await profiles.findOne({ userId });
    return res.json({ message: "Perfil atualizado com sucesso.", user: {
      id: userId.toString(), name: saved.name, email, accountType: saved.accountType,
      registrationStatus: saved.registrationStatus, phone: saved.phone || "",
      document: saved.document || "", address: saved.address || {}
    }});
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "E-mail ou documento já está sendo utilizado." });
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const resposta = { message: "Se o e-mail estiver cadastrado, enviaremos um link de recuperação." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.json(resposta);

    const db = getDatabase(), user = await db.collection("users").findOne({ email });
    if (user && user.status === "active") {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await db.collection("password_resets").deleteMany({ userId: user._id });
      await db.collection("password_resets").insertOne({
        userId: user._id, tokenHash, createdAt: new Date(), expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });
      const base = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      console.log(`Link de recuperação para ${email}: ${base}/redefinir-senha.html?token=${token}`);
    }
    return res.json(resposta);
  } catch (error) { next(error); }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const token = String(req.body.token ?? ""), password = String(req.body.password ?? "");
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: "Link inválido ou expirado." });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ message: "A senha deve ter entre 8 e 72 caracteres." });

    const db = getDatabase();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const registro = await db.collection("password_resets").findOneAndDelete({ tokenHash, expiresAt: { $gt: new Date() } });
    if (!registro) return res.status(400).json({ message: "Link inválido ou expirado." });

    const passwordHash = await bcrypt.hash(password, 12);
    await db.collection("users").updateOne({ _id: registro.userId }, { $set: { passwordHash, updatedAt: new Date() } });
    await db.collection("sessions").deleteMany({ session: { $regex: registro.userId.toString() } });
    await auditar(req, { acao: "senha.redefinida", entidade: "usuario", entidadeId: registro.userId, userId: registro.userId });
    return res.json({ message: "Senha redefinida com sucesso. Entre com a nova senha." });
  } catch (error) { next(error); }
});

router.delete("/account", async (req, res, next) => {
  try {
    if (!req.session.userId || !ObjectId.isValid(req.session.userId)) return res.status(401).json({ message: "Faça login para continuar." });
    const password = String(req.body.password ?? "");
    const db = getDatabase(), userId = new ObjectId(req.session.userId);
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user || user.status !== "active" || !password || password.length > 72 || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    const emAndamento = await db.collection("pedidos").findOne({ userId, status: { $in: ["aguardando_pagamento", "em_analise", "pago", "enviado"] } }, { projection: { _id: 1 } });
    if (emAndamento) return res.status(409).json({ message: "Você tem pedidos em andamento. Conclua ou cancele antes de encerrar a conta." });

    await db.collection("users").updateOne({ _id: userId }, { $set: { status: "inactive", updatedAt: new Date() } });
    await auditar(req, { acao: "conta.encerrada", entidade: "usuario", entidadeId: userId, userId });
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie("agrorecursos.sid", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
      return res.json({ message: "Conta encerrada." });
    });
  } catch (error) { next(error); }
});

router.post("/logout", async (req, res, next) => {
  await auditar(req, { acao: "logout" });
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie("agrorecursos.sid", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    return res.json({ message: "Você saiu da sua conta." });
  });
});

export default router;
