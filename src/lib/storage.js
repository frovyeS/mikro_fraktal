export const KEY_WORKS = 'mikrofraktal-saved'; // eski sürümle aynı anahtar
export const KEY_THEME = 'mikrofraktal-theme';
export const KEY_PREFS = 'mikrofraktal-prefs';

export function readJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
