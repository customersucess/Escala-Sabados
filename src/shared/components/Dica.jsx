import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MARGEM_TELA = 140;
const ESPACO_MINIMO_ACIMA = 110;

/** Tooltip acessível (hover e foco). É renderizado em portal para não ser cortado por contêineres com rolagem. */
export default function Dica({ texto, children }) {
  const id = useId();
  const referencia = useRef(null);
  const [posicao, setPosicao] = useState(null);

  const mostrar = () => {
    const elemento = referencia.current;
    const retangulo = elemento.getBoundingClientRect();
    const acima = retangulo.top > ESPACO_MINIMO_ACIMA;
    const centro = retangulo.left + retangulo.width / 2;
    setPosicao({
      x: Math.min(Math.max(centro, MARGEM_TELA), window.innerWidth - MARGEM_TELA),
      y: acima ? retangulo.top : retangulo.bottom,
      acima,
      // Dentro de um <dialog> o balão precisa ficar na mesma camada do modal.
      destino: elemento.closest('dialog') ?? document.body,
    });
  };
  const esconder = () => setPosicao(null);

  useEffect(() => {
    if (!posicao) return undefined;
    const aoRolar = () => setPosicao(null);
    window.addEventListener('scroll', aoRolar, true);
    return () => window.removeEventListener('scroll', aoRolar, true);
  }, [posicao]);

  return (
    <>
      <span
        ref={referencia}
        className="dica"
        tabIndex={0}
        aria-describedby={id}
        onMouseEnter={mostrar}
        onMouseLeave={esconder}
        onFocus={mostrar}
        onBlur={esconder}
        onKeyDown={(evento) => evento.key === 'Escape' && esconder()}
      >
        {children}
        <span id={id} className="somente-leitor-tela">
          {texto}
        </span>
      </span>
      {posicao &&
        createPortal(
          <span
            aria-hidden="true"
            className={`dica-balao ${posicao.acima ? 'dica-balao--acima' : 'dica-balao--abaixo'}`}
            style={{ left: posicao.x, top: posicao.y }}
          >
            {texto}
          </span>,
          posicao.destino,
        )}
    </>
  );
}
