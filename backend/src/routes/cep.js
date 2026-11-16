import { Router } from "express";

const router = Router();
const cache = new Map();

// Consulta o ViaCEP pelo servidor (o navegador não pode chamar sites externos por causa da CSP do helmet).
router.get("/:cep", async (req, res) => {
  const cep = String(req.params.cep ?? "").replace(/\D/g, "");
  if (cep.length !== 8) return res.status(400).json({ message: "Informe um CEP válido com 8 dígitos." });

  if (cache.has(cep)) return res.json(cache.get(cep));

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(5000) });
    if (!resposta.ok) throw new Error(`ViaCEP respondeu ${resposta.status}`);
    const dados = await resposta.json();
    if (dados.erro) return res.status(404).json({ message: "CEP não encontrado." });

    const endereco = {
      cep,
      rua: dados.logradouro || "",
      complemento: dados.complemento || "",
      bairro: dados.bairro || "",
      cidade: dados.localidade || "",
      estado: dados.uf || ""
    };
    if (cache.size > 500) cache.clear();
    cache.set(cep, endereco);
    return res.json(endereco);
  } catch (erro) {
    console.error("Falha ao consultar o ViaCEP:", erro.message);
    return res.status(502).json({ message: "Não foi possível consultar o CEP agora. Preencha o endereço manualmente." });
  }
});

export default router;
