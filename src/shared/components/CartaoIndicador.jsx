export default function CartaoIndicador({ icone: Icone, rotulo, valor, sufixo, detalhe, tom }) {
  return (
    <article className="cartao-indicador">
      <div className="cartao-indicador__topo">
        <span>{rotulo}</span>
        <span className={`cartao-indicador__icone tom--${tom}`}>
          <Icone size={17} />
        </span>
      </div>
      <p className="cartao-indicador__valor">
        {valor}
        {sufixo && <span>{sufixo}</span>}
      </p>
      <p className="cartao-indicador__detalhe">{detalhe}</p>
    </article>
  );
}
