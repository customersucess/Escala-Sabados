import { useState } from 'react';
import Modal from '../../../shared/components/Modal.jsx';
import { formatarData, hoje } from '../../../shared/utils/datas.js';
import { estaEmExperiencia, ROTULOS_STATUS, statusNaData } from '../../atendentes/domain/atendente.js';
import { disponivelHoje, estaElegivel, idsBloqueadosNaData } from '../domain/regrasEscala.js';

function motivoIndisponivel(atendente, data, bloqueados, dataReferencia) {
  if (!disponivelHoje(atendente, dataReferencia)) {
    return `${ROTULOS_STATUS[statusNaData(atendente, dataReferencia)].toLowerCase()} hoje`;
  }
  if (bloqueados.includes(atendente.id)) return 'descanso do rodízio';
  const status = statusNaData(atendente, data);
  if (status !== 'ativo') return ROTULOS_STATUS[status].toLowerCase();
  return 'admissão recente ou pendente';
}

export default function ModalEditarDupla({ sabado, atendentes, escalas, aoSalvar, aoFechar }) {
  const [selecionados, setSelecionados] = useState([...sabado.atendentes]);
  const [erro, setErro] = useState('');
  const bloqueados = idsBloqueadosNaData(sabado.data, escalas);
  const dataReferencia = hoje();

  const salvar = (evento) => {
    evento.preventDefault();
    try {
      aoSalvar(selecionados);
    } catch (falha) {
      setErro(falha.message);
    }
  };

  return (
    <Modal
      titulo={`Editar dupla · ${formatarData(sabado.data)}`}
      descricao="Escolha dois atendentes disponíveis. As regras são verificadas ao salvar."
      aoFechar={aoFechar}
    >
      <form className="formulario" onSubmit={salvar}>
        {[0, 1].map((vaga) => (
          <label key={vaga} className="campo">
            Atendente {vaga + 1}
            <select
              value={selecionados[vaga]}
              onChange={(evento) =>
                setSelecionados(selecionados.map((id, indice) => (indice === vaga ? evento.target.value : id)))
              }
            >
              {atendentes.map((atendente) => {
                // Quem já está na dupla pode permanecer; para incluir, precisa estar ativo hoje.
                const jaNaDupla = sabado.atendentes.includes(atendente.id);
                const elegivel =
                  estaElegivel(atendente, sabado.data, bloqueados) &&
                  (jaNaDupla || disponivelHoje(atendente, dataReferencia));
                let complemento = '';
                if (!elegivel)
                  complemento = ` — indisponível (${motivoIndisponivel(atendente, sabado.data, bloqueados, dataReferencia)})`;
                else if (estaEmExperiencia(atendente, sabado.data)) complemento = ' — em experiência';
                return (
                  <option key={atendente.id} value={atendente.id} disabled={!elegivel}>
                    {atendente.nome}
                    {complemento}
                  </option>
                );
              })}
            </select>
          </label>
        ))}
        {erro && (
          <p className="mensagem-erro" role="alert">
            {erro}
          </p>
        )}
        <footer className="formulario__rodape">
          <button type="button" className="botao botao--secundario" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" className="botao botao--primario">
            Salvar dupla
          </button>
        </footer>
      </form>
    </Modal>
  );
}
