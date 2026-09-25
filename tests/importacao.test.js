import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  aplicarImportacao,
  converterDataExcel,
  interpretarLinhas,
  interpretarPlanilha,
} from '../src/features/importacao/services/leitorPlanilha.js';
import { statusNaData } from '../src/features/atendentes/domain/atendente.js';
import { estaElegivel } from '../src/features/escala/domain/regrasEscala.js';
import { CHAVE_ARMAZENAMENTO_LEGADO, carregarDados, salvarDados } from '../src/shared/services/armazenamento.js';

const linhaBase = { Nome: 'Ana Silva', Admissão: '01/01/2025', Status: 'ativo' };
const criarAtendente = (id, nome = id) => ({ id, nome, admissao: '2025-01-01', status: 'ativo', ausencias: [] });

function criarPasta(grade) {
  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, XLSX.utils.aoa_to_sheet(grade), 'Equipe');
  return pasta;
}

function comArmazenamentoFalso(executar) {
  const memoria = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) };
  try {
    executar(memoria);
  } finally {
    globalThis.localStorage = original;
  }
}

test('aceita nomes acentuados e datas brasileiras/Excel', () => {
  const resultado = interpretarLinhas(
    [{ Nome: 'JOAO', Status: 'Férias', Inicio: '01/08/2026', Fim: '07/08/2026' }],
    [criarAtendente('João')],
  );
  assert.equal(resultado.erros.length, 0);
  assert.equal(resultado.entradas[0].atendente.ausencias[0].fim, '2026-08-07');
  assert.equal(converterDataExcel(46235), '2026-08-01');
});

test('recusa datas inválidas e períodos sobrepostos distintos', () => {
  const atendentes = [criarAtendente('Ana')];
  assert.equal(
    interpretarLinhas([{ Nome: 'Ana', Status: 'ferias', Inicio: '31/02/2026', Fim: '2026-08-07' }], atendentes).erros
      .length,
    1,
  );
  const linha = { Nome: 'Ana', Status: 'ferias', Inicio: '2026-08-01', Fim: '2026-08-07' };
  assert.equal(interpretarLinhas([linha, { ...linha, Fim: '2026-08-08' }], atendentes).erros.length, 1);
});

test('equipe vazia: cadastra funcionários com os seis status', () => {
  const status = ['ativo', 'Férias', 'ausente', 'atestado', 'afastado', 'desligado'];
  const resultado = interpretarLinhas(
    status.map((Status, i) => ({ ...linhaBase, Nome: `Pessoa ${i}`, Status })),
    [],
  );
  assert.deepEqual(resultado.erros, []);
  assert.equal(resultado.cadastrados, 6);
  const atendentes = aplicarImportacao([], resultado);
  assert.deepEqual(
    atendentes.map((a) => a.status),
    ['ativo', 'ferias', 'ausente', 'atestado', 'afastado', 'desligado'],
  );
  assert.deepEqual(
    atendentes.map((a) => estaElegivel(a, '2026-10-03')),
    [true, false, false, false, false, false],
  );
});

test('sem admissão cria pendência, nunca fabrica experiência', () => {
  const resultado = interpretarLinhas([{ Nome: 'Ana' }], []);
  assert.equal(resultado.erros.length, 0);
  assert.equal(resultado.avisos.length, 1);
  assert.equal(resultado.entradas[0].atendente.admissao, '');
  assert.equal(estaElegivel(resultado.entradas[0].atendente, '2026-10-03'), false);
});

test('existente: atualiza apenas o status, preservando ID, admissão e ausências', () => {
  const original = {
    id: 'id1',
    nome: 'João Silva',
    admissao: '2025-01-01',
    status: 'ativo',
    ausencias: [{ id: 'a', tipo: 'ferias', inicio: '2026-01-01', fim: '2026-01-10' }],
  };
  const antes = JSON.stringify(original);
  const resultado = interpretarLinhas([{ Nome: '  JOAO   SILVA ', Status: 'atestado' }], [original]);
  assert.equal(resultado.atualizados, 1);
  assert.equal(resultado.cadastrados, 0);
  const [atualizado] = aplicarImportacao([original], resultado);
  assert.equal(atualizado.id, 'id1');
  assert.equal(atualizado.admissao, original.admissao);
  assert.equal(atualizado.ausencias.length, 1);
  assert.equal(JSON.stringify(original), antes);
  assert.equal(statusNaData(atualizado, '2026-10-03'), 'atestado');
  assert.equal(estaElegivel(atualizado, '2026-10-03'), false);
});

