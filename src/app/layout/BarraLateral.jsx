import { CalendarCheck2 } from 'lucide-react';

export default function BarraLateral({ abas, abaAtual, aoSelecionar }) {
  return (
    <aside className="barra-lateral">
      <a
        className="barra-lateral__marca"
        href="#"
        onClick={(evento) => {
          evento.preventDefault();
          aoSelecionar('escala');
        }}
        aria-label="Sempre Tecnologia — início"
      >
        <img src="/sempre-logo.png" alt="Sempre Tecnologia" />
      </a>
      <span className="barra-lateral__rotulo">Sucesso do Cliente</span>
      <nav className="barra-lateral__menu" aria-label="Menu principal">
        {abas.map(({ id, icone: Icone, titulo }) => (
          <button
            key={id}
            type="button"
            onClick={() => aoSelecionar(id)}
            className={`item-menu ${abaAtual === id ? 'item-menu--ativo' : ''}`}
            aria-current={abaAtual === id ? 'page' : undefined}
          >
            <Icone size={19} />
            <span>{titulo}</span>
          </button>
        ))}
      </nav>
      <div className="barra-lateral__destaque">
        <span className="barra-lateral__destaque-icone">
          <CalendarCheck2 size={20} />
        </span>
        <h3>
          Organização e clareza
        </h3>
        <p>Planeje a escala no ultimo dia do mês</p>
      </div>
      <div className="barra-lateral__perfil">
        <span className="barra-lateral__perfil-avatar">SC</span>
        <div>
          <strong>Sucesso do Cliente</strong>
          <small>Sempre Tecnologia</small>
        </div>
      </div>
    </aside>
  );
}
