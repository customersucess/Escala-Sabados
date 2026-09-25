export default function Regra({ numero, titulo, children }) {
  return (
    <div className="regra">
      <span className="regra__numero">{numero}</span>
      <div>
        <h4>{titulo}</h4>
        <p>{children}</p>
      </div>
    </div>
  );
}
