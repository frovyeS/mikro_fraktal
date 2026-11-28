import React, { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icons.jsx';

export function IconButton({ icon, label, onClick, pressed, disabled, className = '' }) {
  return (
    <button type="button" className={`ibtn ${className}`} aria-label={label} title={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={20} />
    </button>
  );
}

export function Segmented({ options, value, onChange, label, className = '' }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={`seg ${className}`} role="radiogroup" aria-label={label} style={{ '--n': options.length, '--i': idx }}>
      <span className="seg-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} title={o.title || o.label}>
          {o.icon && <Icon name={o.icon} size={16} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function Slider({ value, min, max, step, onChange, disabled, label }) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      className="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      style={{ '--p': p + '%' }}
      onChange={(e) => onChange(+e.target.value)}
    />
  );
}

const fmt = (v) => String(+Number(v).toFixed(6));

export function NumberField({ label, value, onChange, min = -2, max = 2 }) {
  const id = useId();
  const [draft, setDraft] = useState(fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(fmt(value));
  }, [value]);
  return (
    <div className="numfield">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        step="any"
        value={draft}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; setDraft(fmt(value)); }}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
    </div>
  );
}
