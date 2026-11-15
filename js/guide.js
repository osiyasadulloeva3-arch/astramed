// Guide page: table of contents, the architecture drawing, and the rules tables built from data/thresholds.json.
import { initI18n } from './i18n.js';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STAMP = { 'team-heuristic': 'team heuristic', placeholder: 'placeholder — not verified' };
const stamp = (k) => (STAMP[k] ? `<em class="stamp">${STAMP[k]}</em>` : '');

// ---------- table of contents ----------
const toc = $('#toc');
const narrow = window.matchMedia('(max-width: 960px)');
const fit = () => { toc.open = !narrow.matches; };
fit(); narrow.addEventListener('change', fit);
toc.addEventListener('click', (e) => { if (e.target.closest('a') && narrow.matches) toc.open = false; });
const links = new Map([...toc.querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a]));
const spy = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    links.forEach((a) => a.removeAttribute('aria-current'));
    links.get(en.target.id)?.setAttribute('aria-current', 'location');
  }
}, { rootMargin: '-18% 0px -72% 0px' });
links.forEach((_, id) => spy.observe(document.getElementById(id)));

// ---------- architecture drawing (one wide, one tall; CSS shows the one that fits) ----------
const NODES = [
  { t: 'Daily check-in', s: ['typed readings,', 'checked on entry'] },
  { t: 'Local store', s: ['browser storage', 'on this device'] },
  { t: 'Rules engine', s: ['limits from thresholds.json'], core: true, chips: ['Reference range', 'Personal baseline', 'Seven-day trend', 'Combined risk'] },
  { t: 'Zone status, alerts', s: ['Normal, Attention', 'or Critical, with why'] },
  { t: 'Report queue', s: ['PDF and JSON,', 'waits in a blackout'] },
  { t: 'Earth link', s: ['flight surgeon', '(simulated here)'], far: true },
];
function box(n, x, y, w, h) {
  const cx = x + w / 2;
  let out = `<rect class="${n.core ? 'd-box d-core' : n.far ? 'd-far' : 'd-box'}" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`;
  out += `<text class="d-t${n.core ? ' d-core-t' : ''}" x="${cx}" y="${y + 24}" text-anchor="middle">${n.t}</text>`;
  n.s.forEach((line, i) => { out += `<text class="d-s${n.core ? ' d-core-s' : ''}" x="${cx}" y="${y + 42 + i * 15}" text-anchor="middle">${line}</text>`; });
  (n.chips || []).forEach((c, i) => {
    const cy = y + 56 + i * 32;
    out += `<rect class="d-chip" x="${x + 10}" y="${cy}" width="${w - 20}" height="26" rx="2"/><text class="d-t" x="${cx}" y="${cy + 17.5}" text-anchor="middle" style="font-size:12.5px">${c}</text>`;
  });
  return out;
}
const head = (id) => '<defs><marker id="' + id + '" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1 7 4 1 7" fill="none" stroke="#1A1B17" stroke-width="1.3"/></marker></defs>';
const seen = (list) => { const orgs = new Set(); return list.map((s) => { const first = !orgs.has(s.org); orgs.add(s.org); return { ...s, text: first ? s.org : s.title }; }); };
function wide() {
  const W = [128, 128, 172, 150, 138, 124]; const gap = 22; const mid = 150;
  let x = 18; let out = ''; const xs = [];
  NODES.forEach((n, i) => { xs.push(x); const h = n.core ? 196 : 76; out += box(n, x, mid - h / 2, W[i], h); x += W[i] + (i === 4 ? gap + 22 : gap); });
  for (let i = 0; i < 5; i++) out += `<path class="d-arrow" marker-end="url(#ah-w)" d="M${xs[i] + W[i] + 3} ${mid}H${xs[i + 1] - 4}"/>`;
  const fr = xs[4] + W[4] + 12;
  out += `<rect class="d-frame" x="6" y="18" width="${fr - 6}" height="264" rx="2"/><text class="d-frame-t" x="18" y="38">On the device, offline</text>`;
  return `<svg class="d-wide" viewBox="0 0 ${x - gap + 8} 300" aria-hidden="true">${head('ah-w')}${out}</svg>`;
}
function tall() {
  const w = 228; const x = 56; let y = 48; let out = ''; const ys = []; const hs = [];
  NODES.forEach((n, i) => { const h = n.core ? 196 : 76; ys.push(y); hs.push(h); out += box(n, x, y, w, h); y += h + (i === 4 ? 52 : 30); });
  for (let i = 0; i < 5; i++) out += `<path class="d-arrow" marker-end="url(#ah-t)" d="M${x + w / 2} ${ys[i] + hs[i] + 3}V${ys[i + 1] - 4}"/>`;
  const fb = ys[4] + hs[4] + 14;
  out += `<rect class="d-frame" x="20" y="10" width="300" height="${fb - 10}" rx="2"/><text class="d-frame-t" x="34" y="32">On the device, offline</text>`;
  return `<svg class="d-tall" viewBox="0 0 340 ${y - 30 + 10}" aria-hidden="true">${head('ah-t')}${out}</svg>`;
}
$('#diagram').innerHTML = wide() + tall();

