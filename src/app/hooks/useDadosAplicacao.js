import { useCallback, useState } from 'react';
import { carregarDados, dadosVazios, salvarDados } from '../../shared/services/armazenamento.js';

function carregarEstadoInicial() {
  try {
    return { ...carregarDados(), erroCarregamento: '' };
  } catch (erro) {
    return { ...dadosVazios(), erroCarregamento: erro.message };
  }
}

/** Mantém atendentes e escalas em memória e persiste cada alteração no navegador. */
export function useDadosAplicacao() {
  const [estado, setEstado] = useState(carregarEstadoInicial);

  const salvar = useCallback(
    (proximos) => {
      if (estado.erroCarregamento) throw new Error(estado.erroCarregamento);
      const dados = {
        atendentes: proximos.atendentes ?? estado.atendentes,
        escalas: proximos.escalas ?? estado.escalas,
      };
      try {
        salvarDados(dados);
      } catch (erro) {
        throw new Error(
          erro.name === 'QuotaExceededError'
            ? 'O armazenamento está cheio. Nenhuma alteração foi salva.'
            : erro.message,
          { cause: erro },
        );
      }
      setEstado({ ...dados, erroCarregamento: '' });
    },
    [estado],
  );

  return { ...estado, salvar };
}
