import React from 'react';
import Icon from './Icons.jsx';
import { Segmented, Switch, Slider, NumberField } from './ui.jsx';
import { PALETTES, gradientCss } from '../lib/palettes.js';
import { coordDigits, formatMs, formatZoom, zoomOf } from '../lib/format.js';

export const JULIA_PRESETS = [
  { name: 'Klasik', re: -0.7, im: 0.27015 },
  { name: 'Douady tavşanı', re: -0.123, im: 0.745 },
  { name: 'Dendrit', re: 0, im: 1 },
  { name: 'Siegel diski', re: -0.391, im: -0.587 },
  { name: 'Galaksi', re: -0.8, im: 0.156 },
];

export const PLACES = [
  { name: 'Deniz atı vadisi', cx: -0.745, cy: 0.113, scale: 0.05 },
  { name: 'Fil vadisi', cx: 0.275, cy: 0, scale: 0.12 },
  { name: 'Mini küme', cx: -1.7549, cy: 0, scale: 0.1 },
];

const THEMES = [
  { value: 'system', label: 'Sistem', icon: 'monitor' },
  { value: 'light', label: 'Açık', icon: 'sun' },
  { value: 'dark', label: 'Koyu', icon: 'moon' },
];

const KINDS = [
  { value: 'mandelbrot', label: 'Mandelbrot' },
  { value: 'julia', label: 'Julia' },
];

const QUALITY = [
  { value: 'draft', label: 'Hızlı' },
  { value: 'balanced', label: 'Dengeli' },
  { value: 'sharp', label: 'Keskin' },
];

function Group({ title, children, hint }) {
  return (
    <section className="group">
      <h3 className="group-title">{title}</h3>
      {children}
      {hint && <p className="group-hint">{hint}</p>}
    </section>
  );
}

function Row({ label, value, children, stacked }) {
  return (
    <div className={`row${stacked ? ' stacked' : ''}`}>
      <div className="row-head">
        <span className="row-label">{label}</span>
        {value != null && <output className="row-value">{value}</output>}
      </div>
      {children}
    </div>
  );
}

