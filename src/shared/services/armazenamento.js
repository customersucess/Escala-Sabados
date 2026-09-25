import { dataValida, mesValido } from '../utils/datas.js';
import { STATUS_VALIDOS, TIPOS_AUSENCIA } from '../../features/atendentes/domain/atendente.js';

export const CHAVE_ARMAZENAMENTO = 'sempre-escala-v2';
/** Chave da versão anterior (campos em inglês). É lida uma única vez e preservada. */
export const CHAVE_ARMAZENAMENTO_LEGADO = 'sempre-cs-v1';

export const dadosVazios = () => ({ atendentes: [], escalas: {} });

function migrarDadosLegados(legado) {
  return {
    atendentes: legado.people.map((pessoa) => ({
      id: pessoa.id,
      nome: pessoa.name,
      admissao: pessoa.admission,
      status: pessoa.status,
      ausencias: pessoa.absences.map((ausencia) => ({
        id: ausencia.id,
        tipo: ausencia.type,
        inicio: ausencia.start,
        fim: ausencia.end,
        ...(ausencia.note ? { observacao: ausencia.note } : {}),
      })),
    })),
    escalas: Object.fromEntries(
      Object.entries(legado.schedules).map(([mes, escala]) => [
        mes,
        {
          mes: escala.month,
          sabados: escala.rows.map((linha) => ({ data: linha.date, atendentes: linha.people })),
          atualizadoEm: escala.updatedAt,
        },
      ]),
    ),
  };
}

const ausenciaValida = (ausencia) =>
  !!ausencia &&
  dataValida(ausencia.inicio) &&
  dataValida(ausencia.fim) &&
  ausencia.inicio <= ausencia.fim &&
  TIPOS_AUSENCIA.includes(ausencia.tipo);

const atendenteValido = (atendente) =>
  !!atendente &&
  typeof atendente.id === 'string' &&
  typeof atendente.nome === 'string' &&
  !!atendente.nome.trim() &&
  (atendente.admissao === '' || dataValida(atendente.admissao)) &&
  STATUS_VALIDOS.includes(atendente.status) &&
  Array.isArray(atendente.ausencias) &&
  atendente.ausencias.every(ausenciaValida);

const escalaValida = ([mes, escala]) =>
  !!escala &&
  escala.mes === mes &&
  mesValido(mes) &&
  Array.isArray(escala.sabados) &&
  escala.sabados.every(
    (sabado) =>
      !!sabado &&
      dataValida(sabado.data) &&
      Array.isArray(sabado.atendentes) &&
      sabado.atendentes.every((id) => typeof id === 'string'),
  );

export function validarDados(dados) {
  const estruturaValida =
    !!dados &&
    Array.isArray(dados.atendentes) &&
    !!dados.escalas &&
    typeof dados.escalas === 'object' &&
    !Array.isArray(dados.escalas);
  if (
    !estruturaValida ||
    !dados.atendentes.every(atendenteValido) ||
    !Object.entries(dados.escalas).every(escalaValida)
  ) {
    throw new Error('Estrutura inválida.');
  }
  return dados;
}

export function carregarDados() {
  try {
    const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (bruto) return validarDados(JSON.parse(bruto));
    const legado = localStorage.getItem(CHAVE_ARMAZENAMENTO_LEGADO);
    if (!legado) return dadosVazios();
    const migrados = validarDados(migrarDadosLegados(JSON.parse(legado)));
    salvarDados(migrados);
    return migrados;
  } catch {
    throw new Error('Não foi possível ler os dados salvos. O conteúdo original foi preservado.');
  }
}

export function salvarDados(dados) {
  localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados));
}
