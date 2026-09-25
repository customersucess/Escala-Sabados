import { deslocarMes, formatarData, hoje, sabadosDoMes } from '../../../shared/utils/datas.js';
import { disponivelHoje, duplaDeNovatos, estaElegivel, idsBloqueadosNaData, primeiroSabado } from './regrasEscala.js';

const PESO_PARTICIPACAO_NO_MES = 10;
const PESO_SABADO_CONSECUTIVO = 4;
const PESO_HISTORICO = 1;
const MESES_DE_HISTORICO = 2;

function embaralhar(lista, aleatorio) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Participações recentes servem de desempate, para equilibrar a carga entre meses. */
function contarHistorico(mes, escalas) {
  const contagem = {};
  for (let deslocamento = 1; deslocamento <= MESES_DE_HISTORICO; deslocamento++) {
    const escala = escalas[deslocarMes(mes, -deslocamento)];
    escala?.sabados.forEach((sabado) =>
      sabado.atendentes.forEach((id) => {
        contagem[id] = (contagem[id] ?? 0) + 1;
      }),
    );
  }
  return contagem;
}

/** Ids do primeiro sábado do mês seguinte já salvo, que não podem fechar o mês gerado. */
function idsDoPrimeiroSabadoSeguinte(mes, escalas) {
  const proximoMes = deslocarMes(mes, 1);
  const escalaSeguinte = escalas[proximoMes];
  if (!escalaSeguinte) return [];
  const data = primeiroSabado(proximoMes);
  return escalaSeguinte.sabados.find((sabado) => sabado.data === data)?.atendentes ?? [];
}

/**
 * Gera a escala do mês de forma aleatória, respeitando as regras:
 * disponibilidade, rodízio no primeiro sábado, novato sempre com experiente
 * e distribuição equilibrada de participações.
 */
export function gerarEscala(mes, todosAtendentes, escalas, { aleatorio = Math.random, dataReferencia = hoje() } = {}) {
  const atendentes = todosAtendentes.filter((atendente) => disponivelHoje(atendente, dataReferencia));
  const sabados = sabadosDoMes(mes);
  const historico = contarHistorico(mes, escalas);
  const participacoes = Object.fromEntries(atendentes.map((atendente) => [atendente.id, 0]));
  const reservadosProximoMes = idsDoPrimeiroSabadoSeguinte(mes, escalas);
  let duplaAnterior = [];

  const pontuar = (dupla) =>
    dupla.reduce(
      (total, atendente) =>
        total +
        participacoes[atendente.id] * PESO_PARTICIPACAO_NO_MES +
        (duplaAnterior.includes(atendente.id) ? PESO_SABADO_CONSECUTIVO : 0) +
        (historico[atendente.id] ?? 0) * PESO_HISTORICO,
      0,
    );

  const sabadosGerados = sabados.map((data) => {
    const bloqueados = idsBloqueadosNaData(data, escalas);
    const disponiveis = embaralhar(
      atendentes.filter((atendente) => estaElegivel(atendente, data, bloqueados)),
      aleatorio,
    );
    const eUltimoSabado = data === sabados.at(-1);

    const candidatas = [];
    for (let i = 0; i < disponiveis.length; i++) {
      for (let j = i + 1; j < disponiveis.length; j++) {
        const dupla = [disponiveis[i], disponiveis[j]];
        if (duplaDeNovatos(dupla, data)) continue;
        if (eUltimoSabado && dupla.some((atendente) => reservadosProximoMes.includes(atendente.id))) continue;
        candidatas.push(dupla);
      }
    }
    // A ordenação é estável: empates mantêm a ordem aleatória do embaralhamento.
    candidatas.sort((a, b) => pontuar(a) - pontuar(b));

    const escolhida = candidatas[0];
    if (!escolhida) {
      const complemento =
        eUltimoSabado && reservadosProximoMes.length ? ' (incluindo o primeiro sábado do mês seguinte)' : '';
      throw new Error(
        `Não há dupla válida em ${formatarData(data)}. Verifique admissões, quem está de férias, atestado ou afastado hoje e o rodízio entre meses${complemento}.`,
      );
    }
    duplaAnterior = escolhida.map((atendente) => atendente.id);
    duplaAnterior.forEach((id) => {
      participacoes[id]++;
    });
    return { data, atendentes: duplaAnterior };
  });

  return { mes, sabados: sabadosGerados, atualizadoEm: new Date().toISOString() };
}
