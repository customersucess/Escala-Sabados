import test from 'node:test';
import assert from 'node:assert/strict';
import { sabadosDoMes, somarMeses } from '../src/shared/utils/datas.js';
import {
  estaEmExperiencia,
  podeSerExcluido,
  separarParaExclusao,
  statusNaData,
} from '../src/features/atendentes/domain/atendente.js';
import { gerarEscala } from '../src/features/escala/domain/gerarEscala.js';
import {
  estaElegivel,
  idsBloqueadosNaData,
  idsEmDescanso,
  validarEscala,
} from '../src/features/escala/domain/regrasEscala.js';

const criarAtendente = (id, admissao = '2025-01-01', ausencias = []) => ({
  id,
  nome: id,
  admissao,
  status: 'ativo',
  ausencias,
});

/** Gerador pseudoaleatório determinístico para testes reproduzíveis. */
function sementeAleatoria(semente) {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

const equipe = (quantidade) => Array.from({ length: quantidade }, (_, i) => criarAtendente(`p${i}`));

test('identifica todos os sábados, incluindo mês com cinco', () => {
  assert.deepEqual(sabadosDoMes('2026-08'), ['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22', '2026-08-29']);
  assert.equal(sabadosDoMes('2026-02').length, 4);
});

test('admissão elegível no mês seguinte ao cadastro', () => {
  const atendente = criarAtendente('a', '2026-01-08');
  assert.equal(estaElegivel(atendente, '2026-01-31'), false);
  assert.equal(estaElegivel(atendente, '2026-02-07'), true);
});

test('experiência completa três meses no dia exato, com ajuste de fim de mês', () => {
  const atendente = criarAtendente('a', '2026-01-08');
  assert.equal(estaEmExperiencia(atendente, '2026-04-07'), true);
  assert.equal(estaEmExperiencia(atendente, '2026-04-08'), false);
  assert.equal(somarMeses('2026-01-31', 1), '2026-02-28');
});

test('férias e atestado são inclusivos e a disponibilidade retorna no dia seguinte', () => {
  const atendente = criarAtendente('a', '2025-01-01', [
    { inicio: '2026-08-01', fim: '2026-08-07', tipo: 'ferias' },
    { inicio: '2026-08-15', fim: '2026-08-15', tipo: 'atestado' },
  ]);
  assert.equal(statusNaData(atendente, '2026-08-07'), 'ferias');
  assert.equal(estaElegivel(atendente, '2026-08-08'), true);
  assert.equal(estaElegivel(atendente, '2026-08-15'), false);
});

test('quem está de férias ou atestado nunca é escalado', () => {
  const atendentes = [
    ...equipe(4),
    criarAtendente('ferias', '2025-01-01', [{ inicio: '2026-10-01', fim: '2026-10-31', tipo: 'ferias' }]),
    { ...criarAtendente('atestado'), status: 'atestado' },
  ];
  for (let semente = 1; semente <= 20; semente++) {
    const escala = gerarEscala('2026-10', atendentes, {}, { aleatorio: sementeAleatoria(semente) });
    assert.ok(escala.sabados.every((s) => !s.atendentes.includes('ferias') && !s.atendentes.includes('atestado')));
  }
});

test('equipe insuficiente ou só de novatos gera erro sem escala parcial', () => {
  assert.throws(
    () => gerarEscala('2026-08', [criarAtendente('a', '2026-07-01'), criarAtendente('b', '2026-07-01')], {}),
    /dupla válida/,
  );
  assert.throws(() => gerarEscala('2026-08', [criarAtendente('a')], {}), /dupla válida/);
});

test('rodízio: quem fechou o mês descansa apenas no primeiro sábado do mês seguinte', () => {
  const atendentes = equipe(6);
  const setembro = gerarEscala('2026-09', atendentes, {}, { aleatorio: sementeAleatoria(7) });
  const ultimaDupla = setembro.sabados.at(-1).atendentes;
  assert.equal(setembro.sabados.at(-1).data, '2026-09-26');
  const escalas = { '2026-09': setembro };

  assert.deepEqual(idsEmDescanso('2026-10', escalas), ultimaDupla);
  assert.deepEqual(idsBloqueadosNaData('2026-10-03', escalas), ultimaDupla);
  assert.deepEqual(idsBloqueadosNaData('2026-10-10', escalas), []);

  const outubro = gerarEscala('2026-10', atendentes, escalas, { aleatorio: sementeAleatoria(3) });
  assert.ok(outubro.sabados[0].atendentes.every((id) => !ultimaDupla.includes(id)));
  const trabalhamDepois = ultimaDupla.every((id) => outubro.sabados.slice(1).some((s) => s.atendentes.includes(id)));
  assert.ok(trabalhamDepois, 'quem descansou no primeiro sábado volta a ser escalado no mês');
  assert.deepEqual(validarEscala(outubro, atendentes, escalas), []);
});

test('validação aceita a última dupla do mês anterior a partir do segundo sábado', () => {
  const atendentes = equipe(4);
  const setembro = {
    mes: '2026-09',
    sabados: sabadosDoMes('2026-09').map((data) => ({ data, atendentes: ['p0', 'p1'] })),
  };
  const escalas = { '2026-09': setembro };
  const outubro = {
    mes: '2026-10',
    sabados: sabadosDoMes('2026-10').map((data, i) => ({ data, atendentes: i === 0 ? ['p2', 'p3'] : ['p0', 'p1'] })),
  };
  assert.deepEqual(validarEscala(outubro, atendentes, escalas), []);
  outubro.sabados[0].atendentes = ['p0', 'p2'];
  assert.match(validarEscala(outubro, atendentes, escalas)[0], /primeiro sábado/);
});

test('geração é aleatória, mas sempre respeita as regras', () => {
  const atendentes = equipe(8);
  const resultados = new Set();
  for (let semente = 1; semente <= 15; semente++) {
    const escala = gerarEscala('2026-10', atendentes, {}, { aleatorio: sementeAleatoria(semente) });
    assert.deepEqual(validarEscala(escala, atendentes, {}), []);
    resultados.add(JSON.stringify(escala.sabados.map((s) => [...s.atendentes].sort())));
  }
  assert.ok(resultados.size > 1, 'sementes diferentes devem gerar escalas diferentes');
});

test('edição manual não permite repetidos, novatos juntos ou indisponibilidade', () => {
  const atendentes = [
    criarAtendente('a'),
    criarAtendente('b'),
    criarAtendente('c', '2026-07-01'),
    criarAtendente('d', '2026-07-01'),
  ];
  const escala = gerarEscala('2026-08', atendentes, {});
  escala.sabados[0].atendentes = ['c', 'd'];
  assert.match(validarEscala(escala, atendentes, {})[0], /novatos/);
  escala.sabados[0].atendentes = ['a', 'a'];
  assert.match(validarEscala(escala, atendentes, {})[0], /diferentes/);
});

test('geração retroativa não fecha o mês com quem já abre o mês seguinte', () => {
  const atendentes = equipe(4);
  const outubro = {
    mes: '2026-10',
    sabados: sabadosDoMes('2026-10').map((data) => ({ data, atendentes: ['p0', 'p1'] })),
  };
  for (let semente = 1; semente <= 10; semente++) {
    const setembro = gerarEscala(
      '2026-09',
      atendentes,
      { '2026-10': outubro },
      { aleatorio: sementeAleatoria(semente) },
    );
    assert.ok(setembro.sabados.at(-1).atendentes.every((id) => ['p2', 'p3'].includes(id)));
    assert.deepEqual(validarEscala(outubro, atendentes, { '2026-09': setembro }), []);
  }
});

test('novato sempre acompanhado e distribuição equilibrada', () => {
  const atendentes = [criarAtendente('a'), criarAtendente('b'), criarAtendente('c', '2026-07-20'), criarAtendente('d')];
  for (let semente = 1; semente <= 10; semente++) {
    const escala = gerarEscala('2026-08', atendentes, {}, { aleatorio: sementeAleatoria(semente) });
    assert.deepEqual(validarEscala(escala, atendentes, {}), []);
    const contagens = atendentes.map((a) => escala.sabados.filter((s) => s.atendentes.includes(a.id)).length);
    assert.ok(Math.max(...contagens) - Math.min(...contagens) <= 1);
  }
});

test('quem está de férias hoje fica fora de toda a escala gerada, mesmo após o retorno no mês', () => {
  const diego = criarAtendente('diego', '2025-01-01', [{ inicio: '2026-09-14', fim: '2026-10-09', tipo: 'ferias' }]);
  const atendentes = [...equipe(4), diego];
  for (let semente = 1; semente <= 20; semente++) {
    const escala = gerarEscala(
      '2026-10',
      atendentes,
      {},
      { aleatorio: sementeAleatoria(semente), dataReferencia: '2026-09-25' },
    );
    assert.ok(escala.sabados.every((s) => !s.atendentes.includes('diego')));
  }
  // Depois do retorno, volta a entrar na geração.
  const aposRetorno = [];
  for (let semente = 1; semente <= 20; semente++) {
    const escala = gerarEscala(
      '2026-10',
      atendentes,
      {},
      { aleatorio: sementeAleatoria(semente), dataReferencia: '2026-10-10' },
    );
    aposRetorno.push(escala.sabados.some((s) => s.atendentes.includes('diego')));
    assert.ok(!escala.sabados.slice(0, 1).some((s) => s.atendentes.includes('diego')), 'ainda de férias em 03/10');
  }
  assert.ok(aposRetorno.some(Boolean));
});

test('atestado, afastado, ausente e desligado hoje não entram na geração', () => {
  const foraHoje = ['atestado', 'afastado', 'ausente', 'desligado'].map((status) => ({
    ...criarAtendente(status),
    status,
  }));
  const comAtestadoDatado = criarAtendente('datado', '2025-01-01', [
    { inicio: '2026-09-20', fim: '2026-09-30', tipo: 'atestado' },
  ]);
  const escala = gerarEscala(
    '2026-10',
    [...equipe(4), ...foraHoje, comAtestadoDatado],
    {},
    { dataReferencia: '2026-09-25' },
  );
  const escalados = new Set(escala.sabados.flatMap((s) => s.atendentes));
  assert.deepEqual(
    [...escalados].filter((id) => !id.startsWith('p')),
    [],
  );
});

test('validação a partir de hoje ignora sábados que já passaram', () => {
  const atendentes = equipe(4);
  const escala = {
    mes: '2026-09',
    sabados: sabadosDoMes('2026-09').map((data) => ({ data, atendentes: ['p0', 'removido'] })),
  };
  assert.equal(validarEscala(escala, atendentes, {}).length, 4);
  assert.equal(validarEscala(escala, atendentes, {}, { aPartirDe: '2026-09-25' }).length, 1);
});

test('exclusão: escalado só pode ser apagado quando desligado', () => {
  const escalas = { '2026-09': { mes: '2026-09', sabados: [{ data: '2026-09-05', atendentes: ['a', 'b'] }] } };
  const a = criarAtendente('a');
  const b = { ...criarAtendente('b'), status: 'desligado' };
  const c = criarAtendente('c');
  assert.equal(podeSerExcluido(a, escalas), false);
  assert.equal(podeSerExcluido(b, escalas), true);
  assert.equal(podeSerExcluido(c, escalas), true);
  const { excluiveis, mantidos } = separarParaExclusao([a, b, c], escalas);
  assert.deepEqual(
    excluiveis.map((x) => x.id),
    ['b', 'c'],
  );
  assert.deepEqual(
    mantidos.map((x) => x.id),
    ['a'],
  );
});
