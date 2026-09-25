import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ICONES = { sucesso: CheckCircle2, erro: AlertCircle, neutro: Info };

export default function Aviso({ tipo = 'neutro', children, aoFechar }) {
  const Icone = ICONES[tipo];
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <Icone size={18} />
      <div className="aviso__texto">{children}</div>
      {aoFechar && (
        <button
          type="button"
          className="botao-icone botao-icone--pequeno"
          aria-label="Dispensar aviso"
          onClick={aoFechar}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
