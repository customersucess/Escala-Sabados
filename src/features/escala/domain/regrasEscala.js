import { deslocarMes, formatarData, hoje, sabadosDoMes, ultimoDiaUtilDoMes } from '../../../shared/utils/datas.js';
import { estaEmExperiencia, statusNaData } from '../../atendentes/domain/atendente.js';

export const ATENDENTES_POR_SABADO = 2;

export const primeiroSabado = (mes) => sabadosDoMes(mes)[0];

export const ultimoSabado = (mes) => sabadosDoMes(mes).at(-1);

/**
 * Rodízio entre meses: quem atendeu no último sábado do mês anterior
 * descansa apenas no primeiro sábado do mês. Nos demais sábados volta a concorrer normalmente.
 */
export function idsEmDescanso(mes, escalas) {
  const mesAnterior = deslocarMes(mes, -1);
  const escalaAnterior = escalas[mesAnterior];
  if (!escalaAnterior) return [];
  const dataUltimo = ultimoSabado(mesAnterior);
  return escalaAnterior.sabados.find((sabado) => sabado.data === dataUltimo)?.atendentes ?? [];
}

/** Ids bloqueados pelo rodízio em uma data específica (somente no primeiro sábado do mês). */
export function idsBloqueadosNaData(data, escalas) {
  const mes = data.slice(0, 7);
  return data === primeiroSabado(mes) ? idsEmDescanso(mes, escalas) : [];
}

/**
 * Elegível quando possui admissão em mês anterior, está ativo na data
 * (sem férias, atestado ou outra ausência) e não está bloqueado pelo rodízio.
 */
export const estaElegivel = (atendente, data, bloqueados = []) =>
  !!atendente.admissao &&
  atendente.admissao.slice(0, 7) < data.slice(0, 7) &&
  statusNaData(atendente, data) === 'ativo' &&
  !bloqueados.includes(atendente.id);

/** Inclusão manual usa a disponibilidade do sábado escolhido, não a data de montagem da escala. */
export const podeSerSelecionadoNaData = (atendente, data, bloqueados = []) =>
  estaElegivel(atendente, data, bloqueados);

/**
 * A escala do mês seguinte é montada no último dia útil do mês anterior.
 * Para meses futuros, a disponibilidade é avaliada nessa data (ou hoje, se ela já passou);
 * para o mês atual e anteriores, vale a data de hoje da máquina.
 */
export function dataReferenciaGeracao(mes, dataHoje = hoje()) {
  if (mes <= dataHoje.slice(0, 7)) return dataHoje;
  const diaDaMontagem = ultimoDiaUtilDoMes(deslocarMes(mes, -1));
  return diaDaMontagem > dataHoje ? diaDaMontagem : dataHoje;
}

/**
 * Para gerar ou incluir alguém numa escala, o atendente precisa estar ativo na data de referência
 * (ver `dataReferenciaGeracao`). Quem está de férias, atestado, afastado, ausente ou desligado nessa data
 * fica de fora da escala e só volta a ser considerado depois do retorno.
 */
export const disponivelHoje = (atendente, dataReferencia) => statusNaData(atendente, dataReferencia) === 'ativo';

export const duplaDeNovatos = (dupla, data) =>
  dupla.every((atendente) => atendente && estaEmExperiencia(atendente, data));

/**
 * Valida os sábados do mês. Com `aPartirDe`, sábados anteriores são tratados como histórico
 * e não são revalidados (ex.: atendente desligado ou excluído depois de ter trabalhado).
 */
export function validarEscala(escala, atendentes, escalas, { aPartirDe = '' } = {}) {
  const problemas = [];
  for (const data of sabadosDoMes(escala.mes)) {
    if (data < aPartirDe) continue;
    const sabado = escala.sabados.find((item) => item.data === data);
    const dataFormatada = formatarData(data);
    if (
      !sabado ||
      sabado.atendentes.length !== ATENDENTES_POR_SABADO ||
      new Set(sabado.atendentes).size !== ATENDENTES_POR_SABADO
    ) {
      problemas.push(`${dataFormatada}: selecione dois atendentes diferentes.`);
      continue;
    }
    const bloqueados = idsBloqueadosNaData(data, escalas);
    const dupla = sabado.atendentes.map((id) => atendentes.find((atendente) => atendente.id === id));
    if (dupla.some((atendente) => atendente && bloqueados.includes(atendente.id))) {
      problemas.push(`${dataFormatada}: quem atendeu no último sábado do mês anterior descansa no primeiro sábado.`);
    } else if (dupla.some((atendente) => !atendente || !estaElegivel(atendente, data))) {
      problemas.push(`${dataFormatada}: atendente indisponível (férias, atestado, ausência ou admissão recente).`);
    }
    if (duplaDeNovatos(dupla, data)) problemas.push(`${dataFormatada}: dois novatos não podem trabalhar juntos.`);
  }
  return problemas;
}
