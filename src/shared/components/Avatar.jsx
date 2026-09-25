import { iniciais } from '../utils/texto.js';

const QUANTIDADE_TONS = 5;

export default function Avatar({ nome, indice = 0, tamanho = 'medio' }) {
  return (
    <span className={`avatar avatar--${tamanho} avatar--tom-${Math.abs(indice) % QUANTIDADE_TONS}`} aria-hidden="true">
      {iniciais(nome)}
    </span>
  );
}
