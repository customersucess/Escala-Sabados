import { useEffect } from 'react';
import { hoje, sabadosDoMes } from '../../shared/utils/datas.js';
import { validarEscala } from '../../features/escala/domain/regrasEscala.js';

/** Registra, quando o navegador suporta WebMCP, uma ferramenta somente leitura para consultar escalas. */
export function useFerramentaConsultaEscala(atendentes, escalas) {
  useEffect(() => {
    const contexto = document.modelContext;
    if (!contexto?.registerTool) return undefined;
    const controlador = new AbortController();
    const nomeDe = (id) => atendentes.find((atendente) => atendente.id === id)?.nome;
    try {
      Promise.resolve(
        contexto.registerTool(
          {
            name: 'consultar_escala',
            description: 'Consulta a escala salva e seus conflitos em um mês, sem alterar dados.',
            inputSchema: {
              type: 'object',
              properties: { mes: { type: 'string', pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' } },
              required: ['mes'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: ({ mes }) => {
              sabadosDoMes(mes);
              const escala = escalas[mes];
              if (!escala) return { mes, escala: null };
              return {
                mes,
                duplas: escala.sabados.map((sabado) => ({
                  data: sabado.data,
                  atendentes: sabado.atendentes.map(nomeDe),
                })),
                conflitos: validarEscala(escala, atendentes, escalas, { aPartirDe: hoje() }),
              };
            },
          },
          { signal: controlador.signal },
        ),
      ).catch(() => {});
    } catch {
      // Navegadores sem suporte completo ao WebMCP apenas ignoram o registro.
    }
    return () => controlador.abort();
  }, [atendentes, escalas]);
}
