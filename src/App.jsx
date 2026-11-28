import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FractalCanvas from './components/FractalCanvas.jsx';
import Inspector from './components/Inspector.jsx';
import { Logo } from './components/Icons.jsx';
import { IconButton, Segmented } from './components/ui.jsx';
import { PALETTE_IDS } from './lib/palettes.js';
import { autoIter as autoIterFor, formatC, formatMs, formatZoom, stamp, zoomOf } from './lib/format.js';
import { defaultView } from './lib/viewmath.js';
import { KEY_PREFS, KEY_THEME, KEY_WORKS, readJSON, writeJSON } from './lib/storage.js';
import { copyText, decodeState, encodeState } from './lib/share.js';

const KINDS = [
  { value: 'mandelbrot', label: 'Mandelbrot' },
  { value: 'julia', label: 'Julia' },
];

function loadInitial() {
  const prefs = readJSON(KEY_PREFS, {});
  const fromHash = typeof location !== 'undefined' ? decodeState(location.hash) : null;
  const kind = (fromHash && fromHash.kind) || 'mandelbrot';
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  return {
    kind,
    view: (fromHash && fromHash.view) || defaultView(kind),
    cRe: num(fromHash && fromHash.cRe, -0.7),
    cIm: num(fromHash && fromHash.cIm, 0.27015),
    palette: (fromHash && fromHash.palette) || (PALETTE_IDS.includes(prefs.palette) ? prefs.palette : 'aurora'),
    density: num(fromHash && fromHash.density, num(prefs.density, 1)),
    shift: num(fromHash && fromHash.shift, num(prefs.shift, 0)),
    autoIter: fromHash && fromHash.autoIter !== undefined ? fromHash.autoIter : prefs.autoIter !== false,
    iterManual: num(fromHash && fromHash.iterManual, num(prefs.iterManual, 300)),
    quality: ['draft', 'balanced', 'sharp'].includes(prefs.quality) ? prefs.quality : 'balanced',
    panelOpen: typeof prefs.panelOpen === 'boolean' ? prefs.panelOpen : window.innerWidth > 820,
    theme: ['system', 'light', 'dark'].includes(readJSON(KEY_THEME, 'system')) ? readJSON(KEY_THEME, 'system') : 'system',
    saved: (() => { const s = readJSON(KEY_WORKS, []); return Array.isArray(s) ? s : []; })(),
  };
}

function makeThumb(canvas) {
  try {
    const cw = canvas.width, ch = canvas.height;
    let sw = cw, sh = (cw * 3) / 4, sx = 0, sy = (ch - sh) / 2;
    if (sh > ch) { sh = ch; sw = (ch * 4) / 3; sy = 0; sx = (cw - sw) / 2; }
    const c = document.createElement('canvas');
    c.width = 240; c.height = 180;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(canvas, sx, sy, sw, sh, 0, 0, 240, 180);
    return c.toDataURL('image/jpeg', 0.72);
  } catch {
    return undefined;
  }
}

