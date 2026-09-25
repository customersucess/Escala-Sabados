import { useState } from 'react';
import { History, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import Avatar from '../../../shared/components/Avatar.jsx';
import Etiqueta from '../../../shared/components/Etiqueta.jsx';
import { formatarData, hoje } from '../../../shared/utils/datas.js';
import { normalizarTexto } from '../../../shared/utils/texto.js';
import { descreverExperiencia, descreverStatus, podeSerExcluido, separarParaExclusao } from '../domain/atendente.js';
import FormularioAtendente from './FormularioAtendente.jsx';
import ModalHistorico from './ModalHistorico.jsx';

const FILTROS = [
  { id: 'todos', rotulo: 'Todos', aceita: () => true },
  { id: 'disponiveis', rotulo: 'Disponíveis', aceita: (status) => status === 'ativo' },
  { id: 'ausentes', rotulo: 'Ausentes', aceita: (status) => !['ativo', 'desligado'].includes(status) },
  { id: 'desligados', rotulo: 'Desligados', aceita: (status) => status === 'desligado' },
];

export default function PaginaAtendentes({ atendentes, escalas, salvar, notificar, confirmar, bloqueado }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [emEdicao, setEmEdicao] = useState(null);
  const [historico, setHistorico] = useState(null);
  const dataReferencia = hoje();

  const linhas = atendentes.map((atendente, indice) => ({
    atendente,
    indice,
    status: descreverStatus(atendente, dataReferencia),
    experiencia: descreverExperiencia(atendente, dataReferencia),
  }));
  const filtroAtual = FILTROS.find((item) => item.id === filtro);
  const visiveis = linhas.filter(
    ({ atendente, status }) =>
      filtroAtual.aceita(status.chave) && normalizarTexto(atendente.nome).includes(normalizarTexto(busca)),
  );

  const salvarAtendente = (atendente) => {
    const duplicado = atendentes.some(
      (outro) => outro.id !== atendente.id && normalizarTexto(outro.nome) === normalizarTexto(atendente.nome),
    );
    if (duplicado) throw new Error('Já existe um atendente com este nome.');
    const existe = atendentes.some((outro) => outro.id === atendente.id);
    salvar({
      atendentes: existe
        ? atendentes.map((outro) => (outro.id === atendente.id ? atendente : outro))
        : [...atendentes, atendente],
    });
    setEmEdicao(null);
    notificar('Atendente salvo. Escalas existentes serão verificadas ao abrir cada mês.');
  };

  const excluirAtendente = (atendente) => {
    if (!podeSerExcluido(atendente, escalas)) {
      notificar(
        `${atendente.nome} já foi escalado. Altere o status para Desligado para conseguir excluir o cadastro.`,
        'erro',
      );
      return;
    }
    confirmar({
      titulo: 'Excluir atendente?',
      texto: `O cadastro de ${atendente.nome} será excluído. Escalas passadas continuam salvas.`,
      rotuloConfirmar: 'Excluir',
      perigoso: true,
      acao: () => {
        salvar({ atendentes: atendentes.filter((outro) => outro.id !== atendente.id) });
        notificar('Atendente excluído.');
      },
    });
  };

  const excluirTodos = () => {
    const { excluiveis, mantidos } = separarParaExclusao(atendentes, escalas);
    if (!excluiveis.length) {
      notificar(
        'Nenhum atendente pode ser excluído agora. Quem já foi escalado precisa estar com o status Desligado.',
        'erro',
      );
      return;
    }
    const nomesMantidos = mantidos.map((atendente) => atendente.nome).join(', ');
    confirmar({
      titulo: mantidos.length ? `Excluir ${excluiveis.length} atendente(s)?` : 'Excluir todos os atendentes?',
      texto: mantidos.length
        ? `${excluiveis.length} cadastro(s) serão excluídos. ${mantidos.length} atendente(s) já escalado(s) e sem status Desligado serão mantidos: ${nomesMantidos}.`
        : `Os ${excluiveis.length} cadastros serão excluídos de uma vez. Essa ação não pode ser desfeita. Escalas passadas continuam salvas.`,
      rotuloConfirmar: mantidos.length ? `Excluir ${excluiveis.length}` : 'Excluir todos',
      perigoso: true,
      acao: () => {
        salvar({ atendentes: mantidos });
        setBusca('');
        setFiltro('todos');
        notificar(
          mantidos.length
            ? `${excluiveis.length} atendente(s) excluído(s). ${mantidos.length} mantido(s) até serem desligados.`
            : 'Todos os atendentes foram excluídos.',
        );
      },
    });
  };

  return (
    <>
      <section className="painel">
        <div className="painel__barra">
          <h2>
            Seu time <span className="contador">{atendentes.length}</span>
          </h2>
          <div className="painel__acoes">
            <label className="campo-busca">
              <Search size={17} />
              <input
                aria-label="Buscar atendente"
                placeholder="Buscar atendente…"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
              />
            </label>
            {atendentes.length > 0 && (
              <button
                type="button"
                className="botao botao--secundario botao--contorno-perigo"
                disabled={bloqueado}
                onClick={excluirTodos}
              >
                <Trash2 size={16} />
                Excluir todos
              </button>
            )}
            <button
              type="button"
              className="botao botao--primario"
              disabled={bloqueado}
              onClick={() => setEmEdicao({})}
            >
              <Plus size={17} />
              Novo atendente
            </button>
          </div>
        </div>

        {atendentes.length ? (
          <>
            <div className="filtros" role="tablist" aria-label="Filtrar por status">
              {FILTROS.map((item) => {
                const quantidade = linhas.filter(({ status }) => item.aceita(status.chave)).length;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={filtro === item.id}
                    className={`filtro ${filtro === item.id ? 'filtro--ativo' : ''}`}
                    onClick={() => setFiltro(item.id)}
                  >
                    {item.rotulo}
                    <span>{quantidade}</span>
                  </button>
                );
              })}
            </div>
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Atendente</th>
                    <th>Admissão</th>
                    <th>Status hoje</th>
                    <th>Experiência</th>
                    <th className="tabela__acoes">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map(({ atendente, indice, status, experiencia }) => (
                    <tr key={atendente.id}>
                      <td>
                        <div className="celula-atendente">
                          <Avatar nome={atendente.nome} indice={indice} />
                          <strong>{atendente.nome}</strong>
                        </div>
                      </td>
                      <td>{formatarData(atendente.admissao)}</td>
                      <td>
                        <Etiqueta variante={status.chave} dica={status.descricao}>
                          {status.rotulo}
                        </Etiqueta>
                      </td>
                      <td>
                        <Etiqueta variante={experiencia.chave} dica={experiencia.descricao}>
                          {experiencia.rotulo}
                        </Etiqueta>
                      </td>
                      <td>
                        <div className="acoes-linha">
                          <button
                            type="button"
                            className="botao-icone"
                            aria-label={`Histórico de ${atendente.nome}`}
                            title="Histórico"
                            onClick={() => setHistorico(atendente)}
                          >
                            <History size={17} />
                          </button>
                          <button
                            type="button"
                            className="botao-icone"
                            aria-label={`Editar ${atendente.nome}`}
                            title="Editar"
                            disabled={bloqueado}
                            onClick={() => setEmEdicao(atendente)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="botao-icone botao-icone--perigo"
                            aria-label={`Excluir ${atendente.nome}`}
                            title="Excluir"
                            disabled={bloqueado}
                            onClick={() => excluirAtendente(atendente)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visiveis.length && <p className="vazio-inline">Nenhum atendente encontrado.</p>}
            </div>
          </>
        ) : (
          <div className="estado-vazio">
            <span className="estado-vazio__icone">
              <Users size={30} />
            </span>
            <h2>Sua equipe começa aqui</h2>
            <p>
              Adicione nome, admissão e ausências de cada atendente.
              <br />
              Depois, deixe a escala com a gente.
            </p>
            <button
              type="button"
              className="botao botao--primario"
              disabled={bloqueado}
              onClick={() => setEmEdicao({})}
            >
              <Plus size={17} />
              Cadastrar atendente
            </button>
          </div>
        )}
      </section>

      {emEdicao && (
        <FormularioAtendente
          atendente={emEdicao.id ? emEdicao : null}
          aoFechar={() => setEmEdicao(null)}
          aoSalvar={salvarAtendente}
        />
      )}
      {historico && (
        <ModalHistorico
          atendente={historico}
          atendentes={atendentes}
          escalas={escalas}
          aoFechar={() => setHistorico(null)}
        />
      )}
    </>
  );
}
