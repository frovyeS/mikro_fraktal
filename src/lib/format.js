import { BASE_SCALE } from './viewmath.js';

export const zoomOf = (scale) => BASE_SCALE / scale;

export function formatZoom(z) {
  if (!Number.isFinite(z)) return '–';
  if (z < 10) return z.toFixed(2) + '×';
  if (z < 1000) return z.toFixed(1) + '×';
  const e = Math.floor(Math.log10(z));
  return (z / 10 ** e).toFixed(2) + 'e' + e + '×';
}

export function coordDigits(scale) {
  return Math.min(16, Math.max(4, Math.ceil(-Math.log10(scale)) + 4));
}

export function autoIter(scale) {
  const levels = Math.max(0, Math.log2(BASE_SCALE / scale));
  return Math.round(Math.min(4000, 120 + 48 * levels));
}

export function formatMs(ms) {
  if (ms == null) return '–';
  return ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(2) + ' sn';
}

export function formatC(re, im) {
  return `${re.toFixed(4)} ${im < 0 ? '-' : '+'} ${Math.abs(im).toFixed(4)}i`;
}

export function stamp() {
  try {
    return new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date().toISOString().slice(0, 16).replace('T', ' ');
  }
}
