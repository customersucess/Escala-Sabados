import { Moon, Sun } from 'lucide-react';

export default function BotaoTema({ tema, aoAlternar }) {
  const escuro = tema === 'escuro';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={escuro}
      aria-label="Tema escuro"
      title={escuro ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      className="alternar-tema"
      onClick={aoAlternar}
    >
      <span className="alternar-tema__trilho" aria-hidden="true">
        <Sun size={14} />
        <Moon size={14} />
        <span className="alternar-tema__botao">
          <Sun size={15} className="alternar-tema__icone-sol" />
          <Moon size={15} className="alternar-tema__icone-lua" />
        </span>
      </span>
    </button>
  );
}
