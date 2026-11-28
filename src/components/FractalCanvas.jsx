import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { startRender } from '../lib/renderer.js';
import { buildLut, getPalette } from '../lib/palettes.js';
import { MIN_SCALE, MAX_SCALE, viewFromTransform, transformForView, pointToComplex, complexToPoint } from '../lib/viewmath.js';

const IDENT = { tx: 0, ty: 0, s: 1 };
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Hareket sırasında bitmap CSS dönüşümüyle anında kaydırılır/yakınlaştırılır,
// hareket bitince yeni görünüm arka planda hesaplanıp yerine konur.
const FractalCanvas = forwardRef(function FractalCanvas(props, ref) {
  const { view, kind, iter, cRe, cIm, palette, density, shift, quality, pickMode } = props;
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [moving, setMoving] = useState(false);

  const live = useRef(props);
  live.current = props;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const shown = useRef(null); // ekrandaki bitmap'in görünümü
  const tr = useRef({ ...IDENT });
  const job = useRef(null);
  const commitTimer = useRef(0);
  const ptrs = useRef(new Map());
  const gbase = useRef(null);
  const tap = useRef(null);
  const lastTap = useRef(null);
  const rectRef = useRef(null);
  const previewCanvas = useRef(null);
  const ctxRef = useRef(null);

  const clampS = (s) => {
    const sh = shown.current;
    if (!sh) return s;
    return Math.min(sh.scale / MIN_SCALE, Math.max(sh.scale / MAX_SCALE, s));
  };

  const applyTr = (animate) => {
    const c = canvasRef.current;
    if (!c) return;
    const t = tr.current;
    c.style.transition = animate && !reduceMotion() ? 'transform .26s cubic-bezier(.22,.8,.2,1)' : 'none';
    c.style.transform = t.s === 1 && t.tx === 0 && t.ty === 0 ? '' : `translate3d(${t.tx}px,${t.ty}px,0) scale(${t.s})`;
  };

  const visualView = () => {
    const { w, h } = sizeRef.current;
    if (!shown.current || !w) return live.current.view;
    return viewFromTransform(shown.current, tr.current, w, h);
  };

  const commit = () => {
    clearTimeout(commitTimer.current);
    const t = tr.current;
    if (!shown.current || (t.s === 1 && t.tx === 0 && t.ty === 0)) return;
    live.current.onCommit(visualView());
  };

  const scheduleCommit = (ms) => {
    clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(commit, ms);
  };

  const zoomAt = (px, py, k, animate) => {
    const t = tr.current;
    const s2 = clampS(t.s * k);
    const kk = s2 / t.s;
    tr.current = { s: s2, tx: px - (px - t.tx) * kk, ty: py - (py - t.ty) * kk };
    applyTr(animate);
  };

  const rebase = () => {
    const pts = [...ptrs.current.values()];
    if (!pts.length) { gbase.current = null; return; }
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const d = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gbase.current = { cx, cy, d, t: { ...tr.current } };
  };

  useImperativeHandle(ref, () => ({
    zoomBy(k) {
      const { w, h } = sizeRef.current;
      if (!shown.current) return;
      live.current.onInteract && live.current.onInteract();
      zoomAt(w / 2, h / 2, k, true);
      scheduleCommit(290);
    },
    panBy(fx, fy) {
      const { w, h } = sizeRef.current;
      if (!shown.current) return;
      live.current.onInteract && live.current.onInteract();
      const t = tr.current;
      tr.current = { ...t, tx: t.tx - fx * w, ty: t.ty - fy * h };
      applyTr(true);
      scheduleCommit(290);
    },
    getCanvas() { return canvasRef.current; },
  }), []);

  // Boyut izleme (kısa gecikmeli)
  useLayoutEffect(() => {
    const el = wrapRef.current;
    let timer = 0;
    const apply = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    apply();
    const ro = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(apply, 120); });
    ro.observe(el);
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, []);

  // Tekerlek (pasif olmayan dinleyici gerekir)
  useEffect(() => {
    const el = wrapRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      if (!shown.current) return;
      const r = el.getBoundingClientRect();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16; else if (e.deltaMode === 2) dy *= 400;
      const k = Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0018));
      zoomAt(e.clientX - r.left, e.clientY - r.top, k, false);
      live.current.onInteract && live.current.onInteract();
      scheduleCommit(160);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => () => { clearTimeout(commitTimer.current); if (job.current) job.current.cancel(); }, []);

  // Render
  useEffect(() => {
    const { w: W, h: H } = size;
    if (!W || !H) return undefined;
    if (job.current) job.current.cancel();
    const dpr = window.devicePixelRatio || 1;
    const q = quality === 'draft' ? Math.max(0.5, dpr * 0.5) : quality === 'sharp' ? Math.min(3, dpr * 1.5) : Math.min(2, dpr);
    let bw = Math.round(W * q), bh = Math.round(H * q);
    const MAXPX = 3.2e6;
    if (bw * bh > MAXPX) {
      const f = Math.sqrt(MAXPX / (bw * bh));
      bw = Math.floor(bw * f); bh = Math.floor(bh * f);
    }
    const c = canvasRef.current;
    if (!ctxRef.current) ctxRef.current = c.getContext('2d', { alpha: false });
    if (!previewCanvas.current) previewCanvas.current = document.createElement('canvas');
    const ctx = ctxRef.current;
    const renderView = { cx: view.cx, cy: view.cy, scale: view.scale };
    const started = performance.now();
    const trAtStart = { ...tr.current };
    const st = (busy, progress, ms) => live.current.onStatus({ busy, progress, ms, w: bw, h: bh });
    st(true, 0, null);

    const landed = () => {
      const { w, h } = sizeRef.current;
      const prev = shown.current;
      // Render başladığından beri kullanıcı hareket etmediyse görünüm doğrudan yeni görüntüye oturur;
      // hareket ettiyse (hâlâ süren jest) kullanıcının gördüğü konum korunur.
      const t0 = tr.current;
      const untouched = t0.s === trAtStart.s && t0.tx === trAtStart.tx && t0.ty === trAtStart.ty;
      const vis = prev && !untouched ? viewFromTransform(prev, t0, w, h) : renderView;
      shown.current = renderView;
      let t = transformForView(renderView, vis, w, h);
      if (Math.abs(t.s - 1) < 1e-9 && Math.abs(t.tx) < 1e-4 && Math.abs(t.ty) < 1e-4) t = { ...IDENT };
      tr.current = t;
      applyTr(false);
      if (gbase.current) rebase();
      c.style.opacity = '1';
    };

    job.current = startRender(
      { w: bw, h: bh, view: renderView, iter, kind, cRe, cIm, lut: buildLut(palette), inside: getPalette(palette).inside, density, shift },
      {
        onPreview(img, pw, ph) {
          if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
          const pc = previewCanvas.current;
          pc.width = pw; pc.height = ph;
          pc.getContext('2d').putImageData(img, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(pc, 0, 0, bw, bh);
          landed();
        },
        onBand(img, y0) { ctx.putImageData(img, 0, y0); },
        onProgress(p) { st(true, p, null); },
        onDone() { st(false, 1, performance.now() - started); },
        onError() { st(false, 0, null); },
      }
    );
    return () => { if (job.current) job.current.cancel(); };
  }, [view, kind, iter, cRe, cIm, palette, density, shift, quality, size]);

  // Göstergeler
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = wrapRef.current;
    const r = el.getBoundingClientRect();
    rectRef.current = r;
    try { el.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
    clearTimeout(commitTimer.current);
    const x = e.clientX - r.left, y = e.clientY - r.top;
    ptrs.current.set(e.pointerId, { x, y });
    if (ptrs.current.size === 1) tap.current = { x, y, moved: false, shift: e.shiftKey };
    else if (tap.current) tap.current.moved = true;
    applyTr(false);
    rebase();
    live.current.onInteract && live.current.onInteract();
  };

  const onPointerMove = (e) => {
    const p = ptrs.current.get(e.pointerId);
    const g = gbase.current;
    if (!p || !g) return;
    const r = rectRef.current;
    p.x = e.clientX - r.left; p.y = e.clientY - r.top;
    const tp = tap.current;
    if (tp && !tp.moved) {
      if (Math.hypot(p.x - tp.x, p.y - tp.y) <= 6) return;
      tp.moved = true;
    }
    if (!moving) setMoving(true);
    const pts = [...ptrs.current.values()];
    const cx = pts.reduce((a, q) => a + q.x, 0) / pts.length;
    const cy = pts.reduce((a, q) => a + q.y, 0) / pts.length;
    const k = pts.length > 1 && g.d > 0 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / g.d : 1;
    const s2 = clampS(g.t.s * k);
    const kk = s2 / g.t.s;
    tr.current = { s: s2, tx: cx - (g.cx - g.t.tx) * kk, ty: cy - (g.cy - g.t.ty) * kk };
    applyTr(false);
  };

  const handleTap = (tp) => {
    const L = live.current;
    const { w, h } = sizeRef.current;
    if (L.pickMode || tp.shift) {
      const c = pointToComplex(visualView(), tp.x, tp.y, w, h);
      L.onPick(c.re, c.im);
      scheduleCommit(0);
      return;
    }
    const now = performance.now();
    const lt = lastTap.current;
    if (lt && now - lt.t < 320 && Math.hypot(tp.x - lt.x, tp.y - lt.y) < 28 && shown.current) {
      lastTap.current = null;
      zoomAt(tp.x, tp.y, 2.2, true);
      scheduleCommit(290);
      return;
    }
    lastTap.current = { t: now, x: tp.x, y: tp.y };
    scheduleCommit(0);
  };

  const onPointerUp = (e) => {
    if (!ptrs.current.delete(e.pointerId)) return;
    try { wrapRef.current.releasePointerCapture(e.pointerId); } catch { /* yoksay */ }
    if (ptrs.current.size > 0) { rebase(); return; }
    gbase.current = null;
    setMoving(false);
    const tp = tap.current;
    tap.current = null;
    if (tp && !tp.moved && e.type === 'pointerup') handleTap(tp);
    else commit();
  };

  let marker = null;
  if (pickMode && kind === 'mandelbrot' && size.w && !moving) {
    const pt = complexToPoint(view, cRe, cIm, size.w, size.h);
    if (pt.x > -20 && pt.y > -20 && pt.x < size.w + 20 && pt.y < size.h + 20) {
      marker = (
        <svg className="cmarker" width="28" height="28" viewBox="0 0 28 28" style={{ transform: `translate(${pt.x - 14}px, ${pt.y - 14}px)` }} aria-hidden="true">
          <circle cx="14" cy="14" r="8" fill="none" stroke="rgba(0,0,0,.55)" strokeWidth="4" />
          <circle cx="14" cy="14" r="8" fill="none" stroke="#fff" strokeWidth="2" />
          <circle cx="14" cy="14" r="1.6" fill="#fff" />
        </svg>
      );
    }
  }

  return (
    <div
      ref={wrapRef}
      className={`viewport${pickMode ? ' is-picking' : ''}${moving ? ' is-moving' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="fractal" role="img" aria-label="Fraktal görüntüsü" />
      {marker}
    </div>
  );
});

export default FractalCanvas;
