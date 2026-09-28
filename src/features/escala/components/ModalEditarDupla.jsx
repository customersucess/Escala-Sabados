import { useId, useState } from 'react';
import Modal from '../../../shared/components/Modal.jsx';
import Seletor from '../../../shared/components/Seletor.jsx';
import { formatarData } from '../../../shared/utils/datas.js';
import { estaEmExperiencia, ROTULOS_STATUS, statusNaData } from '../../atendentes/domain/atendente.js';
import { idsBloqueadosNaData, podeSerSelecionadoNaData } from '../domain/regrasEscala.js';

function motivoIndisponivel(atendente, data, bloqueados) {
  if (bloqueados.includes(atendente.id)) return 'descanso do rodízio';
  const status = statusNaData(atendente, data);
  if (status !== 'ativo') return ROTULOS_STATUS[status].toLowerCase();
  return 'admissão recente ou pendente';
}

export default function ModalEditarDupla({ sabado, atendentes, escalas, aoSalvar, aoFechar }) {
  const [selecionados, setSelecionados] = useState([...sabado.atendentes]);
  const [erro, setErro] = useState('');
  const idRotulo = useId();
  const bloqueados = idsBloqueadosNaData(sabado.data, escalas);

  const opcoes = atendentes.map((atendente) => {
    const elegivel = podeSerSelecionadoNaData(atendente, sabado.data, bloqueados);
    let complemento = '';
    if (!elegivel)
      complemento = `indisponível (${motivoIndisponivel(atendente, sabado.data, bloqueados)})`;
    else if (estaEmExperiencia(atendente, sabado.data)) complemento = 'em experiência';
    return { valor: atendente.id, rotulo: atendente.nome, complemento, desabilitada: !elegivel };
  });

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
          <div key={vaga} className="campo">
            <span id={`${idRotulo}-${vaga}`}>Atendente {vaga + 1}</span>
            <Seletor
              idRotulo={`${idRotulo}-${vaga}`}
              valor={selecionados[vaga]}
              opcoes={opcoes}
              aoAlterar={(id) => setSelecionados(selecionados.map((atual, indice) => (indice === vaga ? id : atual)))}
            />
          </div>
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
