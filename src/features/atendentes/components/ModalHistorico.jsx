import Etiqueta from '../../../shared/components/Etiqueta.jsx';
import Modal from '../../../shared/components/Modal.jsx';
import { formatarData } from '../../../shared/utils/datas.js';
import { ROTULOS_STATUS } from '../domain/atendente.js';

export default function ModalHistorico({ atendente, atendentes, escalas, aoFechar }) {
  const ausencias = [...atendente.ausencias].sort((a, b) => b.inicio.localeCompare(a.inicio));
  const sabadosTrabalhados = Object.values(escalas)
    .flatMap((escala) => escala.sabados)
    .filter((sabado) => sabado.atendentes.includes(atendente.id))
    .sort((a, b) => b.data.localeCompare(a.data));
  const parceiro = (sabado) =>
    atendentes.find((item) => item.id === sabado.atendentes.find((id) => id !== atendente.id))?.nome ?? '—';

  return (
    <Modal titulo={`Histórico · ${atendente.nome}`} aoFechar={aoFechar}>
      <div className="formulario lista-historico">
        <h3>Ausências registradas</h3>
        {ausencias.length ? (
          ausencias.map((ausencia) => (
            <div className="linha-historico" key={ausencia.id}>
              <Etiqueta variante={ausencia.tipo}>{ROTULOS_STATUS[ausencia.tipo]}</Etiqueta>
              <span>
                {formatarData(ausencia.inicio)} a {formatarData(ausencia.fim)}
              </span>
            </div>
          ))
        ) : (
          <p className="texto-suave">Nenhuma ausência registrada.</p>
        )}
        <h3>Sábados escalados</h3>
        {sabadosTrabalhados.length ? (
          sabadosTrabalhados.map((sabado) => (
            <div className="linha-historico" key={sabado.data}>
              <span>{formatarData(sabado.data)}</span>
              <span className="texto-suave">Com {parceiro(sabado)}</span>
            </div>
          ))
        ) : (
          <p className="texto-suave">Nenhum sábado escalado.</p>
        )}
      </div>
    </Modal>
  );
}
