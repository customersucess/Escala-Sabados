import { UserPlus, RefreshCw } from 'lucide-react';
import Etiqueta from '../../../shared/components/Etiqueta.jsx';
import Modal from '../../../shared/components/Modal.jsx';
import { formatarData, hoje } from '../../../shared/utils/datas.js';
import { descreverStatus, ROTULOS_STATUS } from '../../atendentes/domain/atendente.js';

export default function ModalConferenciaImportacao({ resultado, nomeArquivo, aoConfirmar, aoFechar }) {
  const { entradas, erros, avisos, cadastrados, atualizados, formato } = resultado;

  return (
    <Modal titulo="Conferir importação" descricao={`${nomeArquivo} · ${formato}`} aoFechar={aoFechar} largo>
      <div className="formulario">
        <div className="resumo-importacao">
          <div>
            <UserPlus size={18} />
            <strong>{cadastrados}</strong>
            <span>novo(s) cadastro(s)</span>
          </div>
          <div>
            <RefreshCw size={18} />
            <strong>{atualizados}</strong>
            <span>atualização(ões) de status</span>
          </div>
        </div>

        {erros.length > 0 && (
          <div className="mensagem-erro">
            <strong>Corrija a planilha antes de importar.</strong>
            {erros.map((erro) => (
              <p key={erro}>{erro}</p>
            ))}
          </div>
        )}
        {avisos.length > 0 && (
          <div className="aviso aviso--neutro aviso--lista">
            <strong>Atenção</strong>
            {avisos.map((aviso) => (
              <p key={aviso}>{aviso}</p>
            ))}
          </div>
        )}

        <div className="previa-importacao">
          {entradas.map((entrada) => {
            const status = descreverStatus(entrada.atendente, hoje());
            return (
              <div className="previa-importacao__item" key={entrada.id}>
                <div className="linha-historico">
                  <strong>{entrada.atendente.nome}</strong>
                  <div className="previa-importacao__etiquetas">
                    <Etiqueta variante={status.chave} dica={status.descricao}>
                      {status.rotulo}
                    </Etiqueta>
                    <Etiqueta variante={entrada.acao === 'cadastrar' ? 'experiencia' : 'neutra'}>
                      {entrada.acao === 'cadastrar' ? 'Novo cadastro' : 'Atualizar'}
                    </Etiqueta>
                  </div>
                </div>
                <p className="texto-pequeno texto-suave">
                  Admissão: {formatarData(entrada.atendente.admissao)} · Status sem período:{' '}
                  {ROTULOS_STATUS[entrada.atendente.status]}
                </p>
                {entrada.atendente.ausencias.map((ausencia) => (
                  <p className="texto-pequeno" key={ausencia.id}>
                    {ROTULOS_STATUS[ausencia.tipo]}: {formatarData(ausencia.inicio)} a {formatarData(ausencia.fim)}
                    {ausencia.observacao && ` (${ausencia.observacao})`}
                  </p>
                ))}
              </div>
            );
          })}
        </div>

        <footer className="formulario__rodape">
          <button type="button" className="botao botao--secundario" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="botao botao--primario"
            disabled={!!erros.length || !entradas.length}
            onClick={aoConfirmar}
          >
            Importar funcionários
          </button>
        </footer>
      </div>
    </Modal>
  );
}
