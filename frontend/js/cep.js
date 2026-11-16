(function () {
  // Consulta de CEP (preenche o endereço) e previsão de entrega em dias úteis, no estilo dos marketplaces.

  async function buscar(cep) {
    const digitos = String(cep || "").replace(/\D/g, "");
    if (digitos.length !== 8) {
      throw new Error("Informe um CEP válido com 8 dígitos.");
    }
    let resposta;
    try {
      resposta = await fetch("/api/cep/" + digitos, { credentials: "same-origin" });
    } catch (erro) {
      throw new Error("Não foi possível conectar ao servidor.");
    }
    const dados = await resposta.json().catch(function () { return {}; });
    if (!resposta.ok) {
      throw new Error(dados.message || "Não foi possível consultar o CEP.");
    }
    return dados;
  }

  function somarDiasUteis(dias) {
    const data = new Date();
    let restantes = Math.max(0, Math.round(dias));
    while (restantes > 0) {
      data.setDate(data.getDate() + 1);
      const dia = data.getDay();
      if (dia !== 0 && dia !== 6) {
        restantes -= 1;
      }
    }
    return data;
  }

  function formatarData(data) {
    return data.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");
  }

  // "Chegará entre ter, 25/11 e qui, 27/11" (prazo mínimo e mais 2 dias úteis de margem)
  function previsao(diasUteis) {
    return "Chegará entre " + formatarData(somarDiasUteis(diasUteis)) + " e " + formatarData(somarDiasUteis(diasUteis + 2));
  }

  // Quando o CEP completa 8 dígitos, busca o endereço e chama aoPreencher(endereco).
  // aoMensagem(texto, ok) é opcional e recebe o estado da consulta.
  function aoCompletar(campoCep, aoPreencher, aoMensagem) {
    let ultimo = "";
    campoCep.addEventListener("input", async function () {
      const digitos = campoCep.value.replace(/\D/g, "");
      if (digitos.length !== 8) {
        ultimo = "";
        return;
      }
      if (digitos === ultimo) {
        return;
      }
      ultimo = digitos;
      if (aoMensagem) {
        aoMensagem("Buscando endereço...", true);
      }
      try {
        const endereco = await buscar(digitos);
        if (ultimo !== digitos) {
          return;
        }
        aoPreencher(endereco);
        if (aoMensagem) {
          aoMensagem("", true);
        }
      } catch (erro) {
        if (ultimo === digitos && aoMensagem) {
          aoMensagem(erro.message, false);
        }
      }
    });
  }

  window.AgroCep = { buscar: buscar, previsao: previsao, aoCompletar: aoCompletar, diasUteis: somarDiasUteis };
})();
