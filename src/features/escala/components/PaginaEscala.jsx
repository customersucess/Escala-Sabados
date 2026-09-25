import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Moon,
  Shuffle,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import CartaoIndicador from '../../../shared/components/CartaoIndicador.jsx';
import Etiqueta from '../../../shared/components/Etiqueta.jsx';
import {
  deslocarMes,
  formatarData,
  hoje,
  mesAtual,
  mesValido,
  rotuloMes,
  sabadosDoMes,
} from '../../../shared/utils/datas.js';
import { descreverStatus, ROTULOS_STATUS, statusNaData } from '../../atendentes/domain/atendente.js';
import { exportarEscala } from '../../importacao/services/exportacaoPlanilha.js';
import { gerarEscala } from '../domain/gerarEscala.js';
import {
  ATENDENTES_POR_SABADO,
  dataReferenciaGeracao,
  disponivelHoje,
  idsEmDescanso,
  validarEscala,
} from '../domain/regrasEscala.js';
import CartaoSabado from './CartaoSabado.jsx';
import ModalEditarDupla from './ModalEditarDupla.jsx';
import PainelLateralEscala from './PainelLateralEscala.jsx';

const MES_MINIMO = '1900-01';
const MES_MAXIMO = '9999-12';
const ATRASO_ANIMACAO_GERACAO_MS = 350;

