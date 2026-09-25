export const normalizarTexto = (valor) =>
  String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const iniciais = (nome) =>
  String(nome ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('') || '?';

export const gerarId = () => crypto.randomUUID();
