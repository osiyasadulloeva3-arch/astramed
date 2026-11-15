// App state in localStorage. No network, no accounts.
import { makeDemo, demoDoses } from '../data/demo.js';

const KEY = 'lyra.health.v1';

export function load(T) {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 1 && Array.isArray(s.days) && s.days.length) return s;
    }
  } catch { /* corrupted or blocked storage → start from the demo */ }
  const s = makeDemo(T);
  save(s);
  return s;
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full or blocked: keep working in memory */ }
}

export function resetDemo(T) {
  const s = makeDemo(T);
  save(s);
  return s;
}

/** Environment switch. Untouched demo history gets doses typical for that environment; real entries are never rewritten. */
export function setEnv(s, env, T) {
  s.env = env;
  if (s.demo && !s.edited) {
    const doses = demoDoses(T, env, s.days.length);
    s.days.forEach((d, i) => { if (d.dose !== null) d.dose = doses[i]; });
  }
  save(s);
}

export const today = (s) => s.days[s.days.length - 1];
