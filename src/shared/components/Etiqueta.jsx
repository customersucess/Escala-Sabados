import Dica from './Dica.jsx';

/** Etiqueta em formato pílula. Com `dica`, exibe tooltip explicativo ao passar o mouse ou focar. */
export default function Etiqueta({ variante = 'neutra', dica, children }) {
  const conteudo = <span className={`etiqueta etiqueta--${variante}`}>{children}</span>;
  return dica ? <Dica texto={dica}>{conteudo}</Dica> : conteudo;
}
