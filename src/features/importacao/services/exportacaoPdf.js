import { formatarData, rotuloMes } from '../../../shared/utils/datas.js';

const LARGURA_PAGINA = 595.28;
const ALTURA_PAGINA = 841.89;
const MARGEM = 50;
const ALTURA_LINHA = 26;
const COLUNAS = [
  { titulo: 'Data', largura: 135 },
  { titulo: 'Atendente 1', largura: 180 },
  { titulo: 'Atendente 2', largura: 180.28 },
];

// Caracteres fora do Latin-1 que existem na codificação WinAnsi das fontes padrão do PDF.
const WIN_ANSI_EXTRAS = { '—': 0x97, '–': 0x96, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '…': 0x85 };

const numero = (valor) => Number(valor.toFixed(2)).toString();

function paraWinAnsi(texto) {
  return Array.from(String(texto ?? '').normalize('NFC'), (caractere) => {
    const codigo = caractere.codePointAt(0);
    if (codigo < 256) return caractere;
    return String.fromCharCode(WIN_ANSI_EXTRAS[caractere] ?? 0x3f);
  }).join('');
}

const escaparTexto = (texto) => paraWinAnsi(texto).replace(/[\\()]/g, (caractere) => `\\${caractere}`);

function truncar(texto, largura, tamanhoFonte) {
  const limite = Math.floor(largura / (tamanhoFonte * 0.52));
  return texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto;
}

const texto = (conteudo, x, y, { fonte = 'F1', tamanho = 11, cor = '0.13 0.13 0.15' } = {}) =>
  `BT /${fonte} ${tamanho} Tf ${cor} rg ${numero(x)} ${numero(y)} Td (${escaparTexto(conteudo)}) Tj ET`;

const retangulo = (x, y, largura, altura, cor) =>
  `${cor} rg ${numero(x)} ${numero(y)} ${numero(largura)} ${numero(altura)} re f`;

function desenharTabela(linhas, topo) {
  const larguraTabela = COLUNAS.reduce((total, coluna) => total + coluna.largura, 0);
  const comandos = [];

  const desenharLinha = (valores, y, { cabecalho = false, zebra = false } = {}) => {
    if (cabecalho) comandos.push(retangulo(MARGEM, y, larguraTabela, ALTURA_LINHA, '0.16 0.18 0.24'));
    else if (zebra) comandos.push(retangulo(MARGEM, y, larguraTabela, ALTURA_LINHA, '0.96 0.96 0.97'));
    let x = MARGEM;
    valores.forEach((valor, indice) => {
      const { largura } = COLUNAS[indice];
      comandos.push(
        texto(truncar(valor || '—', largura - 16, 11), x + 8, y + 9, {
          fonte: cabecalho ? 'F2' : 'F1',
          cor: cabecalho ? '1 1 1' : '0.13 0.13 0.15',
        }),
      );
      x += largura;
    });
  };

  let y = topo - ALTURA_LINHA;
  desenharLinha(
    COLUNAS.map((coluna) => coluna.titulo),
    y,
    { cabecalho: true },
  );
  linhas.forEach((valores, indice) => {
    y -= ALTURA_LINHA;
    desenharLinha(valores, y, { zebra: indice % 2 === 1 });
  });

  // Bordas: contorno e divisões entre linhas e colunas.
  comandos.push('0.82 0.83 0.86 RG 0.6 w');
  comandos.push(`${numero(MARGEM)} ${numero(y)} ${numero(larguraTabela)} ${numero(topo - y)} re S`);
  for (let linha = 1; linha <= linhas.length; linha++) {
    const yLinha = topo - ALTURA_LINHA * linha;
    comandos.push(`${numero(MARGEM)} ${numero(yLinha)} m ${numero(MARGEM + larguraTabela)} ${numero(yLinha)} l S`);
  }
  let x = MARGEM;
  COLUNAS.slice(0, -1).forEach(({ largura }) => {
    x += largura;
    comandos.push(`${numero(x)} ${numero(y)} m ${numero(x)} ${numero(topo)} l S`);
  });

  return comandos;
}

function montarPdf(conteudo) {
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${numero(LARGURA_PAGINA)} ${numero(ALTURA_PAGINA)}] ` +
      '/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const posicoes = objetos.map((objeto, indice) => {
    const posicao = pdf.length;
    pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
    return posicao;
  });
  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += posicoes.map((posicao) => `${String(posicao).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;

  return Uint8Array.from(pdf, (caractere) => caractere.charCodeAt(0) & 0xff);
}

function baixarArquivo(bytes, nomeArquivo) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function gerarPdfEscala(escala, atendentes) {
  const nomeDe = (id) => atendentes.find((atendente) => atendente.id === id)?.nome ?? '';
  const linhas = escala.sabados.map((sabado) => [
    formatarData(sabado.data),
    nomeDe(sabado.atendentes[0]),
    nomeDe(sabado.atendentes[1]),
  ]);
  const mes = rotuloMes(escala.mes);
  const topo = ALTURA_PAGINA - MARGEM;

  const comandos = [
    texto('Escala de sábados', MARGEM, topo - 20, { fonte: 'F2', tamanho: 20 }),
    texto(mes.charAt(0).toUpperCase() + mes.slice(1), MARGEM, topo - 42, { tamanho: 12, cor: '0.4 0.42 0.47' }),
    ...desenharTabela(linhas, topo - 66),
    texto(`Gerado em ${new Date().toLocaleString('pt-BR')}`, MARGEM, MARGEM - 20, {
      tamanho: 9,
      cor: '0.5 0.52 0.56',
    }),
  ];

  return montarPdf(paraWinAnsi(comandos.join('\n')));
}

export function exportarEscala(escala, atendentes) {
  baixarArquivo(gerarPdfEscala(escala, atendentes), `escala-${escala.mes}.pdf`);
}
