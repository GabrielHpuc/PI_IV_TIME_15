window.AgroDados = {
  produtos: [
    { id: 1, nome: "Semente Soja RR Super 40kg", categoria: "Sementes", marca: "Monsanto", regiao: "Centro-Oeste", preco: 180, entrega: 3, laudo: true, cultura: "Soja", tecnologia: "RR Super", embalagem: "Saco: 40kg", germinacao: 92, vigor: 88, pureza: 99.5, vencimento: "06/2026", vendidos: 120, condicao: "Novo" },
    { id: 2, nome: "Semente Soja RR Light 40kg", categoria: "Sementes", marca: "Bayer", regiao: "Sul", preco: 172, entrega: 4, laudo: false, cultura: "Soja", tecnologia: "RR Light", embalagem: "Saco: 40kg", germinacao: 90, vigor: 85, pureza: 99.2, vencimento: "08/2026", vendidos: 64, condicao: "Novo" },
    { id: 3, nome: "Semente Soja RR Sun 40kg", categoria: "Sementes", marca: "Syngenta", regiao: "Sudeste", preco: 195, entrega: 2, laudo: true, cultura: "Soja", tecnologia: "RR Sun", embalagem: "Saco: 40kg", germinacao: 94, vigor: 90, pureza: 99.7, vencimento: "09/2026", vendidos: 88, condicao: "Novo" },
    { id: 4, nome: "Milho Híbrido KWS", categoria: "Sementes", marca: "KWS", regiao: "Sudeste", preco: 220, entrega: 3, laudo: false, cultura: "Milho", tecnologia: "Híbrido", embalagem: "Saco: 20kg", germinacao: 95, vigor: 91, pureza: 99.8, vencimento: "10/2026", vendidos: 210, condicao: "Novo" },
    { id: 5, nome: "Semente Soja RR 40kg", categoria: "Sementes", marca: "Monsanto", regiao: "Nordeste", preco: 168, entrega: 6, laudo: false, cultura: "Soja", tecnologia: "RR", embalagem: "Saco: 40kg", germinacao: 89, vigor: 84, pureza: 99, vencimento: "07/2026", vendidos: 41, condicao: "Novo" },
    { id: 6, nome: "Semente Soja RR Super 40kg Premium", categoria: "Sementes", marca: "KWS", regiao: "Centro-Oeste", preco: 189, entrega: 3, laudo: true, cultura: "Soja", tecnologia: "RR Super", embalagem: "Saco: 40kg", germinacao: 93, vigor: 89, pureza: 99.6, vencimento: "11/2026", vendidos: 97, condicao: "Novo" },
    { id: 7, nome: "Adubo NPK 10-10-10 (Ton)", categoria: "Fertilizantes", marca: "Bayer", regiao: "Sudeste", preco: 2500, entrega: 4, laudo: false, cultura: "Diversas", tecnologia: "NPK 10-10-10", embalagem: "A granel: 1 tonelada", germinacao: 0, vigor: 0, pureza: 0, vencimento: "12/2027", vendidos: 56, condicao: "Novo" },
    { id: 8, nome: "Fertilizante Ureia 45% (Ton)", categoria: "Fertilizantes", marca: "Monsanto", regiao: "Sul", preco: 3100, entrega: 5, laudo: true, cultura: "Diversas", tecnologia: "Ureia 45% N", embalagem: "A granel: 1 tonelada", germinacao: 0, vigor: 0, pureza: 0, vencimento: "12/2027", vendidos: 33, condicao: "Novo" },
    { id: 9, nome: "Fertilizante MAP (Ton)", categoria: "Fertilizantes", marca: "Syngenta", regiao: "Centro-Oeste", preco: 4200, entrega: 6, laudo: true, cultura: "Diversas", tecnologia: "MAP 11-52-00", embalagem: "A granel: 1 tonelada", germinacao: 0, vigor: 0, pureza: 0, vencimento: "01/2028", vendidos: 28, condicao: "Novo" },
    { id: 10, nome: "Herbicida Glifosato (20L)", categoria: "Defensivos", marca: "Bayer", regiao: "Sudeste", preco: 350, entrega: 2, laudo: true, cultura: "Soja, Milho", tecnologia: "Glifosato", embalagem: "Galão: 20L", germinacao: 0, vigor: 0, pureza: 0, vencimento: "03/2027", vendidos: 142, condicao: "Novo" },
    { id: 11, nome: "Herbicida Seletivo (20L)", categoria: "Defensivos", marca: "Syngenta", regiao: "Sul", preco: 410, entrega: 3, laudo: false, cultura: "Milho", tecnologia: "Seletivo", embalagem: "Galão: 20L", germinacao: 0, vigor: 0, pureza: 0, vencimento: "04/2027", vendidos: 75, condicao: "Novo" },
    { id: 12, nome: "Trator MF 4290 (Usado 2018)", categoria: "Outros", marca: "Monsanto", regiao: "Centro-Oeste", preco: 210000, entrega: 10, laudo: false, cultura: "Diversas", tecnologia: "Tração 4x4", embalagem: "Unidade", germinacao: 0, vigor: 0, pureza: 0, vencimento: "—", vendidos: 1, condicao: "Usado" }
  ],
  cotacoes: [
    {
      id: "CR00123", item: "Sementes de Soja RR Super 40kg", quantidade: "200 Sacos", criacao: "12/05/2026", vencimento: "15/05/2026", status: "analise",
      propostas: [
        { fornecedor: "Fornecedor A (AgroVant)", preco: 36000, laudo: true, prazo: 3, avaliacao: 4.5 },
        { fornecedor: "Fornecedor B (CampoLimpo)", preco: 37400, laudo: true, prazo: 4, avaliacao: 4 },
        { fornecedor: "Fornecedor C (Sementes Brasil)", preco: 36800, laudo: false, prazo: 5, avaliacao: 3.5 },
        { fornecedor: "Fornecedor D (Safra Forte)", preco: 38200, laudo: true, prazo: 2, avaliacao: 5 },
        { fornecedor: "Fornecedor E (Terra Viva)", preco: 37900, laudo: true, prazo: 6, avaliacao: 4 }
      ]
    },
    {
      id: "CR00456", item: "Fertilizante Adubo NPK 10-10-10 (Ton)", quantidade: "10 Tons", criacao: "11/05/2026", vencimento: "14/05/2026", status: "aguardando",
      propostas: [
        { fornecedor: "Fornecedor A (AgroVant)", preco: 25000, laudo: true, prazo: 4, avaliacao: 4.5 }
      ]
    },
    {
      id: "CR00137", item: "Fertilizante Ureia 45% (Ton)", quantidade: "5 Tons", criacao: "10/05/2026", vencimento: "13/05/2026", status: "aguardando",
      propostas: [
        { fornecedor: "Fornecedor B (CampoLimpo)", preco: 15500, laudo: true, prazo: 5, avaliacao: 4 }
      ]
    }
  ]
};
