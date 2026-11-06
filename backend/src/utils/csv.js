export function lerCsv(texto) {
  const t = String(texto ?? "").replace(/^﻿/, "");
  const primeira = t.split(/\r?\n/, 1)[0] ?? "";
  const separador = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ";" : ",";

  const linhas = [];
  let campo = "";
  let linha = [];
  let aspas = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          aspas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      aspas = true;
    } else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo);
      campo = "";
      linhas.push(linha);
      linha = [];
    } else {
      campo += c;
    }
  }

  if (campo !== "" || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }

  const uteis = linhas.filter(l => l.some(c => c.trim() !== ""));
  if (uteis.length < 2) return [];

  const cabecalho = uteis[0].map(h => h.trim());
  return uteis.slice(1).map((l, i) => ({
    linha: i + 2,
    valores: Object.fromEntries(cabecalho.map((h, k) => [h, (l[k] ?? "").trim()]))
  }));
}

export function gerarCsv(cabecalho, linhas) {
  const escapar = valor => {
    const s = valor === null || valor === undefined ? "" : String(valor);
    const seguro = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? "'" + s : s;
    return /[";\r\n]/.test(seguro) ? '"' + seguro.replace(/"/g, '""') + '"' : seguro;
  };
  return "﻿" + [cabecalho, ...linhas].map(l => l.map(escapar).join(";")).join("\r\n") + "\r\n";
}
