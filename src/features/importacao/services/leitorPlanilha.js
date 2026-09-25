import * as XLSX from 'xlsx';
import { dataValida, montarDataIso } from '../../../shared/utils/datas.js';
import { gerarId, normalizarTexto } from '../../../shared/utils/texto.js';

export const TAMANHO_MAXIMO_ARQUIVO = 5 * 1024 * 1024;
const LIMITE_DE_LINHAS = 10000;

const chaveCabecalho = (valor) => normalizarTexto(valor).replace(/[._-]/g, ' ').replace(/\s+/g, ' ');

const APELIDOS_COLUNAS = {
  nome: ['nome', 'nome completo', 'funcionario', 'nome do funcionario', 'colaborador', 'atendente'],
  admissao: ['admissao', 'data admissao', 'data de admissao', 'dt de admissao', 'dt admissao'],
  status: ['status', 'situacao', 'situacao atual'],
  inicio: ['inicio', 'data inicio', 'data de inicio'],
  fim: ['fim', 'data fim', 'data de fim', 'ultimo dia'],
};

const APELIDOS_STATUS = {
  ativo: 'ativo',
  ativa: 'ativo',
  ferias: 'ferias',
  'de ferias': 'ferias',
  'em ferias': 'ferias',
  ausente: 'ausente',
  ausencia: 'ausente',
  atestado: 'atestado',
  'de atestado': 'atestado',
  'em atestado': 'atestado',
  afastado: 'afastado',
  afastada: 'afastado',
  desligado: 'desligado',
  desligada: 'desligado',
  demitido: 'desligado',
  demitida: 'desligado',
};

const interpretarStatus = (valor) => APELIDOS_STATUS[normalizarTexto(valor)];

const celulaVazia = (valor) => valor === null || valor === undefined || String(valor).trim() === '';