// ---------- rules tables from the same file the engine reads ----------
const range = (I) => {
  if (I.categories) { const c = I.categories[0]; return `below ${c.systolic.lt} and below ${c.diastolic.lt} ${I.unit}`; }
  if (I.normal) return `${I.normal.min} to ${I.normal.max} ${I.unit}`;
  if (I.recommended) return `${I.recommended.gte} ${I.unit} or more`;
  if (I.careerLimit) return `career dose below ${I.careerLimit.lt} ${I.unit}`;
  return 'no fixed range';
};
const tier = (t) => (t ? esc(t.replace(/^placeholder — not verified: /, '').replace(/^team heuristic: /, '')) : 'none used');
function rulesTable(T) {
  const rows = Object.values(T.indicators).map((I) => {
    const ph = (t) => (t && t.startsWith('placeholder') ? ` ${stamp('placeholder')}` : '');
    return `<tr><th scope="row">${esc(I.label)}<small>${esc(I.unit)}</small>${I.status === 'verified' ? '' : stamp(I.status)}</th>
      <td data-l="Normal">${esc(range(I))}</td>
      <td data-l="Attention">${tier(I.tiers.attention)}${ph(I.tiers.attention)}</td>
      <td data-l="Critical">${tier(I.tiers.critical)}${ph(I.tiers.critical)}</td>
      <td data-l="Source">${seen(I.sources || []).map((s) => (s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.text)}</a>` : `<span>${esc(s.text)}</span>`)).join('')}</td></tr>`;
  }).join('');
  $('#rules-table').insertAdjacentHTML('beforeend', `<thead><tr><th scope="col">Reading</th><th scope="col">Normal</th><th scope="col">Attention</th><th scope="col">Critical</th><th scope="col">Source</th></tr></thead><tbody>${rows}</tbody>`);
}
function heurTable(T) {
  const H = T.heuristics; const b = H.baselineTolerance; const tr = H.trend; const c = H.combined;
  const rows = [
    ['Personal baseline', `Attention when a reading is further from the pre-flight value than: resting heart rate ${b.restingHr} bpm, systolic ${b.sys} and diastolic ${b.dia} mmHg, temperature ${b.bodyTemp} °C, glucose ${b.fastingGlucose} mg/dL, sleep ${b.sleepHours} h.`, 'team-heuristic'],
    ['Trend', `Attention when a value moves in a bad direction over ${tr.days} days, with at least ${tr.minSteps} steps the same way and a total change of at least: systolic ${tr.minChange.sys} mmHg, resting heart rate ${tr.minChange.restingHr} bpm, temperature ${tr.minChange.bodyTemp} °C, sleep ${tr.minChange.sleepHours} h. Needs at least six logged days.`, 'team-heuristic'],
    ['Combined risk', `One behavioral warning when, over ${c.days} days, average sleep is under ${c.sleepBelow} h and mood and team climate are both ${c.moodAtMost} of 5 or lower.`, 'team-heuristic'],
    ['Sustained low mood or team climate', `Attention when the ${H.moodLow.days}-day average is ${H.moodLow.avgAtMost} of 5 or lower.`, 'team-heuristic'],
    ['Exercise gap', `Attention when the last ${H.exerciseGapDays} recorded days have no exercise.`, 'team-heuristic'],
    ['Chronic short sleep', `Critical when the ${H.sleepChronic.days}-day average is under ${H.sleepChronic.avgBelow} h.`, H.sleepChronic.status],
    ['Radiation, early warning', `Attention at ${Math.round(H.radiationAttentionFraction.value * 100)} % of the career limit.`, H.radiationAttentionFraction.status],
    ['Crew health score', `100 minus ${H.score.attention} for each Attention zone and ${H.score.critical} for each Critical zone.`, 'team-heuristic'],
  ].map(([n, d, k]) => `<tr><th scope="row">${n}</th><td data-l="Rule">${esc(d)}</td><td data-l="Label">${stamp(k)}</td></tr>`).join('');
  $('#heur-table').insertAdjacentHTML('beforeend', `<thead><tr><th scope="col">Rule</th><th scope="col">What it does</th><th scope="col">Label</th></tr></thead><tbody>${rows}</tbody>`);
}

fetch('data/thresholds.json').then((r) => r.json()).then((T) => {
  rulesTable(T); heurTable(T);
  $('#verified-on').textContent = `, checked on ${T.meta.verifiedOn}`;
  const s = T.environments.mars.link.oneWaySeconds;
  if (s) $('#f-mars').textContent = `${(s / 60).toFixed(1)} min`;
}).catch(() => { $('#rules-table').insertAdjacentHTML('afterend', '<p>The rules file could not be read. Reload the page.</p>'); });

initI18n();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
