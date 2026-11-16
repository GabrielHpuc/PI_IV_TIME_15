const escapar = valor => String(valor).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function gerarPdf(linhas) {
  let y = 790;
  let conteudo = "BT\n";
  for (const { texto, tamanho = 11, negrito = false } of linhas) {
    conteudo += `/${negrito ? "F2" : "F1"} ${tamanho} Tf 1 0 0 1 56 ${y} Tm (${escapar(texto)}) Tj\n`;
    y -= tamanho + 10;
  }
  conteudo += "ET";

  const fluxo = Buffer.from(conteudo, "latin1");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  ];

  const partes = [Buffer.from("%PDF-1.4\n", "latin1")];
  const posicoes = [];
  let posicao = partes[0].length;

  const adicionar = (numero, corpo) => {
    posicoes.push(posicao);
    const bloco = Buffer.concat([
      Buffer.from(`${numero} 0 obj\n`, "latin1"),
      corpo,
      Buffer.from("\nendobj\n", "latin1")
    ]);
    partes.push(bloco);
    posicao += bloco.length;
  };

  objetos.forEach((objeto, indice) => adicionar(indice + 1, Buffer.from(objeto, "latin1")));
  adicionar(6, Buffer.concat([
    Buffer.from(`<< /Length ${fluxo.length} >>\nstream\n`, "latin1"),
    fluxo,
    Buffer.from("\nendstream", "latin1")
  ]));

  let xref = "xref\n0 7\n0000000000 65535 f \n";
  xref += posicoes.map(p => String(p).padStart(10, "0") + " 00000 n \n").join("");
  xref += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${posicao}\n%%EOF`;
  partes.push(Buffer.from(xref, "latin1"));

  return Buffer.concat(partes);
}
