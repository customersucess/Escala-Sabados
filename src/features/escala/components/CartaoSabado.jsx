import { Check, Moon, Pencil } from 'lucide-react';
import Avatar from '../../../shared/components/Avatar.jsx';
import Etiqueta from '../../../shared/components/Etiqueta.jsx';
import { formatarData } from '../../../shared/utils/datas.js';
import { descreverExperiencia } from '../../atendentes/domain/atendente.js';

export default function CartaoSabado({ data, posicao, sabado, atendentes, emDescanso, aoEditar }) {
  const nomesEmDescanso = emDescanso
    .map((id) => atendentes.find((atendente) => atendente.id === id)?.nome)
    .filter(Boolean);

  return (
    <article className={`cartao-sabado ${sabado ? 'cartao-sabado--preenchido' : ''}`}>
      <div className="cartao-sabado__data">
        <span>Sáb</span>
        <strong>{data.slice(-2)}</strong>
      </div>
      <div className="cartao-sabado__conteudo">
        <div className="cartao-sabado__topo">
          <span>{posicao}º sábado</span>
          {nomesEmDescanso.length > 0 && (
            <Etiqueta
              variante="descanso"
              dica={`${nomesEmDescanso.join(' e ')} atenderam no último sábado do mês anterior e descansam neste sábado. Voltam a concorrer a partir do próximo.`}
            >
              <Moon size={12} /> Rodízio: {nomesEmDescanso.length} em descanso
            </Etiqueta>
          )}
          {sabado && (
            <span className="cartao-sabado__confirmado">
              <Check size={13} /> Dupla definida
            </span>
          )}
        </div>
        <div className="cartao-sabado__dupla">
          {sabado ? (
            sabado.atendentes.map((id, indice) => {
              const atendente = atendentes.find((item) => item.id === id);
              const experiencia = atendente && descreverExperiencia(atendente, data);
              return (
                <div className="chip-atendente" key={`${id}-${indice}`}>
                  <Avatar nome={atendente?.nome} indice={atendentes.findIndex((item) => item.id === id)} />
                  <div>
                    <strong>{atendente?.nome ?? 'Atendente removido'}</strong>
                    {experiencia && (
                      <Etiqueta variante={experiencia.chave} dica={experiencia.descricao}>
                        {experiencia.rotulo}
                      </Etiqueta>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <>
              <span className="avatar-vazio">+</span>
              <p className="texto-suave">Aguardando definição da dupla</p>
            </>
          )}
        </div>
      </div>
      {sabado && (
        <button
          type="button"
          className="botao-icone"
          aria-label={`Editar dupla de ${formatarData(data)}`}
          onClick={aoEditar}
        >
          <Pencil size={16} />
        </button>
      )}
    </article>
  );
}