export function converterDataExcel(valor, data1904 = false) {
  if (typeof valor === 'number') {
    const data = XLSX.SSF.parse_date_code(valor, { date1904: data1904 });
    return data ? montarDataIso(data.y, data.m, data.d) : '';
  }
  if (valor instanceof Date) return montarDataIso(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
  const texto = String(valor ?? '').trim();
  const partes = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return partes ? montarDataIso(partes[3], partes[2], partes[1]) : texto;
}

function valorDaColuna(linha, campo) {
  const encontrados = Object.entries(linha).filter(([cabecalho]) =>
    APELIDOS_COLUNAS[campo].includes(chaveCabecalho(cabecalho)),
  );
  if (encontrados.length > 1) throw new Error(`Colunas repetidas para ${APELIDOS_COLUNAS[campo][0]}.`);
  return encontrados[0]?.[1];
}

function prepararAlteracao(alteracoes, atendentes, nome) {
  const chave = normalizarTexto(nome);
  const existente = alteracoes.get(chave);
  if (existente) return existente;
  const correspondentes = atendentes.filter((atendente) => normalizarTexto(atendente.nome) === chave);
  if (correspondentes.length > 1) throw new Error(`nome ambíguo (${nome}); corrija os cadastros duplicados.`);
  const original = correspondentes[0];
  const id = original?.id ?? gerarId();
  const alteracao = {
    id,
    nome,
    acao: original ? 'atualizar' : 'cadastrar',
    atendente: original
      ? { ...original, ausencias: original.ausencias.map((ausencia) => ({ ...ausencia })) }
      : { id, nome, admissao: '', status: 'ativo', ausencias: [] },
    admissaoInformada: null,
    statusInformado: null,
  };
  alteracoes.set(chave, alteracao);
  return alteracao;
}

function registrarPeriodos(alteracao, periodos) {
  const { atendente, nome } = alteracao;
  for (const periodo of periodos) {
    const identico = atendente.ausencias.some(
      (ausencia) =>
        ausencia.tipo === periodo.tipo && ausencia.inicio === periodo.inicio && ausencia.fim === periodo.fim,
    );
    if (identico) continue;
    const sobreposto = atendente.ausencias.some(
      (ausencia) => ausencia.inicio <= periodo.fim && periodo.inicio <= ausencia.fim,
    );
    if (sobreposto) {
      throw new Error(`${nome}: período sobreposto a uma ausência existente (${periodo.inicio} a ${periodo.fim}).`);
    }
    atendente.ausencias.push({ ...periodo, id: gerarId() });
  }
}

function processarLinha(linha, alteracoes, atendentes, opcoes) {
  const nome = String(valorDaColuna(linha, 'nome') ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!nome || nome.length > 100) throw new Error('informe um nome com até 100 caracteres.');
  const alteracao = prepararAlteracao(alteracoes, atendentes, nome);

  const celulaAdmissao = valorDaColuna(linha, 'admissao');
  if (!celulaVazia(celulaAdmissao)) {
    const admissao = converterDataExcel(celulaAdmissao, opcoes.data1904);
    if (!dataValida(admissao)) throw new Error(`${nome}: data de admissão inválida.`);
    if (alteracao.admissaoInformada && alteracao.admissaoInformada !== admissao) {
      throw new Error(`${nome}: admissões diferentes para o mesmo nome.`);
    }
    alteracao.atendente.admissao = admissao;
    alteracao.admissaoInformada = admissao;
  }

  const celulaStatus = valorDaColuna(linha, 'status');
  const status = celulaVazia(celulaStatus) ? null : interpretarStatus(celulaStatus);
  if (!celulaVazia(celulaStatus) && !status) {
    throw new Error(
      `${nome}: status desconhecido (${celulaStatus}). Use ativo, férias, ausente, atestado, afastado ou desligado.`,
    );
  }

  const celulaInicio = valorDaColuna(linha, 'inicio');
  const celulaFim = valorDaColuna(linha, 'fim');
  const periodos = [...(linha.__periodos ?? [])];
  if (!celulaVazia(celulaInicio) || !celulaVazia(celulaFim)) {
    const inicio = converterDataExcel(celulaInicio, opcoes.data1904);
    const fim = converterDataExcel(celulaFim, opcoes.data1904);
    const periodoInvalido =
      !status || ['ativo', 'desligado'].includes(status) || !dataValida(inicio) || !dataValida(fim) || fim < inicio;
    if (periodoInvalido) throw new Error(`${nome}: confira status, início e fim da ausência.`);
    periodos.push({ tipo: status, inicio, fim });
  } else if (status) {
    if (alteracao.statusInformado && alteracao.statusInformado !== status) {
      throw new Error(`${nome}: status sem período conflitantes na mesma planilha.`);
    }
    alteracao.atendente.status = status;
    alteracao.statusInformado = status;
  }
  registrarPeriodos(alteracao, periodos);
}

/**
 * Interpreta as linhas e prepara todas as alterações antes de aplicar:
 * um arquivo inválido nunca altera a equipe parcialmente.
 */
export function interpretarLinhas(linhas, atendentes, opcoes = {}) {
  if (!linhas.length) throw new Error('A planilha está vazia.');
  if (linhas.length > LIMITE_DE_LINHAS) throw new Error('A planilha deve ter no máximo 10.000 linhas.');
  const alteracoes = new Map();
  const erros = [];
  const avisos = [];
  linhas.forEach((linha, indice) => {
    try {
      processarLinha(linha, alteracoes, atendentes, opcoes);
    } catch (erro) {
      erros.push(`Linha ${linha.__linha ?? indice + 2}: ${erro.message}`);
    }
  });
  const entradas = [...alteracoes.values()];
  for (const { nome, atendente } of entradas) {
    if (!atendente.admissao)
      avisos.push(`${nome}: preencha a admissão no cadastro antes de gerar escalas para esta pessoa.`);
    if (!['ativo', 'desligado'].includes(atendente.status)) {
      avisos.push(`${nome}: ${atendente.status} sem período; ficará indisponível até o status ser atualizado.`);
    }
  }
  return {
    entradas,
    erros,
    avisos,
    cadastrados: entradas.filter((entrada) => entrada.acao === 'cadastrar').length,
    atualizados: entradas.filter((entrada) => entrada.acao === 'atualizar').length,
  };
}

export function aplicarImportacao(atendentes, resultado) {
  if (resultado.erros.length) throw new Error('Corrija todos os erros antes de aplicar a importação.');
  const substituicoes = new Map(resultado.entradas.map((entrada) => [entrada.id, entrada.atendente]));
  const novos = resultado.entradas
    .filter((entrada) => !atendentes.some((atendente) => atendente.id === entrada.id))
    .map((entrada) => entrada.atendente);
  return [...atendentes.map((atendente) => substituicoes.get(atendente.id) ?? atendente), ...novos];
}

const padraoIntervalo = () =>
  /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*(?:a|à|á|até|ate|[-–—])\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/gi;

function periodosMensais(valor, cabecalho, data1904) {
  const mesDaColuna = converterDataExcel(cabecalho, data1904);
  const ano = Number(mesDaColuna.slice(0, 4));
  const numeroMes = Number(mesDaColuna.slice(5, 7));
  const texto = String(valor).trim();
  const normalizado = normalizarTexto(texto);
  const status = interpretarStatus(texto);
  if (status === 'ativo') return [];
  if (status === 'desligado') {
    throw new Error('informe desligado em uma coluna Status, para distinguir desligamento de ausência mensal.');
  }
  if (status) {
    const ultimoDia = new Date(ano, numeroMes, 0).getDate();
    return [{ tipo: status, inicio: montarDataIso(ano, numeroMes, 1), fim: montarDataIso(ano, numeroMes, ultimoDia) }];
  }
  const intervalos = [...texto.matchAll(padraoIntervalo())];
  if (!intervalos.length) throw new Error(`período não reconhecido: "${texto}". Use DD/MM a DD/MM.`);
  let tipo = 'ferias';
  if (normalizado.includes('atestado')) tipo = 'atestado';
  else if (normalizado.includes('ausent')) tipo = 'ausente';
  else if (normalizado.includes('afastad')) tipo = 'afastado';
  const restante = normalizarTexto(texto.replace(padraoIntervalo(), '').replace(/v\s*=\s*\d+/gi, ''))
    .replace(/\b(ferias|atestado|ausente|afastado|de|em)\b/g, '')
    .replace(/[\s:;,()]+/g, '');
  if (restante) throw new Error(`texto não reconhecido no período: "${texto}".`);
  return intervalos.map((partes) => {
    const anoInicio = Number(partes[3] || ano);
    const anoFim = Number(partes[6] || (Number(partes[5]) < Number(partes[2]) ? anoInicio + 1 : anoInicio));
    const inicio = montarDataIso(anoInicio, partes[2], partes[1]);
    const fim = montarDataIso(anoFim, partes[5], partes[4]);
    if (!dataValida(inicio) || !dataValida(fim) || fim < inicio) throw new Error(`datas inválidas em "${texto}".`);
    return { tipo, inicio, fim, observacao: texto };
  });
}

export function interpretarPlanilha(pasta, atendentes) {
  const grade = XLSX.utils.sheet_to_json(pasta.Sheets[pasta.SheetNames[0]], {
    header: 1,
    defval: '',
    blankrows: true,
    raw: true,
  });
  const indiceCabecalho = grade.findIndex((linha) =>
    linha.some((celula) => APELIDOS_COLUNAS.nome.includes(chaveCabecalho(celula))),
  );
  if (indiceCabecalho < 0) throw new Error('Não foi encontrada a coluna Nome ou Funcionário na primeira aba.');
  const cabecalhos = grade[indiceCabecalho];
  const data1904 = !!pasta.Workbook?.WBProps?.date1904;
  for (const campo of Object.keys(APELIDOS_COLUNAS)) {
    const repetidas = cabecalhos.filter((cabecalho) => APELIDOS_COLUNAS[campo].includes(chaveCabecalho(cabecalho)));
    if (repetidas.length > 1) throw new Error(`Colunas repetidas para ${APELIDOS_COLUNAS[campo][0]}.`);
  }
  const colunasMensais = cabecalhos
    .map((cabecalho, indice) => ({ indice, data: converterDataExcel(cabecalho, data1904) }))
    .filter((coluna) => dataValida(coluna.data) && coluna.data.endsWith('-01'));

  const erros = [];
  const linhas = [];
  grade.slice(indiceCabecalho + 1).forEach((celulas, posicao) => {
    if (celulas.every(celulaVazia)) return;
    const numeroLinha = indiceCabecalho + posicao + 2;
    const linha = { __linha: numeroLinha, __periodos: [] };
    cabecalhos.forEach((cabecalho, indice) => {
      if (!celulaVazia(cabecalho) && !colunasMensais.some((coluna) => coluna.indice === indice)) {
        linha[String(cabecalho)] = celulas[indice] ?? '';
      }
    });
    for (const coluna of colunasMensais) {
      if (celulaVazia(celulas[coluna.indice])) continue;
      try {
        linha.__periodos.push(...periodosMensais(celulas[coluna.indice], cabecalhos[coluna.indice], data1904));
      } catch (erro) {
        erros.push(`Linha ${numeroLinha}, mês ${coluna.data.slice(0, 7)}: ${erro.message}`);
      }
    }
    linhas.push(linha);
  });

  const resultado = interpretarLinhas(linhas, atendentes, { data1904 });
  resultado.erros.push(...erros);
  resultado.formato = colunasMensais.length ? 'Controle anual de férias' : 'Lista de funcionários';
  return resultado;
}

export async function lerArquivoImportacao(arquivo, atendentes) {
  if (!/\.xlsx$/i.test(arquivo.name)) throw new Error('Selecione uma planilha Excel no formato .xlsx.');
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) throw new Error('O arquivo deve ter até 5 MB.');
  return interpretarPlanilha(XLSX.read(await arquivo.arrayBuffer(), { type: 'array' }), atendentes);
}
