import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../../../shared/components/Modal.jsx';
import Seletor from '../../../shared/components/Seletor.jsx';
import { dataValida } from '../../../shared/utils/datas.js';
import { gerarId } from '../../../shared/utils/texto.js';
import { criarAtendenteVazio, ROTULOS_STATUS, TIPOS_AUSENCIA } from '../domain/atendente.js';

const OPCOES_STATUS = Object.entries(ROTULOS_STATUS).map(([valor, rotulo]) => ({ valor, rotulo }));
const OPCOES_AUSENCIA = TIPOS_AUSENCIA.map((valor) => ({ valor, rotulo: ROTULOS_STATUS[valor] }));

function validarFormulario(formulario) {
  if (!formulario.nome.trim() || (formulario.admissao && !dataValida(formulario.admissao))) {
    return 'Preencha o nome e confira a data de admissão.';
  }
  for (const [indice, ausencia] of formulario.ausencias.entries()) {
    if (!dataValida(ausencia.inicio) || !dataValida(ausencia.fim) || ausencia.fim < ausencia.inicio) {
      return 'Confira as datas das ausências.';
    }
    const sobreposta = formulario.ausencias.some(
      (outra, outroIndice) => outroIndice !== indice && outra.inicio <= ausencia.fim && ausencia.inicio <= outra.fim,
    );
    if (sobreposta) return 'Os períodos de ausência não podem se sobrepor.';
  }
  return '';
}

export default function FormularioAtendente({ atendente, aoSalvar, aoFechar }) {
  const [formulario, setFormulario] = useState(atendente ?? criarAtendenteVazio);
  const [erro, setErro] = useState('');
  const idRotulo = useId();

  const atualizar = (campo, valor) => setFormulario({ ...formulario, [campo]: valor });
  const atualizarAusencia = (indice, campo, valor) =>
    atualizar(
      'ausencias',
      formulario.ausencias.map((ausencia, posicao) =>
        posicao === indice ? { ...ausencia, [campo]: valor } : ausencia,
      ),
    );

  const enviar = (evento) => {
    evento.preventDefault();
    const falha = validarFormulario(formulario);
    if (falha) return setErro(falha);
    try {
      aoSalvar({ ...formulario, nome: formulario.nome.trim() });
    } catch (excecao) {
      setErro(excecao.message);
    }
    return undefined;
  };

  return (
    <Modal titulo={atendente ? 'Editar atendente' : 'Novo atendente'} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="formulario">
        <label className="campo">
          Nome completo
          <input
            required
            maxLength={100}
            value={formulario.nome}
            onChange={(evento) => atualizar('nome', evento.target.value)}
            placeholder="Ex.: Maria Oliveira"
            autoFocus
          />
        </label>
        <div className="grade-formulario">
          <label className="campo">
            Data de admissão
            <input
              type="date"
              min="1900-01-01"
              max="9999-12-31"
              value={formulario.admissao}
              onChange={(evento) => atualizar('admissao', evento.target.value)}
            />
          </label>
          <div className="campo">
            <span id={`${idRotulo}-status`}>Status sem período</span>
            <Seletor
              idRotulo={`${idRotulo}-status`}
              valor={formulario.status}
              opcoes={OPCOES_STATUS}
              aoAlterar={(valor) => atualizar('status', valor)}
            />
          </div>
        </div>
        <p className="texto-suave texto-pequeno">
          Sem admissão, o atendente fica fora da escala. Status sem período valem até serem alterados; registre datas
          abaixo para retorno automático.
        </p>

        <div className="cabecalho-secao">
          <h3>Férias, atestados e outras ausências</h3>
          <button
            type="button"
            className="botao-texto"
            onClick={() =>
              atualizar('ausencias', [...formulario.ausencias, { id: gerarId(), tipo: 'ferias', inicio: '', fim: '' }])
            }
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
        <p className="texto-suave texto-pequeno">
          O último dia está incluído. A disponibilidade retorna no dia seguinte.
        </p>

        {formulario.ausencias.map((ausencia, indice) => (
          <div className="linha-ausencia" key={ausencia.id}>
            <div className="campo">
              <span id={`${idRotulo}-motivo-${ausencia.id}`}>Motivo</span>
              <Seletor
                idRotulo={`${idRotulo}-motivo-${ausencia.id}`}
                valor={ausencia.tipo}
                opcoes={OPCOES_AUSENCIA}
                aoAlterar={(valor) => atualizarAusencia(indice, 'tipo', valor)}
              />
            </div>
            <label className="campo">
              Início
              <input
                type="date"
                required
                value={ausencia.inicio}
                onChange={(evento) => atualizarAusencia(indice, 'inicio', evento.target.value)}
              />
            </label>
            <label className="campo">
              Último dia
              <input
                type="date"
                required
                value={ausencia.fim}
                onChange={(evento) => atualizarAusencia(indice, 'fim', evento.target.value)}
              />
            </label>
            <button
              type="button"
              className="botao-icone"
              aria-label="Remover ausência"
              onClick={() =>
                atualizar(
                  'ausencias',
                  formulario.ausencias.filter((_, posicao) => posicao !== indice),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!formulario.ausencias.length && <p className="vazio-inline">Nenhuma ausência registrada.</p>}
        {erro && (
          <p role="alert" className="mensagem-erro">
            {erro}
          </p>
        )}
        <footer className="formulario__rodape">
          <button type="button" className="botao botao--secundario" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="botao botao--primario" type="submit">
            Salvar atendente
          </button>
        </footer>
      </form>
    </Modal>
  );
}
