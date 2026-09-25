import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export const CHAVE_TEMA = 'sempre-tema';
const COR_BARRA_NAVEGADOR = { claro: '#f7f8fa', escuro: '#09090b' };
const DURACAO_TRANSICAO_MS = 650;
const consultaTemaEscuro = '(prefers-color-scheme: dark)';

const preferenciaSalva = () => {
  try {
    const tema = localStorage.getItem(CHAVE_TEMA);
    return tema === 'claro' || tema === 'escuro' ? tema : null;
  } catch {
    return null;
  }
};

const temaDoSistema = () => (window.matchMedia?.(consultaTemaEscuro).matches ? 'escuro' : 'claro');

/** O script em index.html já aplica o tema antes da pintura; aqui apenas lemos o valor. */
const temaInicial = () => document.documentElement.dataset.tema || preferenciaSalva() || temaDoSistema();

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA_NAVEGADOR[tema]);
}

const movimentoReduzido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Anima a troca: círculo que se expande a partir do botão ou, sem suporte, transição de cores. */
function animarTroca(origem, trocar) {
  if (movimentoReduzido()) {
    trocar();
    return;
  }
  if (!document.startViewTransition) {
    const raiz = document.documentElement;
    raiz.classList.add('tema-em-transicao');
    trocar();
    setTimeout(() => raiz.classList.remove('tema-em-transicao'), DURACAO_TRANSICAO_MS);
    return;
  }
  const x = origem?.x ?? window.innerWidth - 40;
  const y = origem?.y ?? 32;
  const raio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transicao = document.startViewTransition(() => flushSync(trocar));
  transicao.ready
    .then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
        {
          duration: DURACAO_TRANSICAO_MS,
          easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      ),
    )
    .catch(() => {});
}

export function useTema() {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  // Acompanha o sistema operacional enquanto o usuário não escolher um tema.
  useEffect(() => {
    const consulta = window.matchMedia?.(consultaTemaEscuro);
    if (!consulta) return undefined;
    const aoMudar = (evento) => {
      if (!preferenciaSalva()) setTema(evento.matches ? 'escuro' : 'claro');
    };
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  const alternarTema = useCallback(
    (evento) => {
      const proximo = tema === 'escuro' ? 'claro' : 'escuro';
      const retangulo = evento?.currentTarget?.getBoundingClientRect();
      const origem = retangulo && { x: retangulo.left + retangulo.width / 2, y: retangulo.top + retangulo.height / 2 };
      try {
        localStorage.setItem(CHAVE_TEMA, proximo);
      } catch {
        // Sem armazenamento disponível, o tema vale apenas para esta sessão.
      }
      animarTroca(origem, () => {
        aplicarTema(proximo);
        setTema(proximo);
      });
    },
    [tema],
  );

  return { tema, alternarTema };
}
