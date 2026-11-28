// Renk paletleri. `id` değerleri kayıtlı çalışmalarla uyumluluk için sabittir.
export const PALETTES = [
  { id: 'aurora', name: 'Aurora', stops: ['#050b24', '#1b3a8c', '#2aa7b8', '#7bf0b0', '#f2f7d8', '#a77bf0', '#2a1f6b'], inside: [4, 6, 16] },
  { id: 'fire', name: 'Ateş', stops: ['#0a0204', '#4a0d0a', '#b3260b', '#f26a0f', '#ffc24a', '#fff3d1', '#7a1a08'], inside: [6, 2, 3] },
  { id: 'ice', name: 'Buz', stops: ['#04101c', '#0b3a63', '#1f7fb5', '#6fd0e8', '#e8fbff', '#8fb4e8', '#123a66'], inside: [3, 10, 20] },
  { id: 'ocean', name: 'Okyanus', stops: ['#020b14', '#064663', '#0c8a9b', '#38c6b5', '#c8f3e0', '#1d6f9c', '#073a52'], inside: [2, 8, 14] },
  { id: 'sunset', name: 'Gün batımı', stops: ['#150a2a', '#5b1a6e', '#c2307a', '#ff6f50', '#ffc15e', '#ffe9b8', '#7a2a6a'], inside: [10, 5, 22] },
  { id: 'mono', name: 'Gümüş', stops: ['#07080a', '#2b2e34', '#6a7079', '#c9ced6', '#ffffff', '#8a9099', '#3a3e45'], inside: [3, 3, 4] },
  { id: 'spectrum', name: 'Spektrum', stops: ['#e5484d', '#f5a524', '#e8f25a', '#4de88a', '#4dc3ff', '#8a6bff', '#ff4dd2'], inside: [8, 8, 12] },
];

export const PALETTE_IDS = PALETTES.map((p) => p.id);

export function getPalette(id) {
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const cache = new Map();

// Döngüsel (başa dönen) 1024 girişli renk tablosu.
export function buildLut(id, size = 1024) {
  if (cache.has(id)) return cache.get(id);
  const p = getPalette(id);
  const rgb = p.stops.map(hexToRgb);
  rgb.push(rgb[0]);
  const seg = rgb.length - 1;
  const lut = new Uint8ClampedArray(size * 3);
  for (let i = 0; i < size; i++) {
    const t = (i / size) * seg;
    const k = Math.floor(t);
    const f = t - k;
    const a = rgb[k], b = rgb[k + 1];
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = a[c] + (b[c] - a[c]) * f;
  }
  cache.set(id, lut);
  return lut;
}

export function gradientCss(id) {
  const p = getPalette(id);
  return `linear-gradient(90deg, ${p.stops.join(', ')})`;
}
