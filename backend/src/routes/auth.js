
import { Router } from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/database.js";

const router = Router();

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

// Cadastro básico
router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");
    const accountType = req.body.accountType;

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        message: "Informe um nome entre 2 e 100 caracteres."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({
        message: "Informe um e-mail válido."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: "A senha deve ter entre 8 e 72 caracteres."
      });
    }

    if (!["produtor", "fornecedor"].includes(accountType)) {
      return res.status(400).json({
        message: "Selecione produtor rural ou fornecedor."
      });
    }

    const db = getDatabase();
    const users = db.collection("users");
    const profiles = db.collection("profiles");

    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "Não foi possível criar a conta com esse e-mail."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = new ObjectId();
    const now = new Date();

    try {
      await users.insertOne({
        _id: userId,
        email,
        passwordHash,
        status: "active",
        emailVerified: false,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "Não foi possível criar a conta com esse e-mail."
        });
      }

      throw error;
    }

    try {
      await profiles.insertOne({
        userId,
        name,
        accountType,
        phone: null,
        document: null,
        registrationStatus: "basic",
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      await users.deleteOne({ _id: userId });
      throw error;
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) return next(sessionError);

      req.session.userId = userId.toString();

      req.session.save((saveError) => {
        if (saveError) return next(saveError);

        return res.status(201).json({
          message: "Conta criada com sucesso!",
          user: {
            id: userId.toString(),
            name,
            email,
            accountType
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");

    if (!email || !password || password.length > 72) {
      return res.status(400).json({
        message: "Informe e-mail e senha válidos."
      });
    }

    const db = getDatabase();

    const user = await db.collection("users").findOne({ email });

    if (
      !user ||
      user.status !== "active" ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        message: "E-mail ou senha incorretos."
      });
    }

    const profile = await db.collection("profiles").findOne({
      userId: user._id
    });

    if (!profile) {
      return res.status(500).json({
        message: "Não foi possível carregar seu perfil."
      });
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) return next(sessionError);

      req.session.userId = user._id.toString();

      req.session.save((saveError) => {
        if (saveError) return next(saveError);

        return res.json({
          message: "Login realizado com sucesso!",
          user: {
            id: user._id.toString(),
            name: profile.name,
            email: user.email,
            accountType: profile.accountType
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

// Consultar sessão atual
router.get("/me", async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Você não está autenticado."
      });
    }

    const db = getDatabase();
    const userId = new ObjectId(req.session.userId);

    const user = await db.collection("users").findOne(
      { _id: userId },
      { projection: { passwordHash: 0 } }
    );

    const profile = await db.collection("profiles").findOne({
      userId
    });

    if (!user || !profile || user.status !== "active") {
      return res.status(401).json({
        message: "Sessão inválida. Entre novamente."
      });
    }

    return res.json({
      user: {
        id: user._id.toString(),
        name: profile.name,
        email: user.email,
        accountType: profile.accountType,
        registrationStatus: profile.registrationStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("agrorecursos.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    return res.json({
      message: "Você saiu da sua conta."
    });
  });
});

export default router;
