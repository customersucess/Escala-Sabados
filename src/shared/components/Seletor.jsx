import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const ALTURA_MAXIMA_LISTA = 288;
const ESPACO_DA_BORDA = 8;

/**
 * Lista suspensa no visual do sistema (claro e escuro), substituindo o `<select>` nativo.
 * Opções: `{ valor, rotulo, complemento?, desabilitada? }`.
 */
export default function Seletor({ valor, opcoes, aoAlterar, idRotulo }) {
  const [aberto, setAberto] = useState(false);
  const [destacado, setDestacado] = useState(-1);
  const [posicao, setPosicao] = useState(null);
  const gatilho = useRef(null);
  const lista = useRef(null);
  const busca = useRef({ texto: '', tempo: 0 });
  const idLista = useId();

  const indiceSelecionado = opcoes.findIndex((opcao) => opcao.valor === valor);
  const selecionada = opcoes[indiceSelecionado];

  const posicionar = () => {
    const area = gatilho.current.getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - area.bottom - ESPACO_DA_BORDA;
    const abrirAcima = espacoAbaixo < 180 && area.top > espacoAbaixo;
    const alturaMaxima = Math.min(ALTURA_MAXIMA_LISTA, abrirAcima ? area.top - ESPACO_DA_BORDA : espacoAbaixo);
    setPosicao({
      left: area.left,
      width: area.width,
      maxHeight: alturaMaxima,
      ...(abrirAcima ? { bottom: window.innerHeight - area.top + 4 } : { top: area.bottom + 4 }),
    });
  };

  const abrir = () => {
    posicionar();
    setDestacado(indiceSelecionado);
    setAberto(true);
  };

  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) gatilho.current?.focus();
  };

  const escolher = (indice) => {
    const opcao = opcoes[indice];
    if (!opcao || opcao.desabilitada) return;
    if (opcao.valor !== valor) aoAlterar(opcao.valor);
    fechar();
  };

  const proximaHabilitada = (inicio, passo) => {
    for (let indice = inicio + passo; indice >= 0 && indice < opcoes.length; indice += passo) {
      if (!opcoes[indice].desabilitada) return indice;
    }
    return inicio;
  };

  const buscarPorTexto = (tecla) => {
    const agora = Date.now();
    busca.current = {
      texto: (agora - busca.current.tempo > 700 ? '' : busca.current.texto) + tecla.toLowerCase(),
      tempo: agora,
    };
    const indice = opcoes.findIndex(
      (opcao) => !opcao.desabilitada && opcao.rotulo.toLowerCase().startsWith(busca.current.texto),
    );
    if (indice >= 0) setDestacado(indice);
  };

  const aoPressionar = (evento) => {
    const { key } = evento;
    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        evento.preventDefault();
        abrir();
      }
      return;
    }
    if (key === 'Escape') {
      // Impede que o Esc também feche o modal em que o seletor está.
      evento.preventDefault();
      evento.stopPropagation();
      fechar();
    } else if (key === 'Tab') {
      fechar(false);
    } else if (key === 'ArrowDown' || key === 'ArrowUp') {
      evento.preventDefault();
      setDestacado((atual) => proximaHabilitada(atual, key === 'ArrowDown' ? 1 : -1));
    } else if (key === 'Home' || key === 'End') {
      evento.preventDefault();
      setDestacado(key === 'Home' ? proximaHabilitada(-1, 1) : proximaHabilitada(opcoes.length, -1));
    } else if (key === 'Enter' || key === ' ') {
      evento.preventDefault();
      escolher(destacado);
    } else if (key.length === 1) {
      buscarPorTexto(key);
    }
  };

  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicarFora = (evento) => {
      if (!gatilho.current?.contains(evento.target) && !lista.current?.contains(evento.target)) fechar(false);
    };
    const aoRolar = (evento) => {
      if (!lista.current?.contains(evento.target)) fechar(false);
    };
    const aoRedimensionar = () => fechar(false);
    document.addEventListener('pointerdown', aoClicarFora);
    document.addEventListener('scroll', aoRolar, true);
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      document.removeEventListener('pointerdown', aoClicarFora);
      document.removeEventListener('scroll', aoRolar, true);
      window.removeEventListener('resize', aoRedimensionar);
    };
  }, [aberto]);

  useLayoutEffect(() => {
    if (aberto && destacado >= 0) lista.current?.children[destacado]?.scrollIntoView({ block: 'nearest' });
  }, [aberto, destacado]);

  return (
    <div className={`seletor ${aberto ? 'seletor--aberto' : ''}`}>
      <button
        ref={gatilho}
        type="button"
        className="seletor__gatilho"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-labelledby={idRotulo}
        aria-activedescendant={aberto && destacado >= 0 ? `${idLista}-${destacado}` : undefined}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={aoPressionar}
      >
        <span className="seletor__valor">
          {selecionada ? selecionada.rotulo : 'Selecione'}
          {selecionada?.complemento && <span className="seletor__complemento">{selecionada.complemento}</span>}
        </span>
        <ChevronDown size={16} className="seletor__seta" aria-hidden="true" />
      </button>
      {aberto && posicao && (
        <ul
          ref={lista}
          id={idLista}
          className="seletor__lista"
          role="listbox"
          aria-labelledby={idRotulo}
          style={posicao}
        >
          {opcoes.map((opcao, indice) => {
            const eSelecionada = indice === indiceSelecionado;
            return (
              <li
                key={opcao.valor}
                id={`${idLista}-${indice}`}
                role="option"
                aria-selected={eSelecionada}
                aria-disabled={opcao.desabilitada || undefined}
                className={[
                  'seletor__opcao',
                  eSelecionada && 'seletor__opcao--selecionada',
                  indice === destacado && 'seletor__opcao--destacada',
                  opcao.desabilitada && 'seletor__opcao--desabilitada',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onPointerEnter={() => !opcao.desabilitada && setDestacado(indice)}
                onClick={() => escolher(indice)}
              >
                <span className="seletor__texto">
                  <span className="seletor__rotulo">{opcao.rotulo}</span>
                  {opcao.complemento && <span className="seletor__complemento">{opcao.complemento}</span>}
                </span>
                {eSelecionada && <Check size={15} className="seletor__marca" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
