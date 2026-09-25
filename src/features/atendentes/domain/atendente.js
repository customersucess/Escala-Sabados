import { formatarData, somarDias, somarMeses } from '../../../shared/utils/datas.js';
import { gerarId } from '../../../shared/utils/texto.js';

export const MESES_DE_EXPERIENCIA = 3;

export const ROTULOS_STATUS = {
  ativo: 'Ativo',
  ferias: 'Férias',
  atestado: 'Atestado',
  afastado: 'Afastado',
  ausente: 'Ausente',
  desligado: 'Desligado',
};

export const STATUS_VALIDOS = Object.keys(ROTULOS_STATUS);

/** Status que representam ausência temporária e podem ter período datado. */
export const TIPOS_AUSENCIA = ['ferias', 'atestado', 'afastado', 'ausente'];

export const criarAtendenteVazio = () => ({
  id: gerarId(),
  nome: '',
  admissao: '',
  status: 'ativo',
  ausencias: [],
});

export const ausenciaNaData = (atendente, data) =>
  atendente.ausencias.find((ausencia) => ausencia.inicio <= data && data <= ausencia.fim);

export function statusNaData(atendente, data) {
  if (atendente.status === 'desligado') return 'desligado';
  return ausenciaNaData(atendente, data)?.tipo ?? atendente.status;
}

export const possuiEscalas = (atendente, escalas) =>
  Object.values(escalas).some((escala) => escala.sabados.some((sabado) => sabado.atendentes.includes(atendente.id)));

/** Quem já foi escalado só pode ser excluído depois de ter o status alterado para desligado. */
export const podeSerExcluido = (atendente, escalas) =>
  atendente.status === 'desligado' || !possuiEscalas(atendente, escalas);

/** Separa quem pode ser excluído de quem precisa ser desligado antes. */
export function separarParaExclusao(atendentes, escalas) {
  const excluiveis = atendentes.filter((atendente) => podeSerExcluido(atendente, escalas));
  const mantidos = atendentes.filter((atendente) => !podeSerExcluido(atendente, escalas));
  return { excluiveis, mantidos };
}

export const fimDaExperiencia = (atendente) =>
  atendente.admissao ? somarMeses(atendente.admissao, MESES_DE_EXPERIENCIA) : '';

export const estaEmExperiencia = (atendente, data) => !!atendente.admissao && data < fimDaExperiencia(atendente);

/** Descreve o status do atendente em uma data, com texto de apoio para tooltip. */
export function descreverStatus(atendente, data) {
  const status = statusNaData(atendente, data);
  const ausencia = ausenciaNaData(atendente, data);
  let descricao = 'Disponível para as escalas de sábado.';
  if (status === 'desligado') descricao = 'Desligado. Não entra em novas escalas.';
  else if (ausencia && atendente.status !== 'desligado') {
    descricao = `${ROTULOS_STATUS[ausencia.tipo]} de ${formatarData(ausencia.inicio)} a ${formatarData(ausencia.fim)}. Volta a ser escalado em ${formatarData(somarDias(ausencia.fim, 1))}.`;
  } else if (status !== 'ativo') {
    descricao = `${ROTULOS_STATUS[status]} sem período definido. Fica fora da escala até o status ser alterado.`;
  }
  return { chave: status, rotulo: ROTULOS_STATUS[status], descricao };
}

/** Descreve a situação de experiência do atendente, usada na etiqueta da tabela. */
export function descreverExperiencia(atendente, data) {
  if (!atendente.admissao) {
    return {
      chave: 'pendente',
      rotulo: 'Admissão pendente',
      descricao: 'Informe a data de admissão para incluir o atendente nas escalas.',
    };
  }
  if (atendente.admissao > data) {
    return {
      chave: 'futura',
      rotulo: 'Admissão futura',
      descricao: `Admissão prevista para ${formatarData(atendente.admissao)}. Entra na escala a partir do mês seguinte.`,
    };
  }
  if (estaEmExperiencia(atendente, data)) {
    return {
      chave: 'experiencia',
      rotulo: 'Em experiência',
      descricao: `Completa ${MESES_DE_EXPERIENCIA} meses em ${formatarData(fimDaExperiencia(atendente))}. Até lá, trabalha sempre com alguém experiente.`,
    };
  }
  return {
    chave: 'experiente',
    rotulo: 'Experiente',
    descricao: `Experiência concluída em ${formatarData(fimDaExperiencia(atendente))}. Pode acompanhar novatos.`,
  };
}
