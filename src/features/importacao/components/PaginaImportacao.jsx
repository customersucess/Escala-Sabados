import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Info, Plus, Upload } from 'lucide-react';
import Aviso from '../../../shared/components/Aviso.jsx';
import Etiqueta from '../../../shared/components/Etiqueta.jsx';
import Regra from '../../../shared/components/Regra.jsx';
import { baixarModeloImportacao } from '../services/exportacaoPlanilha.js';
import { aplicarImportacao, lerArquivoImportacao } from '../services/leitorPlanilha.js';
import ModalConferenciaImportacao from './ModalConferenciaImportacao.jsx';

export default function PaginaImportacao({ atendentes, salvar, notificar, executar, bloqueado, irPara }) {
  const campoArquivo = useRef(null);
  const [lendo, setLendo] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [nomeArquivo, setNomeArquivo] = useState('');

  const importarArquivo = async (arquivo) => {
    if (!arquivo) return;
    setLendo(true);
    try {
      setNomeArquivo(arquivo.name);
      setResultado(await lerArquivoImportacao(arquivo, atendentes));
    } catch (erro) {
      notificar(erro.message, 'erro');
    } finally {
      setLendo(false);
      if (campoArquivo.current) campoArquivo.current.value = '';
    }
  };

  const confirmarImportacao = () =>
    executar(() => {
      salvar({ atendentes: aplicarImportacao(atendentes, resultado) });
      notificar(
        `${resultado.cadastrados} funcionário(s) cadastrado(s) e ${resultado.atualizados} atualizado(s). Revise as escalas dos meses afetados.`,
      );
      setResultado(null);
      irPara('atendentes');
    });

  return (
    <>
      <div className="layout-importacao">
        <section className="painel painel--espacado">
          <div className="cabecalho-secao">
            <h2>Planilha de funcionários</h2>
            <Etiqueta>.xlsx</Etiqueta>
          </div>
          <div
            className={`area-envio ${arrastando ? 'area-envio--ativa' : ''}`}
            onDragOver={(evento) => {
              evento.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(evento) => {
              evento.preventDefault();
              setArrastando(false);
              if (!bloqueado) importarArquivo(evento.dataTransfer.files[0]);
            }}
          >
            <span className="area-envio__icone">
              <Upload size={28} />
            </span>
            <h2>Importe sua equipe de uma só vez</h2>
            <p>Arraste sua planilha aqui ou selecione um arquivo.</p>
            <button
              type="button"
              className="botao botao--primario"
              disabled={lendo || bloqueado}
              onClick={() => campoArquivo.current.click()}
            >
              <Plus size={16} />
              {lendo ? 'Lendo planilha…' : 'Selecionar planilha'}
            </button>
            <small>Excel (.xlsx) • Até 5 MB</small>
            <input
              type="file"
              ref={campoArquivo}
              accept=".xlsx"
              hidden
              onChange={(evento) => importarArquivo(evento.target.files[0])}
            />
          </div>
          {!atendentes.length && (
            <Aviso tipo="neutro">Não precisa cadastrar antes. Novos funcionários serão criados pela importação.</Aviso>
          )}
          <div className="linha-modelo">
            <span className="linha-modelo__icone">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <h3>Precisa de um ponto de partida?</h3>
              <p>Use nosso modelo para preencher os dados.</p>
            </div>
            <button type="button" className="botao botao--secundario" onClick={() => executar(baixarModeloImportacao)}>
              <Download size={16} />
              Baixar modelo
            </button>
          </div>
        </section>

        <aside className="cartao-regras">
          <div className="cartao-regras__titulo">
            <Info size={19} />
            <h3>Como funciona a importação</h3>
          </div>
          <Regra numero="01" titulo="Cadastra quem é novo">
            Nomes que ainda não existem no sistema viram novos atendentes automaticamente.
          </Regra>
          <Regra numero="02" titulo="Atualiza quem já existe">
            Para atendentes já cadastrados, apenas status e ausências são atualizados. O histórico é preservado.
          </Regra>
          <Regra numero="03" titulo="Férias e atestados">
            Informe Status com Inicio e Fim. Nesse período o atendente não é escalado e volta sozinho no dia seguinte.
          </Regra>
          <Regra numero="04" titulo="Dois formatos aceitos">
            Lista com Nome, Admissão, Status, Inicio e Fim, ou o controle anual com colunas mensais.
          </Regra>
          <p className="texto-pequeno texto-suave">A importação só é aplicada quando todas as linhas são válidas.</p>
        </aside>
      </div>

      {resultado && (
        <ModalConferenciaImportacao
          resultado={resultado}
          nomeArquivo={nomeArquivo}
          aoConfirmar={confirmarImportacao}
          aoFechar={() => setResultado(null)}
        />
      )}
    </>
  );
}
