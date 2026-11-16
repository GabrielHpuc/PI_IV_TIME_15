import { Router } from "express";
import { calcularFrete } from "../utils/frete.js";

const router = Router();

router.get("/", (req, res) => {
  const frete = calcularFrete(req.query.cep);
  if (!frete) return res.status(400).json({ message: "Informe um CEP válido com 8 dígitos." });
  return res.json(frete);
});

export default router;
