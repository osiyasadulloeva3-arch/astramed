// Light / Dark theme. The first paint is set by the inline script in index.html; this keeps the choice.
import { $, toast } from './ui.js';

const KEY = 'astramed.theme.v1';
const COLOR = { light: '#E9E5D7', dark: '#0C0D0B' };

const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

function show() {
  const t = current();
  const b = $('#theme');
  if (b) b.title = t === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = COLOR[t];
}

export function initTheme() {
  show();
  $('#theme')?.addEventListener('click', () => {
    const t = current() === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch (e) { /* private mode: the choice lasts for this visit */ }
    show();
    toast(t === 'light' ? 'Light theme.' : 'Dark theme.');
  });
}
