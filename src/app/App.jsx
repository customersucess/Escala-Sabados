import { useState } from 'react';
import { CalendarDays, ChevronRight, Upload, Users } from 'lucide-react';
import BarraLateral from './layout/BarraLateral.jsx';
import { useAviso } from './hooks/useAviso.js';
import { useDadosAplicacao } from './hooks/useDadosAplicacao.js';
import { useFerramentaConsultaEscala } from './hooks/useFerramentaConsultaEscala.js';
import { useTema } from './hooks/useTema.js';
import Aviso from '../shared/components/Aviso.jsx';
import BotaoTema from '../shared/components/BotaoTema.jsx';
import ModalConfirmacao from '../shared/components/ModalConfirmacao.jsx';
import PaginaEscala from '../features/escala/components/PaginaEscala.jsx';
import PaginaAtendentes from '../features/atendentes/components/PaginaAtendentes.jsx';
import PaginaImportacao from '../features/importacao/components/PaginaImportacao.jsx';

const ABAS = [
  {
    id: 'escala',
    icone: CalendarDays,
    titulo: 'Escala de sábados',
    subtitulo: 'Seu time no lugar certo, em cada sábado do mês.',
  },
  {
    id: 'atendentes',
    icone: Users,
    titulo: 'Gerenciar atendentes',
    subtitulo: 'Cuide da equipe e mantenha a disponibilidade em dia.',
  },
  {
    id: 'importacao',
    icone: Upload,
    titulo: 'Importar funcionários',
    subtitulo: 'Cadastre novos atendentes e atualize status e ausências pela planilha.',
  },
];

export default function App() {
  const { atendentes, escalas, erroCarregamento, salvar } = useDadosAplicacao();
  const { aviso, notificar, dispensar, executar } = useAviso();
  const { tema, alternarTema } = useTema();
  const [abaAtual, setAbaAtual] = useState('escala');
  const [confirmacao, setConfirmacao] = useState(null);
  useFerramentaConsultaEscala(atendentes, escalas);

  const aba = ABAS.find((item) => item.id === abaAtual);
  const propsCompartilhadas = {
    atendentes,
    escalas,
    salvar,
    notificar,
    executar,
    confirmar: setConfirmacao,
    bloqueado: !!erroCarregamento,
    irPara: setAbaAtual,
  };

  return (
    <div className="aplicacao">
      <BarraLateral abas={ABAS} abaAtual={abaAtual} aoSelecionar={setAbaAtual} />
      <div className="area-trabalho">
        <header className="barra-superior">
          <div className="barra-superior__trilha">
            <span className="texto-suave">Planejamento</span>
            <ChevronRight size={14} />
            <span>{aba.titulo}</span>
          </div>
          <div className="barra-superior__acoes">
            <span className="barra-superior__status">
              <span className="ponto-status" /> Salvo neste navegador
            </span>
            <BotaoTema tema={tema} aoAlternar={alternarTema} />
          </div>
        </header>

        <main className="conteudo">
          <div className="cabecalho-pagina">
            <span className="sobretitulo">Gestão da equipe</span>
            <h1>{aba.titulo}</h1>
            <p>{aba.subtitulo}</p>
          </div>

          {erroCarregamento && (
            <Aviso tipo="erro">{erroCarregamento} Alterações estão bloqueadas para evitar perda de dados.</Aviso>
          )}
          {aviso && (
            <Aviso key={aviso.id} tipo={aviso.tipo} aoFechar={dispensar}>
              {aviso.texto}
            </Aviso>
          )}

          <div key={abaAtual} className="transicao-pagina">
            {abaAtual === 'escala' && <PaginaEscala {...propsCompartilhadas} />}
            {abaAtual === 'atendentes' && <PaginaAtendentes {...propsCompartilhadas} />}
            {abaAtual === 'importacao' && <PaginaImportacao {...propsCompartilhadas} />}
          </div>

          <footer className="rodape-pagina">
            <strong>Sempre Tecnologia</strong>
            <span>Mais cuidado com o time. Mais sucesso para o cliente.</span>
          </footer>
        </main>
      </div>

      {confirmacao && (
        <ModalConfirmacao
          {...confirmacao}
          aoFechar={() => setConfirmacao(null)}
          aoConfirmar={() => {
            const { acao } = confirmacao;
            setConfirmacao(null);
            executar(acao);
          }}
        />
      )}
    </div>
  );
}
