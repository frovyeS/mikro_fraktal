import { PALETTE_IDS } from './palettes.js';
import { MIN_SCALE, MAX_SCALE } from './viewmath.js';

export function encodeState(s) {
  const p = new URLSearchParams();
  p.set('k', s.kind === 'julia' ? 'j' : 'm');
  p.set('x', String(s.view.cx));
  p.set('y', String(s.view.cy));
  p.set('s', String(s.view.scale));
  if (s.kind === 'julia') p.set('c', `${s.cRe},${s.cIm}`);
  p.set('p', s.palette);
  p.set('d', String(s.density));
  p.set('h', String(s.shift));
  p.set('a', s.autoIter ? '1' : '0');
  if (!s.autoIter) p.set('i', String(s.iterManual));
  return p.toString();
}

export function decodeState(hash) {
  try {
    const p = new URLSearchParams(hash.replace(/^#/, ''));
    if (!p.has('k') || !p.has('x') || !p.has('y') || !p.has('s')) return null;
    const num = (k) => { const v = parseFloat(p.get(k)); return Number.isFinite(v) ? v : null; };
    const cx = num('x'), cy = num('y'), scale = num('s');
    if (cx == null || cy == null || scale == null || scale < MIN_SCALE || scale > MAX_SCALE) return null;
    const out = { kind: p.get('k') === 'j' ? 'julia' : 'mandelbrot', view: { cx, cy, scale } };
    if (p.has('c')) {
      const [a, b] = p.get('c').split(',').map(parseFloat);
      if (Number.isFinite(a) && Number.isFinite(b)) { out.cRe = a; out.cIm = b; }
    }
    if (PALETTE_IDS.includes(p.get('p'))) out.palette = p.get('p');
    if (num('d') != null) out.density = Math.min(4, Math.max(0.25, num('d')));
    if (num('h') != null) out.shift = Math.min(1, Math.max(0, num('h')));
    if (p.has('a')) out.autoIter = p.get('a') !== '0';
    if (num('i') != null) out.iterManual = Math.min(5000, Math.max(50, Math.round(num('i'))));
    return out;
  } catch {
    return null;
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
