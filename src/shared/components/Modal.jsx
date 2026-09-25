import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ titulo, descricao, children, aoFechar, largo = false }) {
  const referencia = useRef(null);

  useEffect(() => {
    const dialogo = referencia.current;
    dialogo.showModal();
    return () => dialogo.close();
  }, []);

  return (
    <dialog
      ref={referencia}
      className={`modal ${largo ? 'modal--largo' : ''}`}
      onCancel={(evento) => {
        evento.preventDefault();
        aoFechar();
      }}
      onClick={(evento) => evento.target === evento.currentTarget && aoFechar()}
    >
      <header className="modal__cabecalho">
        <div>
          <h2>{titulo}</h2>
          {descricao && <p className="texto-suave">{descricao}</p>}
        </div>
        <button type="button" className="botao-icone" aria-label="Fechar" onClick={aoFechar}>
          <X size={18} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
