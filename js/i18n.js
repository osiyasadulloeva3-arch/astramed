// AstraMed — language layer (EN | RU).
// English is the source language: it stays in the code and the data files. For Russian every visible
// string is looked up by its English text in data/i18n/ru.json, in the page and in everything the app
// renders later. Numbers are lifted out of the key ("#"), so "Day 60" and "Day 61" share one entry.
// Subtrees marked lang="en" or data-noi18n are left alone (source quotes, names, the EN | RU switch).

const KEY = 'astramed.lang.v1';
const ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'data-l'];
const NUM = /(?<![A-Za-z])\d+(?:[.,]\d+)?/g;
const SKIP = '[lang="en"], [data-noi18n], script, style, textarea';

let dict = null;
let patterns = [];
const wrote = new WeakMap();      // text node -> the translation written into it
const wroteAttr = new WeakMap();  // element -> { attribute: translation written }
export const miss = new Set();    // English keys with no Russian entry (read by the check script)

export const lang = () => (document.documentElement.lang === 'ru' ? 'ru' : 'en');

// The entry for a key; also tried without a closing "." or ":" and, for a lower-case start, through the capitalised entry.
function look(key) {
  let t = dict[key];
  if (t !== undefined) return t;
  const p = key.match(/^(.*[^.:])([.:])$/);
  if (p && (t = look(p[1])) !== undefined) return t.endsWith(p[2]) ? t : t + p[2];
  if (/^[a-z]/.test(key) && (t = dict[key[0].toUpperCase() + key.slice(1)]) !== undefined) return t[0].toLowerCase() + t.slice(1);
  return undefined;
}

function one(core) {
  const nums = [];
  const key = core.replace(/\s+/g, ' ').replace(NUM, (n) => { nums.push(n); return '#'; });
  const t = look(key);
  if (t !== undefined) { let i = 0; return t.replace(/\{(\d)\}/g, (_, k) => nums[k - 1] ?? '').replace(/#/g, () => nums[i++] ?? '#'); }
  for (const [re, tpl] of patterns) {
    const m = core.match(re);
    if (m) return tpl.replace(/\$(\d)/g, (_, k) => tr(m[+k] || '')).replace(/ {2,}/g, ' ');
  }
  const list = /^[a-z ,-]+$/.test(core) && core.includes(', ');   // a list of symptoms
  const parts = list ? core.split(', ') : core.split(/(?<=[.!?:;])\s+(?=[A-Z0-9"“(])/);
  if (parts.length > 1) {
    const out = parts.map(one);
    if (out.some((x) => x !== null)) return out.map((x, i) => x ?? parts[i]).join(list ? ', ' : ' ');
    return null;
  }
  miss.add(key);
  return null;
}

/** Russian for an English string, or the string itself (English mode, no entry, nothing to translate). */
export function tr(src) {
  if (!dict || typeof src !== 'string') return src;
  const m = src.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m[2] || !/[A-Za-z]/.test(m[2])) return src;
  const out = one(m[2]);
  return out === null ? src : m[1] + out + m[3];
}

function text(n) {
  const v = n.nodeValue;
  if (wrote.get(n) === v) return;
  const t = tr(v);
  if (t !== v) { wrote.set(n, t); n.nodeValue = t; }
}

function attrs(el) {
  let seen = wroteAttr.get(el);
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v || (seen && seen[a] === v)) continue;
    const t = tr(v);
    if (t !== v) { if (!seen) wroteAttr.set(el, seen = {}); seen[a] = t; el.setAttribute(a, t); }
  }
}

function walk(root) {
  if (root.nodeType === 3) { if (root.parentElement && !root.parentElement.closest(SKIP)) text(root); return; }
  if (root.nodeType !== 1 || root.closest(SKIP)) return;
  attrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) text(n); else attrs(n); }
}

/** Wire the EN | RU switch and, for Russian, translate the page now and keep translating what is rendered later. */
export async function initI18n() {
  const root = document.documentElement;
  document.querySelectorAll('.tb-lang').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang()));
    b.addEventListener('click', () => {
      if (b.dataset.lang === lang()) return;
      try { localStorage.setItem(KEY, b.dataset.lang); } catch { /* private mode: the choice lasts until reload */ }
      location.reload();
    });
  });
  if (lang() === 'ru') {
    try {
      const d = await fetch('data/i18n/ru.json').then((r) => r.json());
      patterns = d.patterns.map(([re, tpl]) => [new RegExp(re), tpl]);
      dict = d.s;
      walk(root);
      new MutationObserver((list) => {
        for (const m of list) {
          if (m.type === 'childList') m.addedNodes.forEach(walk);
          else if (m.type === 'characterData') walk(m.target);
          else if (!m.target.closest(SKIP)) attrs(m.target);
        }
      }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    } catch (err) { console.warn('Russian text unavailable, showing English.', err); }
  }
  root.classList.remove('i18n-wait');
}
