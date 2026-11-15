// Small shared UI helpers: status glyphs (always icon + word), sparkline, escaping.
import { TIER_WORD } from './rules.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const G = {
  normal: '<path d="M2.2 6.6 5 9.3 9.9 3.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square"/>',
  attention: '<path d="M6 1.4 11.2 10.4H.8Z" fill="currentColor"/>',
  critical: '<rect x="1.6" y="1.6" width="8.8" height="8.8" fill="currentColor"/>',
  none: '<path d="M2.5 6h7" stroke="currentColor" stroke-width="1.6"/>',
};
export const glyph = (tier) => `<svg class="glyph" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">${G[tier] || G.none}</svg>`;
/** Status = colour + icon + word, always together. */
export const status = (tier, word) => `<span class="st" data-tier="${tier}">${glyph(tier)}<span>${esc(word || TIER_WORD[tier])}</span></span>`;

const I = {
  up: '<path d="M6 10V2.5M2.6 5.6 6 2.2l3.4 3.4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  down: '<path d="M6 2v7.5M2.6 6.4 6 9.8l3.4-3.4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  flat: '<path d="M1.5 6h9" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  close: '<path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  info: '<circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M6 5.2v3.6M6 3v1.1" stroke="currentColor" stroke-width="1.3"/>',
  check: G.normal,
  clock: '<circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 3.4V6l1.9 1.2" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  minus: '<path d="M2 6h8" stroke="currentColor" stroke-width="1.8"/>',
  plus: '<path d="M2 6h8M6 2v8" stroke="currentColor" stroke-width="1.8"/>',
};
export const icon = (name, size = 12) => `<svg class="ic" viewBox="0 0 12 12" width="${size}" height="${size}" aria-hidden="true">${I[name]}</svg>`;
export const ARROW_WORD = { up: 'above your baseline', down: 'below your baseline', flat: 'at your baseline' };

/** Tiny trend line. Last point carries the tier colour; the dashed line is the personal baseline. */
export function spark(values, baseline, tier, w = 92, h = 26) {
  const v = values.filter((x) => typeof x === 'number');
  if (v.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const all = typeof baseline === 'number' ? [...v, baseline] : v;
  let lo = Math.min(...all); let hi = Math.max(...all);
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const pad = 4;
  const x = (i) => pad + (i / (v.length - 1)) * (w - pad * 2 - 2);
  const y = (val) => h - pad - ((val - lo) / (hi - lo)) * (h - pad * 2);
  const d = v.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(val).toFixed(1)}`).join('');
  const base = typeof baseline === 'number' ? `<path class="spark-base" d="M${pad} ${y(baseline).toFixed(1)}H${w - pad}"/>` : '';
  return `<svg class="spark" data-tier="${tier}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${base}<path class="spark-line" d="${d}"/><circle class="spark-dot" cx="${x(v.length - 1).toFixed(1)}" cy="${y(v[v.length - 1]).toFixed(1)}" r="2.6"/></svg>`;
}

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let toastTimer = null;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 3200);
}

// scroll hint: a bottom fade and a count while a scrolling column still hides content
export function updateMore() {
  for (const m of $$('.more')) {
    const box = m.parentElement;
    const on = box.scrollHeight - box.scrollTop - box.clientHeight > 12;
    m.classList.toggle('on', on);
    if (!on) continue;
    const edge = box.getBoundingClientRect().bottom - 64;
    const n = $$('.alert', box).filter((a) => a.getBoundingClientRect().top > edge).length;
    m.firstElementChild.textContent = n ? `${n} more alert${n > 1 ? 's' : ''} below` : 'More below';
  }
}
export const STAMP = { 'team-heuristic': 'team heuristic', placeholder: 'placeholder — not verified' };
export const stamp = (k) => (STAMP[k] ? `<em class="stamp" data-k="${k}">${STAMP[k]}</em>` : '');
