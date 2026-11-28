export const BASE_SCALE = 3.2;
export const MIN_SCALE = 2e-14; // çift duyarlıklı sayıların pratik sınırı
export const MAX_SCALE = 12;

export const defaultView = (kind) => ({ cx: kind === 'julia' ? 0 : -0.5, cy: 0, scale: BASE_SCALE });

// base: ekrandaki bitmap'in görünümü, tr: {tx, ty, s} geçici CSS dönüşümü, (W,H): CSS piksel boyutu
export function viewFromTransform(base, tr, W, H) {
  const qx = (W / 2 - tr.tx) / tr.s;
  const qy = (H / 2 - tr.ty) / tr.s;
  return {
    cx: base.cx + (qx / W - 0.5) * base.scale,
    cy: base.cy + (0.5 - qy / H) * base.scale * (H / W),
    scale: base.scale / tr.s,
  };
}

export function transformForView(base, target, W, H) {
  const s = base.scale / target.scale;
  const qx = ((target.cx - base.cx) / base.scale + 0.5) * W;
  const qy = (0.5 - (target.cy - base.cy) / (base.scale * (H / W))) * H;
  return { tx: W / 2 - qx * s, ty: H / 2 - qy * s, s };
}

export function pointToComplex(view, px, py, W, H) {
  return { re: view.cx + (px / W - 0.5) * view.scale, im: view.cy + (0.5 - py / H) * view.scale * (H / W) };
}

export function complexToPoint(view, re, im, W, H) {
  return { x: ((re - view.cx) / view.scale + 0.5) * W, y: (0.5 - (im - view.cy) / (view.scale * (H / W))) * H };
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
