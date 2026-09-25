import * as XLSX from 'xlsx';
import { formatarData } from '../../../shared/utils/datas.js';

function baixarPlanilha(linhas, nomeArquivo, nomeAba) {
  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, XLSX.utils.json_to_sheet(linhas), nomeAba);
  XLSX.writeFile(pasta, nomeArquivo);
}

export const baixarModeloImportacao = () =>
  baixarPlanilha(
    [
      { Nome: 'Exemplo de funcionário', Admissão: '08/01/2026', Status: 'ativo', Inicio: '', Fim: '' },
      { Nome: 'Exemplo de férias', Admissão: '10/02/2025', Status: 'ferias', Inicio: '01/10/2026', Fim: '15/10/2026' },
      {
        Nome: 'Exemplo de atestado',
        Admissão: '10/02/2025',
        Status: 'atestado',
        Inicio: '05/10/2026',
        Fim: '09/10/2026',
      },
      { Nome: 'Exemplo de desligado', Admissão: '15/03/2024', Status: 'desligado', Inicio: '', Fim: '' },
    ],
    'modelo-funcionarios.xlsx',
    'Funcionários',
  );

export function exportarEscala(escala, atendentes) {
  const nomeDe = (id) => atendentes.find((atendente) => atendente.id === id)?.nome;
  baixarPlanilha(
    escala.sabados.map((sabado) => ({
      Data: formatarData(sabado.data),
      'Atendente 1': nomeDe(sabado.atendentes[0]),
      'Atendente 2': nomeDe(sabado.atendentes[1]),
    })),
    `escala-${escala.mes}.xlsx`,
    'Escala',
  );
}
