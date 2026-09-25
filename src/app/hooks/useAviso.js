import { useCallback, useEffect, useState } from 'react';

const DURACAO_AVISO_SUCESSO_MS = 6000;

export function useAviso() {
  const [aviso, setAviso] = useState(null);

  const notificar = useCallback((texto, tipo = 'sucesso') => setAviso({ texto, tipo, id: Date.now() }), []);
  const dispensar = useCallback(() => setAviso(null), []);

  useEffect(() => {
    if (aviso?.tipo !== 'sucesso') return undefined;
    const temporizador = setTimeout(() => setAviso(null), DURACAO_AVISO_SUCESSO_MS);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  /** Executa uma ação e converte exceções em aviso de erro. */
  const executar = useCallback(
    (acao) => {
      try {
        acao();
      } catch (erro) {
        notificar(erro.message, 'erro');
      }
    },
    [notificar],
  );

  return { aviso, notificar, dispensar, executar };
}
