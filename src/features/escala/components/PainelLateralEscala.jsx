import { ArrowUpRight, Clock3, Info, ShieldCheck } from 'lucide-react';
import Avatar from '../../../shared/components/Avatar.jsx';
import Regra from '../../../shared/components/Regra.jsx';
import { formatarData } from '../../../shared/utils/datas.js';

export default function PainelLateralEscala({
  atendentes,
  emDescanso,
  dataPrimeiroSabado,
  possuiMesAnterior,
  aoVerMesAnterior,
}) {
  return (
    <aside className="painel-lateral">
      <section className="cartao-regras">
        <div className="cartao-regras__titulo">
          <ShieldCheck size={19} />
          <h3>Uma escala equilibrada</h3>
        </div>
        <p className="cartao-regras__subtitulo">As regras que cuidam do seu time.</p>
        <Regra numero="01" titulo="Rodízio entre meses">
          Quem atende no último sábado do mês descansa no primeiro sábado do mês seguinte. Nos demais sábados volta a
          ser sorteado normalmente.
        </Regra>
        <Regra numero="02" titulo="Experiência compartilhada">
          Novatos sempre trabalham com alguém que já completou 3 meses.
        </Regra>
        <Regra numero="03" titulo="Disponibilidade respeitada">
          Quem está hoje de férias, atestado, afastado, ausente ou desligado fica fora da geração e só volta a ser
          escalado depois do retorno.
        </Regra>
        <Regra numero="04" titulo="Sorteio equilibrado">
          As duplas são sorteadas, priorizando quem trabalhou menos.
        </Regra>
      </section>

      <section className="cartao-descanso">
        <div className="cartao-descanso__cabecalho">
          <div>
            <h3>Descanso no 1º sábado</h3>
            {dataPrimeiroSabado && <p className="texto-suave texto-pequeno">{formatarData(dataPrimeiroSabado)}</p>}
          </div>
          <Clock3 size={18} />
        </div>
        {emDescanso.length ? (
          emDescanso.map((id) => {
            const indice = atendentes.findIndex((atendente) => atendente.id === id);
            const nome = atendentes[indice]?.nome ?? 'Atendente não encontrado';
            return (
              <div className="pessoa-descanso" key={id}>
                <Avatar nome={nome} indice={indice} tamanho="pequeno" />
                <span>{nome}</span>
              </div>
            );
          })
        ) : (
          <p className="texto-suave texto-pequeno">
            {possuiMesAnterior
              ? 'Nenhum atendente em descanso.'
              : 'Sem escala do mês anterior. Nenhum bloqueio de rodízio será aplicado.'}
          </p>
        )}
        <button type="button" className="botao-texto" onClick={aoVerMesAnterior}>
          Consultar mês anterior <ArrowUpRight size={15} />
        </button>
      </section>

      <div className="nota-dispositivo">
        <Info size={16} />
        <p>Os dados ficam neste navegador. Exporte a escala para compartilhar com o time.</p>
      </div>
    </aside>
  );
}