export default function Inspector(p) {
  const { view, status, iter } = p;
  const digits = coordDigits(view.scale);
  const near = (a, b) => Math.abs(a - b) < 1e-6;

  return (
    <aside className={`inspector${p.open ? '' : ' closed'}`} aria-label="Ayarlar" aria-hidden={!p.open}>
      <div className="sheet-head">
        <span className="sheet-grab" aria-hidden="true" />
        <h2>Ayarlar</h2>
        <button type="button" className="ibtn" onClick={p.onClose} aria-label="Ayarları kapat" title="Kapat"><Icon name="close" size={20} /></button>
      </div>
      <div className="inspector-scroll">
        <Group title="Tema">
          <Segmented options={THEMES} value={p.theme} onChange={p.setTheme} label="Tema" />
        </Group>

        <Group title="Fraktal">
          <Segmented options={KINDS} value={p.kind} onChange={p.onKind} label="Fraktal türü" />
        </Group>

        {p.kind === 'mandelbrot' ? (
          <Group title="Konumlar" hint="Hazır ilginç bölgelere git. Sonra istediğin gibi gezinebilirsin.">
            <div className="chips">
              {PLACES.map((pl) => (
                <button key={pl.name} type="button" className="chip" onClick={() => p.onPlace(pl)}>{pl.name}</button>
              ))}
              <button type="button" className="chip" onClick={p.onReset}>Tam görünüm</button>
            </div>
            <button type="button" className={`btn wide${p.pickMode ? ' active' : ''}`} onClick={p.onTogglePick} aria-pressed={p.pickMode}>
              <Icon name="crosshair" size={18} /> Julia noktası seç
            </button>
          </Group>
        ) : (
          <Group title="Julia parametresi" hint="c = gerçel + sanal i. Hazır bir nokta seç ya da değerleri elle gir.">
            <div className="chips">
              {JULIA_PRESETS.map((pr) => (
                <button key={pr.name} type="button" className={`chip${near(pr.re, p.cRe) && near(pr.im, p.cIm) ? ' on' : ''}`} onClick={() => p.onC(pr.re, pr.im)}>{pr.name}</button>
              ))}
            </div>
            <div className="numrow">
              <NumberField label="Gerçel" value={p.cRe} onChange={(v) => p.onC(v, p.cIm)} />
              <NumberField label="Sanal" value={p.cIm} onChange={(v) => p.onC(p.cRe, v)} />
            </div>
            <button type="button" className="btn wide" onClick={p.onReset}><Icon name="scan" size={18} /> Görünümü sıfırla</button>
          </Group>
        )}

        <Group title="Hesaplama">
          <div className="card">
            <Row label="Otomatik iterasyon" value={null}>
              <Switch checked={p.autoIter} onChange={p.setAutoIter} label="Otomatik iterasyon" />
            </Row>
            <Row label="İterasyon" value={iter} stacked>
              <Slider label="İterasyon sayısı" min={50} max={3000} step={25} value={Math.min(3000, p.autoIter ? iter : p.iterManual)} disabled={p.autoIter} onChange={p.setIterManual} />
            </Row>
            <Row label="Kalite" stacked>
              <Segmented options={QUALITY} value={p.quality} onChange={p.setQuality} label="Görüntü kalitesi" />
            </Row>
          </div>
        </Group>

        <Group title="Renk">
          <div className="palettes" role="radiogroup" aria-label="Renk paleti">
            {PALETTES.map((pal) => (
              <button key={pal.id} type="button" role="radio" aria-checked={p.palette === pal.id} className={`pal${p.palette === pal.id ? ' on' : ''}`} onClick={() => p.setPalette(pal.id)}>
                <span className="pal-swatch" style={{ background: gradientCss(pal.id) }} />
                <span className="pal-name">{pal.name}</span>
                {p.palette === pal.id && <span className="pal-check"><Icon name="check" size={12} strokeWidth={2.6} /></span>}
              </button>
            ))}
          </div>
          <div className="card">
            <Row label="Renk yoğunluğu" value={p.density.toFixed(2) + '×'} stacked>
              <Slider label="Renk yoğunluğu" min={0.25} max={4} step={0.05} value={p.density} onChange={p.setDensity} />
            </Row>
            <Row label="Renk kaydırma" value={Math.round(p.shift * 100) + '%'} stacked>
              <Slider label="Renk kaydırma" min={0} max={1} step={0.01} value={p.shift} onChange={p.setShift} />
            </Row>
          </div>
        </Group>

        <Group title="Çalışmalar">
          <button type="button" className="btn wide primary" onClick={p.onSave}><Icon name="bookmark" size={18} /> Görünümü kaydet</button>
          {p.saved.length === 0 ? (
            <div className="empty"><Icon name="image" size={22} /><span>Kayıtlı çalışma yok. Beğendiğin bir görünümü kaydet; burada küçük resmiyle görünür.</span></div>
          ) : (
            <div className="works">
              {p.saved.map((w, i) => (
                <div className="work" key={w.id || i}>
                  <button type="button" className="work-open" onClick={() => p.onLoad(w)} title={w.name}>
                    <span className="work-thumb">{w.thumb ? <img src={w.thumb} alt="" loading="lazy" /> : <Icon name="image" size={22} />}</span>
                    <span className="work-name">{w.name}</span>
                  </button>
                  <button type="button" className="work-del" onClick={() => p.onDelete(i)} aria-label={`${w.name} çalışmasını sil`} title="Sil"><Icon name="trash" size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </Group>

        <Group title="Bilgi">
          <div className="card info">
            <div className="irow"><span>Merkez (gerçel)</span><code>{view.cx.toFixed(digits)}</code></div>
            <div className="irow"><span>Merkez (sanal)</span><code>{view.cy.toFixed(digits)}</code></div>
            <div className="irow"><span>Yakınlaştırma</span><code>{formatZoom(zoomOf(view.scale))}</code></div>
            <div className="irow"><span>İterasyon</span><code>{iter}</code></div>
            <div className="irow"><span>Çözünürlük</span><code>{status.w ? `${status.w} × ${status.h}` : '–'}</code></div>
            <div className="irow"><span>Süre</span><code>{status.busy ? 'hesaplanıyor' : formatMs(status.ms)}</code></div>
          </div>
          {view.scale < 1e-13 && (
            <p className="warn"><Icon name="alert" size={16} /> Sayısal hassasiyet sınırına yaklaşıldı; daha fazla yakınlaştırmada görüntü bloklaşır.</p>
          )}
          <button type="button" className="btn wide" onClick={p.onCopyLink}><Icon name="link" size={18} /> Bağlantıyı kopyala</button>
        </Group>

        <div className="footnote">
          <p>Her şey tarayıcında hesaplanır; veri dışarı gönderilmez.</p>
          <p className="kbd-help">Klavye: oklar gezin · + / − yakınlaş · 0 sıfırla · Z geri · P ayarlar · T tema</p>
        </div>
      </div>
    </aside>
  );
}