export default function PaginaEscala({
  atendentes,
  escalas,
  salvar,
  notificar,
  executar,
  confirmar,
  bloqueado,
  irPara,
}) {
  const [mes, setMes] = useState(mesAtual);
  const [gerando, setGerando] = useState(false);
  const [sabadoEmEdicao, setSabadoEmEdicao] = useState(null);

  const datas = sabadosDoMes(mes);
  const escala = escalas[mes];
  const emDescanso = idsEmDescanso(mes, escalas);
  const dataHoje = hoje();
  // Disponibilidade avaliada no dia em que a escala do mês é montada (último dia útil do mês anterior).
  const dataReferencia = dataReferenciaGeracao(mes, dataHoje);
  const referenciaEHoje = dataReferencia === dataHoje;
  const quandoReferencia = referenciaEHoje ? 'hoje' : `em ${formatarData(dataReferencia)}`;
  const problemas = escala ? validarEscala(escala, atendentes, escalas, { aPartirDe: dataHoje }) : [];
  const ativosHoje = atendentes.filter((atendente) => statusNaData(atendente, dataHoje) === 'ativo');
  const foraDaGeracao = atendentes
    .filter((atendente) => !disponivelHoje(atendente, dataReferencia) && atendente.status !== 'desligado')
    .map((atendente) => ({ atendente, status: descreverStatus(atendente, dataReferencia) }));
  const vagasPreenchidas = escala ? escala.sabados.reduce((total, sabado) => total + sabado.atendentes.length, 0) : 0;

  const gerarMes = () => {
    setGerando(true);
    setTimeout(() => {
      executar(() => {
        salvar({ escalas: { ...escalas, [mes]: gerarEscala(mes, atendentes, escalas, { dataReferencia }) } });
        notificar('Escala sorteada e salva. Todos os sábados têm uma dupla válida.');
      });
      setGerando(false);
    }, ATRASO_ANIMACAO_GERACAO_MS);
  };

  const solicitarGeracao = () =>
    escala
      ? confirmar({
          titulo: 'Sortear novamente?',
          texto: 'A escala deste mês será substituída por um novo sorteio, incluindo os ajustes manuais.',
          rotuloConfirmar: 'Sortear novamente',
          acao: gerarMes,
        })
      : gerarMes();

  const excluirEscala = () =>
    confirmar({
      titulo: 'Excluir escala do mês?',
      texto: `A escala de ${rotuloMes(mes)} será excluída. Os atendentes e as outras escalas serão mantidos.`,
      rotuloConfirmar: 'Excluir escala',
      perigoso: true,
      acao: () => {
        const restantes = { ...escalas };
        delete restantes[mes];
        salvar({ escalas: restantes });
        notificar('Escala excluída.');
      },
    });

  const salvarDupla = (selecionados) => {
    const alterada = {
      ...escala,
      sabados: escala.sabados.map((sabado) =>
        sabado.data === sabadoEmEdicao.data ? { ...sabado, atendentes: selecionados } : sabado,
      ),
      atualizadoEm: new Date().toISOString(),
    };
    const incluidos = selecionados.filter((id) => !sabadoEmEdicao.atendentes.includes(id));
    const indisponivel = incluidos
      .map((id) => atendentes.find((atendente) => atendente.id === id))
      .find((atendente) => atendente && !disponivelHoje(atendente, dataReferencia));
    if (indisponivel) {
      const status = ROTULOS_STATUS[statusNaData(indisponivel, dataReferencia)].toLowerCase();
      throw new Error(
        `${indisponivel.nome} está com status ${status} ${quandoReferencia} e só pode ser escalado após o retorno.`,
      );
    }
    const proximas = { ...escalas, [mes]: alterada };
    const opcoes = { aPartirDe: dataHoje };
    const falhas = validarEscala(alterada, atendentes, proximas, opcoes);
    const escalaSeguinte = proximas[deslocarMes(mes, 1)];
    if (escalaSeguinte) falhas.push(...validarEscala(escalaSeguinte, atendentes, proximas, opcoes));
    if (falhas.length) throw new Error(falhas[0]);
    salvar({ escalas: proximas });
    setSabadoEmEdicao(null);
    notificar('Dupla atualizada e salva.');
  };

  const alterarMes = (valor) => {
    if (mesValido(valor) && valor >= MES_MINIMO && valor <= MES_MAXIMO) setMes(valor);
  };

  let rotuloSituacao = 'Não gerada';
  if (escala) rotuloSituacao = problemas.length ? 'Revisar escala' : 'Escala gerada';

  return (
    <>
      <div className="grade-indicadores">
        <CartaoIndicador
          icone={Users}
          rotulo="Atendentes ativos hoje"
          valor={ativosHoje.length}
          detalhe={`${atendentes.length} cadastrados na equipe`}
          tom="azul"
        />
        <CartaoIndicador
          icone={CalendarDays}
          rotulo="Sábados no mês"
          valor={datas.length}
          detalhe={`${ATENDENTES_POR_SABADO} atendentes por sábado`}
          tom="vermelho"
        />
        <CartaoIndicador
          icone={CalendarCheck2}
          rotulo="Vagas preenchidas"
          valor={vagasPreenchidas}
          sufixo={`/ ${datas.length * ATENDENTES_POR_SABADO}`}
          detalhe={escala ? 'Escala salva neste navegador' : 'Aguardando geração da escala'}
          tom="verde"
        />
        <CartaoIndicador
          icone={Moon}
          rotulo="Descansam no 1º sábado"
          valor={emDescanso.length}
          detalhe="Rodízio do último sábado"
          tom="ambar"
        />
      </div>

      <section className="barra-mes">
        <div className="barra-mes__controles">
          <button
            type="button"
            className="botao-icone botao-icone--contornado"
            aria-label="Mês anterior"
            disabled={mes === MES_MINIMO}
            onClick={() => setMes(deslocarMes(mes, -1))}
          >
            <ChevronLeft size={19} />
          </button>
          <label className="seletor-mes">
            <input
              type="month"
              min={MES_MINIMO}
              max={MES_MAXIMO}
              aria-label="Mês da escala"
              value={mes}
              onChange={(evento) => alterarMes(evento.target.value)}
            />
          </label>
          <button
            type="button"
            className="botao-icone botao-icone--contornado"
            aria-label="Próximo mês"
            disabled={mes === MES_MAXIMO}
            onClick={() => setMes(deslocarMes(mes, 1))}
          >
            <ChevronRight size={19} />
          </button>
          {mes !== mesAtual() && (
            <button type="button" className="botao-texto barra-mes__hoje" onClick={() => setMes(mesAtual())}>
              Voltar ao mês atual
            </button>
          )}
        </div>
        <div className="barra-mes__acoes">
          <button
            type="button"
            className="botao botao--secundario"
            disabled={!escala || problemas.length > 0}
            onClick={() => executar(() => exportarEscala(escala, atendentes))}
          >
            <Download size={16} />
            Exportar
          </button>
          <button
            type="button"
            className="botao botao--primario"
            disabled={gerando || !atendentes.length || bloqueado}
            onClick={solicitarGeracao}
          >
            <Shuffle size={16} className={gerando ? 'girando' : ''} />
            {gerando ? 'Sorteando…' : escala ? 'Sortear novamente' : 'Gerar escala'}
          </button>
        </div>
      </section>

      {problemas.length > 0 && (
        <div className="aviso aviso--erro" role="alert">
          <AlertCircle size={18} />
          <div className="aviso__texto">A escala precisa de revisão: {problemas[0]}</div>
        </div>
      )}

      {foraDaGeracao.length > 0 && (
        <div className="aviso aviso--neutro fora-da-geracao">
          <Info size={18} />
          <div className="aviso__texto">
            <strong>
              Fora da geração {quandoReferencia} ({foraDaGeracao.length})
            </strong>
            <p>
              {referenciaEHoje
                ? 'Só voltam a ser escalados depois do retorno.'
                : 'Data de montagem da escala: último dia útil do mês anterior. Só voltam a ser escalados depois do retorno.'}
            </p>
            <div className="fora-da-geracao__lista">
              {foraDaGeracao.map(({ atendente, status }) => (
                <Etiqueta key={atendente.id} variante={status.chave} dica={status.descricao}>
                  {atendente.nome} · {status.rotulo}
                </Etiqueta>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="layout-escala">
        <section className="painel-escala">
          <div className="cabecalho-secao">
            <div>
              <h2 className="primeira-maiuscula">{rotuloMes(mes)}</h2>
              <p className="texto-suave texto-pequeno">
                {escala ? 'Duplas de atendimento para os sábados' : 'Organize os próximos plantões da sua equipe'}
              </p>
            </div>
            <Etiqueta variante={escala && !problemas.length ? 'ativo' : escala ? 'afastado' : 'neutra'}>
              {rotuloSituacao}
            </Etiqueta>
          </div>

          {!atendentes.length && (
            <div className="boas-vindas">
              <span className="boas-vindas__icone">
                <Users size={22} />
              </span>
              <div>
                <h3>Vamos começar pela sua equipe?</h3>
                <p>Importe sua planilha para cadastrar os atendentes e gerar a primeira escala.</p>
                <button type="button" className="botao-texto" onClick={() => irPara('importacao')}>
                  Importar funcionários <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="lista-sabados">
            {datas.map((data, indice) => (
              <CartaoSabado
                key={data}
                data={data}
                posicao={indice + 1}
                sabado={escala?.sabados.find((sabado) => sabado.data === data)}
                atendentes={atendentes}
                emDescanso={indice === 0 ? emDescanso : []}
                aoEditar={() => setSabadoEmEdicao(escala.sabados.find((sabado) => sabado.data === data))}
              />
            ))}
          </div>

          <div className="nota-rodape">
            <ShieldCheck size={16} />
            {escala
              ? 'Trocas manuais passam pelas mesmas regras de validação.'
              : 'As regras de rodízio, disponibilidade e experiência são aplicadas automaticamente.'}
          </div>

          {escala && (
            <div className="rodape-escala">
              <span className="texto-suave texto-pequeno">
                Atualizada em {new Date(escala.atualizadoEm).toLocaleString('pt-BR')}
              </span>
              <button type="button" className="botao-texto botao-texto--perigo" onClick={excluirEscala}>
                <Trash2 size={15} />
                Excluir escala
              </button>
            </div>
          )}
        </section>

        <PainelLateralEscala
          atendentes={atendentes}
          emDescanso={emDescanso}
          dataPrimeiroSabado={datas[0]}
          possuiMesAnterior={!!escalas[deslocarMes(mes, -1)]}
          aoVerMesAnterior={() => setMes(deslocarMes(mes, -1))}
        />
      </div>

      {sabadoEmEdicao && (
        <ModalEditarDupla
          sabado={sabadoEmEdicao}
          atendentes={atendentes}
          escalas={escalas}
          dataReferencia={dataReferencia}
          aoSalvar={salvarDupla}
          aoFechar={() => setSabadoEmEdicao(null)}
        />
      )}
    </>
  );
}
