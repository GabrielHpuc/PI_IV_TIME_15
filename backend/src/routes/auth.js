import { Router } from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";

const router = Router();
const normalizeEmail = email => String(email ?? "").trim().toLowerCase();
const cleanString = (value, max = 120) => String(value ?? "").trim().slice(0, max);
const digitsOnly = value => String(value ?? "").replace(/\\D/g, "");

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");
    const accountType = req.body.accountType;
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: "Informe um nome entre 2 e 100 caracteres." });
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ message: "Informe um e-mail válido." });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ message: "A senha deve ter entre 8 e 72 caracteres." });
    if (!["produtor", "fornecedor"].includes(accountType)) return res.status(400).json({ message: "Selecione produtor rural ou fornecedor." });

    const db = getDatabase(), users = db.collection("users"), profiles = db.collection("profiles");
    if (await users.findOne({ email })) return res.status(409).json({ message: "Não foi possível criar a conta com esse e-mail." });
    const passwordHash = await bcrypt.hash(password, 12), userId = new ObjectId(), now = new Date();
    try {
      await users.insertOne({ _id: userId, email, passwordHash, status: "active", emailVerified: false, createdAt: now, updatedAt: now });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: "Não foi possível criar a conta com esse e-mail." });
      throw error;
    }
    try {
      await profiles.insertOne({ userId, name, accountType, phone: null, document: null,
        address: { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
        registrationStatus: "basic", createdAt: now, updatedAt: now });
    } catch (error) { await users.deleteOne({ _id: userId }); throw error; }

    req.session.regenerate(sessionError => {
      if (sessionError) return next(sessionError);
      req.session.userId = userId.toString();
      req.session.save(saveError => {
        if (saveError) return next(saveError);
        return res.status(201).json({ message: "Conta criada com sucesso!", user: { id: userId.toString(), name, email, accountType } });
      });
    });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email), password = String(req.body.password ?? "");
    if (!email || !password || password.length > 72) return res.status(400).json({ message: "Informe e-mail e senha válidos." });
    const db = getDatabase(), user = await db.collection("users").findOne({ email });
    if (!user || user.status !== "active" || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "E-mail ou senha incorretos." });
    const profile = await db.collection("profiles").findOne({ userId: user._id });
    if (!profile) return res.status(500).json({ message: "Não foi possível carregar seu perfil." });
    req.session.regenerate(sessionError => {
      if (sessionError) return next(sessionError);
      req.session.userId = user._id.toString();
      req.session.save(saveError => {
        if (saveError) return next(saveError);
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
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ message: "Informe um e-mail válido." });
    if (phone && (digitsOnly(phone).length < 10 || digitsOnly(phone).length > 13)) return res.status(400).json({ message: "Informe um telefone válido com DDD." });
    if (document && ![11, 14].includes(document.length)) return res.status(400).json({ message: "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos." });
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
    if (error.code === 11000) return res.status(409).json({ message: "Este e-mail já está sendo utilizado." });
    next(error);
  }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie("agrorecursos.sid", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    return res.json({ message: "Você saiu da sua conta." });
  });
});

export default router;