export default function App() {
  const init = useMemo(loadInitial, []);
  const [kind, setKind] = useState(init.kind);
  const [view, setView] = useState(init.view);
  const [cRe, setCRe] = useState(init.cRe);
  const [cIm, setCIm] = useState(init.cIm);
  const [palette, setPalette] = useState(init.palette);
  const [density, setDensity] = useState(init.density);
  const [shift, setShift] = useState(init.shift);
  const [autoIter, setAutoIter] = useState(init.autoIter);
  const [iterManual, setIterManual] = useState(init.iterManual);
  const [quality, setQuality] = useState(init.quality);
  const [panelOpen, setPanelOpen] = useState(init.panelOpen);
  const [theme, setTheme] = useState(init.theme);
  const [resolved, setResolved] = useState('light');
  const [pickMode, setPickMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(init.saved);
  const [status, setStatus] = useState({ busy: true, progress: 0, ms: null, w: 0, h: 0 });
  const [toast, setToast] = useState(null);
  const [hint, setHint] = useState(true);

  const canvasApi = useRef(null);
  const cur = useRef({});
  cur.current = { kind, view, cRe, cIm };
  const histRef = useRef(history);
  histRef.current = history;
  const iter = autoIter ? autoIterFor(view.scale) : iterManual;

  const showToast = useCallback((text, action) => setToast({ id: Date.now() + Math.random(), text, action }), []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), toast.action ? 6000 : 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 9000);
    return () => clearTimeout(t);
  }, []);

  // Tema
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      const r = dark ? 'dark' : 'light';
      setResolved(r);
      const root = document.documentElement;
      root.setAttribute('data-theme', r);
      root.style.colorScheme = r;
      const m = document.querySelector('meta[name=theme-color]');
      if (m) m.setAttribute('content', dark ? '#000000' : '#f5f5f7');
    };
    apply();
    writeJSON(KEY_THEME, theme);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  // Tercihler
  useEffect(() => {
    writeJSON(KEY_PREFS, { palette, density, shift, autoIter, iterManual, quality, panelOpen });
  }, [palette, density, shift, autoIter, iterManual, quality, panelOpen]);

  // Bağlantı (URL) senkronu
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        history_replace('#' + encodeState({ kind, view, cRe, cIm, palette, density, shift, autoIter, iterManual }));
      } catch { /* yoksay */ }
    }, 400);
    return () => clearTimeout(t);
  }, [kind, view, cRe, cIm, palette, density, shift, autoIter, iterManual]);

  const go = useCallback((next) => {
    const c = cur.current;
    setHistory((h) => [...h.slice(-49), { kind: c.kind, view: c.view, cRe: c.cRe, cIm: c.cIm }]);
    if (next.kind !== undefined) setKind(next.kind);
    if (next.view) setView(next.view);
    if (next.cRe !== undefined) setCRe(next.cRe);
    if (next.cIm !== undefined) setCIm(next.cIm);
  }, []);

  const undo = useCallback(() => {
    const h = histRef.current;
    if (!h.length) return;
    const p = h[h.length - 1];
    setHistory(h.slice(0, -1));
    setKind(p.kind); setView(p.view); setCRe(p.cRe); setCIm(p.cIm);
  }, []);

  const onCommit = useCallback((v) => go({ view: v }), [go]);
  const onInteract = useCallback(() => setHint(false), []);
  const onStatus = useCallback((s) => setStatus(s), []);

  const switchKind = (k) => {
    if (k === cur.current.kind) return;
    setPickMode(false);
    go({ kind: k, view: defaultView(k) });
  };

  const onPick = useCallback((re, im) => {
    setPickMode(false);
    if (cur.current.kind !== 'mandelbrot') return;
    go({ kind: 'julia', view: defaultView('julia'), cRe: re, cIm: im });
    showToast('Julia noktası: ' + formatC(re, im));
  }, [go, showToast]);

  const reset = () => go({ view: defaultView(cur.current.kind) });
  const onPlace = (pl) => go({ view: { cx: pl.cx, cy: pl.cy, scale: pl.scale } });
  const onC = (re, im) => {
    setCRe(re); setCIm(im);
  };

  const saveWork = () => {
    const canvas = canvasApi.current && canvasApi.current.getCanvas();
    const item = {
      id: Date.now().toString(36), kind, cx: view.cx, cy: view.cy, scale: view.scale, iter, cRe, cIm, palette, density, shift, auto: autoIter,
      name: `${kind === 'julia' ? 'Julia' : 'Mandelbrot'} · ${stamp()}`,
      thumb: canvas ? makeThumb(canvas) : undefined,
    };
    let list = [item, ...saved].slice(0, 40);
    let ok = writeJSON(KEY_WORKS, list);
    if (!ok) {
      list = list.map((x, i) => (i < 8 ? x : { ...x, thumb: undefined }));
      ok = writeJSON(KEY_WORKS, list);
    }
    setSaved(list);
    showToast(ok ? 'Çalışma kaydedildi' : 'Kaydedildi, ancak tarayıcı depolaması dolu olduğu için kalıcı olmayabilir');
  };

  const loadWork = (p) => {
    const k = p.kind === 'julia' ? 'julia' : 'mandelbrot';
    go({ kind: k, view: { cx: p.cx, cy: p.cy, scale: p.scale }, cRe: Number.isFinite(p.cRe) ? p.cRe : cRe, cIm: Number.isFinite(p.cIm) ? p.cIm : cIm });
    setPalette(PALETTE_IDS.includes(p.palette) ? p.palette : 'aurora');
    if (Number.isFinite(p.density)) setDensity(p.density);
    if (Number.isFinite(p.shift)) setShift(p.shift);
    if (p.auto === undefined) { setAutoIter(false); setIterManual(Math.min(5000, Math.max(50, p.iter || 300))); }
    else { setAutoIter(!!p.auto); if (p.iter) setIterManual(Math.min(5000, Math.max(50, p.iter))); }
    setPickMode(false);
    if (window.innerWidth <= 820) setPanelOpen(false);
  };

  const deleteWork = (i) => {
    const item = saved[i];
    const list = saved.filter((_, j) => j !== i);
    setSaved(list);
    writeJSON(KEY_WORKS, list);
    showToast('Çalışma silindi', {
      label: 'Geri al',
      run: () => {
        setSaved((cur2) => {
          const back = [...cur2.slice(0, i), item, ...cur2.slice(i)];
          writeJSON(KEY_WORKS, back);
          return back;
        });
        setToast(null);
      },
    });
  };

  const exportPng = () => {
    const canvas = canvasApi.current && canvasApi.current.getCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) { showToast('Görüntü dışa aktarılamadı'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mikro-fraktal-${kind}-${Date.now().toString(36)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast('PNG indirildi');
    }, 'image/png');
  };

  const copyLink = async () => {
    const hash = '#' + encodeState({ kind, view, cRe, cIm, palette, density, shift, autoIter, iterManual });
    const url = location.href.split('#')[0] + hash;
    showToast((await copyText(url)) ? 'Bağlantı kopyalandı' : 'Bağlantı kopyalanamadı');
  };

  const toggleTheme = () => setTheme(resolved === 'dark' ? 'light' : 'dark');

  // Klavye
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const api = canvasApi.current;
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft': api && api.panBy(-0.2, 0); break;
        case 'ArrowRight': api && api.panBy(0.2, 0); break;
        case 'ArrowUp': api && api.panBy(0, -0.2); break;
        case 'ArrowDown': api && api.panBy(0, 0.2); break;
        case '+': case '=': api && api.zoomBy(2); break;
        case '-': case '_': api && api.zoomBy(0.5); break;
        case '0': go({ view: defaultView(cur.current.kind) }); break;
        case 'z': case 'Z': undo(); break;
        case 'p': case 'P': setPanelOpen((o) => !o); break;
        case 't': case 'T': setTheme((th) => (th === 'dark' || (th === 'system' && document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark')); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, undo]);

  const zoom = zoomOf(view.scale);
  const touchLike = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo size={28} />
          <span className="brand-name">Mikro <b>Fraktal</b></span>
        </div>
        <div className="actions">
          <IconButton icon="bookmark" label="Görünümü kaydet" onClick={saveWork} />
          <IconButton icon="download" label="PNG olarak indir" onClick={exportPng} />
          <IconButton icon={resolved === 'dark' ? 'sun' : 'moon'} label={resolved === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'} onClick={toggleTheme} />
          <IconButton icon="sliders" label="Ayarlar" pressed={panelOpen} onClick={() => setPanelOpen((o) => !o)} className={panelOpen ? 'on' : ''} />
        </div>
      </header>

      <div className="layout">
        <main className="stage">
          <FractalCanvas
            ref={canvasApi}
            view={view} kind={kind} iter={iter} cRe={cRe} cIm={cIm}
            palette={palette} density={density} shift={shift} quality={quality}
            pickMode={pickMode}
            onCommit={onCommit} onPick={onPick} onStatus={onStatus} onInteract={onInteract}
          />
          <div className="progress" style={{ opacity: status.busy ? 1 : 0 }} aria-hidden="true"><i style={{ transform: `scaleX(${status.progress})` }} /></div>

          <div className="stage-top">
            <Segmented options={KINDS} value={kind} onChange={switchKind} label="Fraktal türü" className="floating" />
            <div className="chip-info" role="status">
              <span>{formatZoom(zoom)}</span>
              <i aria-hidden="true" />
              <span>{iter} iter.</span>
              <i aria-hidden="true" />
              <span>{status.busy ? 'hesaplanıyor' : formatMs(status.ms)}</span>
            </div>
          </div>

          <div className={`hint${hint ? ' show' : ''}`} aria-hidden="true">
            {touchLike ? 'Sürükle: gezin · Çimdik veya çift dokun: yakınlaş' : 'Sürükle: gezin · Tekerlek: yakınlaş · Çift tık: büyüt'}
          </div>

          <div className="dock" role="toolbar" aria-label="Görünüm araçları">
            <IconButton icon="undo" label="Geri al" onClick={undo} disabled={history.length === 0} />
            <IconButton icon="minus" label="Uzaklaş" onClick={() => canvasApi.current && canvasApi.current.zoomBy(0.5)} />
            <IconButton icon="plus" label="Yakınlaş" onClick={() => canvasApi.current && canvasApi.current.zoomBy(2)} />
            <IconButton icon="scan" label="Tam görünüm" onClick={reset} />
            {kind === 'mandelbrot' && (
              <>
                <span className="dock-sep" aria-hidden="true" />
                <IconButton icon="crosshair" label="Julia noktası seç" pressed={pickMode} onClick={() => setPickMode((m) => !m)} className={pickMode ? 'on' : ''} />
              </>
            )}
          </div>

          {toast && (
            <div className="toast" role="status" key={toast.id}>
              <span>{toast.text}</span>
              {toast.action && <button type="button" onClick={toast.action.run}>{toast.action.label}</button>}
            </div>
          )}
        </main>

        <Inspector
          open={panelOpen} onClose={() => setPanelOpen(false)}
          theme={theme} setTheme={setTheme}
          kind={kind} onKind={switchKind}
          view={view} iter={iter} status={status}
          autoIter={autoIter} setAutoIter={setAutoIter} iterManual={iterManual} setIterManual={setIterManual}
          quality={quality} setQuality={setQuality}
          palette={palette} setPalette={setPalette} density={density} setDensity={setDensity} shift={shift} setShift={setShift}
          cRe={cRe} cIm={cIm} onC={onC}
          onPlace={onPlace} onReset={reset}
          pickMode={pickMode} onTogglePick={() => setPickMode((m) => !m)}
          saved={saved} onSave={saveWork} onLoad={loadWork} onDelete={deleteWork}
          onCopyLink={copyLink}
        />
      </div>
    </div>
  );
}

function history_replace(hash) {
  window.history.replaceState(null, '', hash);
}
