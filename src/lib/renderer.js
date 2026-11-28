// İşçi havuzu: önce düşük çözünürlüklü hızlı önizleme, sonra ortadan dışa doğru bantlar.
const MAX_WORKERS = 6;

export function startRender(job, handlers) {
  const { w, h } = job;
  let cancelled = false;
  const workers = [];
  const n = Math.max(2, Math.min(MAX_WORKERS, (navigator.hardwareConcurrency || 4) - 1));
  const base = {
    cx: job.view.cx, cy: job.view.cy, scale: job.view.scale, iter: job.iter, kind: job.kind,
    cRe: job.cRe, cIm: job.cIm, lut: job.lut, inside: job.inside, density: job.density, shift: job.shift,
  };

  function cancel() {
    cancelled = true;
    workers.forEach((wk) => wk.terminate());
    workers.length = 0;
  }

  function fail(err) {
    if (cancelled) return;
    cancel();
    if (handlers.onError) handlers.onError(err);
  }

  function makeWorker() {
    const wk = new Worker(new URL('../worker.js', import.meta.url));
    wk.onerror = fail;
    workers.push(wk);
    return wk;
  }

  function runBands() {
    const count = Math.max(8, Math.min(32, Math.ceil(h / 24)));
    const bh = Math.ceil(h / count);
    const bands = [];
    for (let y = 0; y < h; y += bh) bands.push([y, Math.min(h, y + bh)]);
    const mid = h / 2;
    bands.sort((a, b) => Math.abs((a[0] + a[1]) / 2 - mid) - Math.abs((b[0] + b[1]) / 2 - mid));
    const total = bands.length;
    let next = 0, done = 0;
    const feed = (wk) => {
      if (cancelled || next >= total) return;
      const [y0, y1] = bands[next++];
      wk.postMessage({ ...base, w, h, y0, y1 });
    };
    for (let i = 0; i < Math.min(n, total); i++) {
      const wk = makeWorker();
      wk.onmessage = (e) => {
        if (cancelled) return;
        const d = e.data;
        handlers.onBand(new ImageData(d.buf, d.w, d.y1 - d.y0), d.y0);
        done++;
        handlers.onProgress(done / total);
        if (done === total) {
          cancel();
          handlers.onDone();
        } else {
          feed(wk);
        }
      };
      feed(wk);
    }
  }

  const pw = Math.max(8, Math.ceil(w / 4));
  const ph = Math.max(8, Math.ceil(h / 4));
  const pre = makeWorker();
  pre.onmessage = (e) => {
    if (cancelled) return;
    const d = e.data;
    handlers.onPreview(new ImageData(d.buf, d.w, d.y1 - d.y0), d.w, d.y1 - d.y0);
    pre.terminate();
    workers.splice(workers.indexOf(pre), 1);
    runBands();
  };
  pre.postMessage({ ...base, w: pw, h: ph, y0: 0, y1: ph });

  return { cancel };
}