test('planilha inválida não permite aplicar alterações parciais', () => {
  const resultado = interpretarLinhas([linhaBase, { Nome: 'Bia', Status: 'desconhecido' }], []);
  assert.ok(resultado.erros.length);
  assert.throws(() => aplicarImportacao([], resultado), /erros/);
});

test('reimportar não duplica funcionários nem períodos', () => {
  const linhas = [{ ...linhaBase, Status: 'ferias', Inicio: '01/10/2026', Fim: '15/10/2026' }];
  const primeira = aplicarImportacao([], interpretarLinhas(linhas, []));
  const segunda = aplicarImportacao(primeira, interpretarLinhas(linhas, primeira));
  assert.deepEqual(segunda, primeira);
  assert.equal(statusNaData(segunda[0], '2026-10-15'), 'ferias');
  assert.equal(statusNaData(segunda[0], '2026-10-16'), 'ativo');
});

test('controle anual detecta título, cabeçalho, virada de mês/ano e anotação V=5', () => {
  const pasta = criarPasta([
    ['CONTROLE DE FÉRIAS'],
    ['Nome', 'Dt. de Admissão', new Date(2026, 8, 1), new Date(2026, 11, 1)],
    ['Ana', '01/01/2025', '30/09 a 09/10 V=5', '22/12 à 06/01'],
    [],
  ]);
  const resultado = interpretarPlanilha(pasta, []);
  assert.deepEqual(resultado.erros, []);
  assert.equal(resultado.entradas.length, 1);
  assert.deepEqual(
    resultado.entradas[0].atendente.ausencias.map((a) => [a.inicio, a.fim]),
    [
      ['2026-09-30', '2026-10-09'],
      ['2026-12-22', '2027-01-06'],
    ],
  );
});

test('controle anual aceita status mensal e rejeita texto desconhecido', () => {
  const pasta = criarPasta([
    ['Nome', 'Admissão', new Date(2026, 9, 1)],
    ['Ana', '01/01/2025', 'ausente'],
  ]);
  const resultado = interpretarPlanilha(pasta, []);
  assert.deepEqual(resultado.erros, []);
  assert.equal(resultado.entradas[0].atendente.ausencias[0].fim, '2026-10-31');
  const invalida = criarPasta([
    ['Nome', 'Admissão', new Date(2026, 9, 1)],
    ['Ana', '01/01/2025', 'ver depois'],
  ]);
  assert.ok(interpretarPlanilha(invalida, []).erros.length);
});

test('nomes ambíguos e linhas conflitantes são rejeitados', () => {
  const ana = criarAtendente('1', 'Ana');
  assert.ok(interpretarLinhas([{ Nome: 'ANA' }], [ana, { ...ana, id: '2', nome: 'Aná' }]).erros.length);
  assert.ok(interpretarLinhas([linhaBase, { ...linhaBase, Status: 'desligado' }], []).erros.length);
});

test('persistência salva e recarrega atendentes importados', () => {
  comArmazenamentoFalso(() => {
    const atendentes = aplicarImportacao(
      [],
      interpretarLinhas(
        [
          { Nome: 'Ana', Status: 'ausente' },
          { Nome: 'Bia', Status: 'desligado' },
        ],
        [],
      ),
    );
    salvarDados({ atendentes, escalas: {} });
    assert.deepEqual(carregarDados().atendentes, atendentes);
  });
});

test('migra dados da versão anterior sem apagar o original', () => {
  comArmazenamentoFalso((memoria) => {
    const legado = {
      people: [
        {
          id: 'x',
          name: 'Ana',
          admission: '2025-01-01',
          status: 'ativo',
          absences: [{ id: 'f', type: 'ferias', start: '2026-10-01', end: '2026-10-10' }],
        },
      ],
      schedules: {
        '2026-09': {
          month: '2026-09',
          rows: [{ date: '2026-09-05', people: ['x', 'y'] }],
          updatedAt: '2026-09-01T00:00:00.000Z',
        },
      },
    };
    memoria.set(CHAVE_ARMAZENAMENTO_LEGADO, JSON.stringify(legado));
    const dados = carregarDados();
    assert.equal(dados.atendentes[0].nome, 'Ana');
    assert.equal(dados.atendentes[0].ausencias[0].inicio, '2026-10-01');
    assert.deepEqual(dados.escalas['2026-09'].sabados[0].atendentes, ['x', 'y']);
    assert.ok(memoria.has(CHAVE_ARMAZENAMENTO_LEGADO));
  });
});
