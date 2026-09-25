const PADRAO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

const doisDigitos = (valor) => String(valor).padStart(2, '0');

export const montarDataIso = (ano, mes, dia) => `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;

export const paraIso = (data) => montarDataIso(data.getFullYear(), data.getMonth() + 1, data.getDate());

export const hoje = () => paraIso(new Date());

export const mesAtual = () => hoje().slice(0, 7);

export const mesValido = (mes) => typeof mes === 'string' && PADRAO_MES.test(mes);

export const dataValida = (valor) =>
  typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && paraIso(new Date(`${valor}T12:00:00`)) === valor;

export function deslocarMes(mes, deslocamento) {
  const [ano, numeroMes] = mes.split('-').map(Number);
  return paraIso(new Date(ano, numeroMes - 1 + deslocamento, 1, 12)).slice(0, 7);
}

export function somarDias(data, dias) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return paraIso(new Date(ano, mes - 1, dia + dias, 12));
}

export function somarMeses(data, quantidade) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const ultimoDia = new Date(ano, mes - 1 + quantidade + 1, 0, 12).getDate();
  return paraIso(new Date(ano, mes - 1 + quantidade, Math.min(dia, ultimoDia), 12));
}

export function sabadosDoMes(mes) {
  if (!mesValido(mes)) throw new Error('Selecione um mês válido.');
  const [ano, numeroMes] = mes.split('-').map(Number);
  if (ano < 1900 || ano > 9999) throw new Error('Use um ano entre 1900 e 9999.');
  const sabados = [];
  for (let dia = 1; dia <= 31; dia++) {
    const data = new Date(ano, numeroMes - 1, dia, 12);
    if (data.getMonth() !== numeroMes - 1) break;
    if (data.getDay() === 6) sabados.push(paraIso(data));
  }
  return sabados;
}

export const formatarData = (data) => (data ? new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR') : '—');

export const formatarDataCurta = (data) =>
  new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export const rotuloMes = (mes) =>
  new Date(`${mes}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
