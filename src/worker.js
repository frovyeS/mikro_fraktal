// Fraktal hesaplama işçisi. Kendi kendine yeterlidir (import içermez).
// Gelen mesaj: görüntünün [y0, y1) satır bandını hesaplar ve RGBA olarak geri yollar.
const BAIL = 65536; // |z|^2 eşiği (kaçış yarıçapı 256): pürüzsüz renklendirme için
const LN2 = Math.LN2;

self.onmessage = (e) => {
  const d = e.data;
  const { w, h, y0, y1, cx, cy, scale, iter, kind, cRe, cIm, lut, inside, density, shift } = d;
  const rows = y1 - y0;
  const out = new Uint8ClampedArray(w * rows * 4);
  const julia = kind === 'julia';
  const dx = scale / w;
  const left = cx - scale / 2;
  const top = cy + (scale * h) / w / 2;
  const lutN = lut.length / 3;
  const cycle = 40 / density;
  const ir = inside[0], ig = inside[1], ib = inside[2];

  for (let y = y0; y < y1; y++) {
    const imY = top - (y + 0.5) * dx;
    let o = (y - y0) * w * 4;
    for (let x = 0; x < w; x++, o += 4) {
      const reX = left + (x + 0.5) * dx;
      let zx, zy, ccx, ccy;
      if (julia) {
        zx = reX; zy = imY; ccx = cRe; ccy = cIm;
      } else {
        zx = 0; zy = 0; ccx = reX; ccy = imY;
        // Ana kardioid ve periyot-2 tomurcuğu içindeki noktalar kesinlikle kümededir.
        const xq = ccx - 0.25;
        const q = xq * xq + ccy * ccy;
        if (q * (q + xq) <= 0.25 * ccy * ccy || (ccx + 1) * (ccx + 1) + ccy * ccy <= 0.0625) {
          out[o] = ir; out[o + 1] = ig; out[o + 2] = ib; out[o + 3] = 255;
          continue;
        }
      }
      let zx2 = zx * zx, zy2 = zy * zy, n = 0;
      while (zx2 + zy2 <= BAIL && n < iter) {
        zy = 2 * zx * zy + ccy;
        zx = zx2 - zy2 + ccx;
        zx2 = zx * zx; zy2 = zy * zy;
        n++;
      }
      if (n >= iter) {
        out[o] = ir; out[o + 1] = ig; out[o + 2] = ib;
      } else {
        const logZ = Math.log(zx2 + zy2) / 2;
        const sm = n + 1 - Math.log(logZ / LN2) / LN2;
        let t = sm / cycle + shift;
        t -= Math.floor(t);
        const li = ((t * lutN) | 0) * 3;
        out[o] = lut[li]; out[o + 1] = lut[li + 1]; out[o + 2] = lut[li + 2];
      }
      out[o + 3] = 255;
    }
  }
  self.postMessage({ buf: out, w, y0, y1 }, [out.buffer]);
};
