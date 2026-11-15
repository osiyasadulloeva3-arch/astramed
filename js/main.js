// Main screen: annunciator, alerts, body stage, today's readouts, routine. No framework, no network.
import { evaluate, INDICATORS, ZONE_IDS, TIER, TIER_WORD, lastValues, streak } from './rules.js';
import * as store from './state.js';
import { $, $$, esc, glyph, status, icon, spark, reduced, toast, stamp, updateMore, ARROW_WORD } from './ui.js';
import { createFigure } from './figure.js';
import { createCue } from './cue.js';
import { openCheckin } from './checkin.js';
import { openReport, flushQueue } from './report.js';
import { openAbout } from './about.js';

const app = { T: null, K: null, state: null, R: null, body: null, cue: null, selected: null };
window.__lyra = app; // handy for manual checks in the console

const METRIC_IDS = ['restingHr', 'bp', 'bodyTemp', 'fastingGlucose', 'sleepHours', 'mood', 'radiation'];
const SIDE = { mind: 'r', eyes: 'l', heart: 'r', immune: 'l', metabolism: 'l', bones: 'r', whole: 'r' };

// ---------- derived helpers ----------
const critAlerts = () => app.R.alerts.filter((a) => a.tier === 'critical');
const unacked = () => critAlerts().filter((a) => !app.state.acks[a.id]);
function unackedZones() { const m = {}; unacked().forEach((a) => { m[a.zone] = true; }); return m; }
function zoneHeadline(zid) {
  const inds = app.R.zones[zid].indicators.map((id) => app.R.indicators[id]);
  const best = [...inds].sort((a, b) => TIER[b.tier] - TIER[a.tier])[0];
  const pick = best && best.value !== null ? best : inds.find((i) => i.value !== null);
  return pick ? `${pick.display}${pick.unit ? ' ' + pick.unit : ''}` : '';
}
export function linkInfo() {
  const L = app.T.environments[app.state.env].link;
  if (app.state.link === 'blackout') return { text: 'Blackout, reports wait', blackout: true };
  if (!L.oneWaySeconds) return { text: 'Near real-time', blackout: false };
  return { text: L.oneWaySeconds < 60 ? `${L.oneWaySeconds.toFixed(1)} s one way` : `${(L.oneWaySeconds / 60).toFixed(1)} min one way`, blackout: false };
}
function seriesFor(id, n = 14) {
  const d = app.state.days;
  if (id === 'radiation') { let c = app.state.baseline.priorDose || 0; return d.map((x) => (c += x.dose || 0)).slice(-n); }
  return lastValues(d, id === 'bp' ? 'sys' : INDICATORS.find((i) => i.id === id).field, n);
}

// ---------- render ----------
function renderTop() {
  const { state, T, R } = app;
  $('#tb-mission').textContent = state.profile.mission;
  $('#tb-name').textContent = state.profile.name;
  $('#tb-role').textContent = state.profile.role;
  $('#tb-day').textContent = R.day;
  $('#film-id').textContent = `${state.profile.name}  day ${R.day}  front view`;
  $('#env').innerHTML = Object.entries(T.environments).map(([id, e]) =>
    `<label class="env-opt"><input type="radio" name="env" value="${id}" ${state.env === id ? 'checked' : ''}><span title="${esc(e.long)}">${esc(e.label)}</span></label>`).join('');
  const li = linkInfo();
  $('#link-text').textContent = li.text;
  const lk = $('#link');
  lk.dataset.state = li.blackout ? 'blackout' : 'up';
  lk.setAttribute('aria-pressed', String(li.blackout));
  lk.title = li.blackout ? 'Simulated blackout is on. Press to restore the link.' : 'Press to simulate a communication blackout (no real network is used).';
  $('#score').innerHTML = `${R.score}<small>/100</small>`;
  $('#score-box').dataset.tier = R.score >= 85 ? 'normal' : R.score >= 60 ? 'attention' : 'critical';
}

function renderLamps() {
  const { R, K } = app;
  const un = unackedZones();
  const booting = document.body.classList.contains('booting');
  const lamps = ZONE_IDS.map((z) => {
    const zone = R.zones[z];
    return `<li><button class="lamp${booting ? '' : ' lit'}" type="button" data-zone="${z}" data-tier="${zone.tier}" ${un[z] ? 'data-unacked' : ''} aria-label="${esc(K.zones[z].legend)} ${TIER_WORD[zone.tier]}${un[z] ? ', not acknowledged' : ''}. ${esc(K.zones[z].name)}, open card.">
      <span class="lamp-legend">${esc(K.zones[z].legend)}</span>
      <span class="lamp-state">${glyph(zone.tier)}<span>${TIER_WORD[zone.tier]}</span></span>
    </button></li>`;
  }).join('');
  const nCrit = critAlerts().length; const nUn = unacked().length;
  const mState = nUn ? 'armed' : nCrit ? 'acked' : 'idle';
  const mSub = nUn ? `Acknowledge ${nUn} critical` : nCrit ? `${nCrit} critical acknowledged` : 'No critical alerts';
  $('#zones').innerHTML = `${lamps}<li><button class="master${booting ? '' : ' lit'}" id="master" type="button" data-state="${mState}" ${nUn ? '' : 'aria-disabled="true"'}>
      <span class="master-legend">Master caution</span><span class="master-sub">${mSub}</span></button></li>`;
}

function actionFor(a) {
  const K = app.K;
  if (a.kind === 'symptom') return K.symptoms[a.why[0].symptom] || '';
  if (a.kind === 'combined') return `${K.indicators.sleepHours.do.crew} ${K.indicators.climate.do.crew}`;
  const d = K.indicators[a.indicator].do;
  return a.tier === 'critical' ? d.surgeon : `${d.self} ${d.crew}`;
}
function renderAlerts() {
  const { R, K, state } = app;
  $('#alerts-count').textContent = R.alerts.length ? `${R.alerts.length} active` : '';
  $('#alerts').innerHTML = R.alerts.length ? R.alerts.map((a, i) => {
    const acked = state.acks[a.id];
    return `<li class="alert" data-tier="${a.tier}" data-zone="${a.zone}">
      <div class="alert-top">${status(a.tier)}<span class="alert-zone">${esc(K.zones[a.zone].legend)}</span></div>
      <button class="alert-title" type="button" data-open="${a.zone}" data-ind="${a.indicator || ''}">${esc(a.title)}</button>
      <details class="why"><summary>Why am I seeing this?</summary>
        <ul>${a.why.map((r) => `<li>${esc(r.text)} ${stamp(r.heuristic)}</li>`).join('')}</ul>
        <p><b>What to do now.</b> ${esc(actionFor(a))}</p>
      </details>
      ${a.tier === 'critical' ? (acked ? `<p class="acked">${icon('check')} Acknowledged on day ${acked.day}</p>` : `<button class="btn btn-ack" type="button" data-ack="${esc(a.id)}">Acknowledge</button>`) : ''}
    </li>`;
  }).join('') : `<li class="alert-none">${status('normal', 'No active alerts')}<p>All seven zones are inside their ranges and near your baseline.</p></li>`;
}

function renderMetrics() {
  const { R, state } = app;
  const t = store.today(state);
  $('#today-sub').textContent = `Day ${R.day}, compared with your pre-flight baseline`;
  $('#metrics').innerHTML = METRIC_IDS.map((id) => {
    const ind = R.indicators[id];
    const base = id === 'bp' ? state.baseline.sys : id === 'radiation' ? undefined : state.baseline[INDICATORS.find((i) => i.id === id).field];
    const stale = ind.loggedDay !== null && ind.loggedDay !== t.day && id !== 'radiation';
    return `<li><button class="metric" type="button" data-open="${ind.zone}" data-ind="${id}" data-tier="${ind.tier}">
      <span class="m-label">${esc(ind.short)}${stale ? `<small>from day ${ind.loggedDay}</small>` : ''}</span>
      <span class="m-spark">${spark(seriesFor(id), base, ind.tier)}</span>
      <span class="m-val"><b data-final="${esc(ind.display)}">${esc(ind.display)}</b><small>${esc(ind.unit)}</small></span>
      <span class="m-arrow" data-dir="${ind.arrow}">${icon(ind.arrow, 14)}<span class="sr-only">${ARROW_WORD[ind.arrow]}</span></span>
      <span class="m-state">${status(ind.tier)}</span>
    </button></li>`;
  }).join('');
}

function routineItems() {
  const { K, state } = app;
  const t = store.today(state);
  let lastVision = 0;
  state.days.forEach((d) => { if (d.vision && d.vision.result) lastVision = d.day; });
  return K.schedule.items.map((it) => {
    const done = it.id === 'vision' ? t.day - lastVision < 7 : it.fields.every((f) => t[f] !== null && t[f] !== undefined);
    const note = it.id === 'vision' && !done ? (lastVision ? `last done day ${lastVision}` : 'not done yet') : '';
    return { ...it, done, note };
  });
}
function bestStreak(days) { let best = 0; let cur = 0; days.forEach((d) => { cur = d.checkedIn ? cur + 1 : 0; best = Math.max(best, cur); }); return best; }
function badges() {
  const { state } = app; const d = state.days;
  let ex = 0; let exBest = 0;
  d.forEach((x) => { ex = x.exerciseMin > 0 ? ex + 1 : 0; exBest = Math.max(exBest, ex); });
  const best = bestStreak(d);
  return [
    { name: 'Seven days in a row', got: best >= 7 },
    { name: 'Thirty days in a row', got: best >= 30 },
    { name: 'Five exercise days running', got: exBest >= 5 },
    { name: 'First report prepared', got: state.reports.length > 0 },
  ];
}
function renderRoutine() {
  const items = routineItems();
  const s = streak(app.state.days); const best = bestStreak(app.state.days);
  $('#streak').textContent = `Check-in streak ${s} days, best ${best}`;
  $('#routine').innerHTML = items.map((it) => `<li class="rt" data-done="${it.done}">
      <span class="rt-time">${esc(it.time)}</span>
      <span class="rt-label">${esc(it.label)}${it.note ? `<small>${esc(it.note)}</small>` : ''}</span>
      ${it.done ? `<span class="rt-done">${icon('check')} Done</span>` : `<button class="btn btn-log" type="button" data-log="${it.id}">Log now</button>`}
    </li>`).join('');
  $('#badges').innerHTML = badges().map((b) => `<li class="badge" data-got="${b.got}"><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.2" ${b.got ? '' : 'stroke-dasharray="2 2.4"'}/>${b.got ? '<path d="M6 10.4 9 13l5-6" fill="none" stroke="currentColor" stroke-width="1.6"/>' : ''}</svg><span>${esc(b.name)}<small>${b.got ? 'earned' : 'not yet'}</small></span></li>`).join('');
}

// ---------- callouts over the body ----------
const callouts = {}; const leaders = {};
function buildCallouts() {
  const box = $('#callouts'); const svg = $('#leaders');
  box.innerHTML = ''; svg.innerHTML = '';
  for (const z of ZONE_IDS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'callout'; b.tabIndex = -1; b.dataset.zone = z; b.dataset.side = SIDE[z]; b.dataset.open = z;
    box.appendChild(b); callouts[z] = { el: b, x: -1, y: -1 };
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.dataset.zone = z; svg.appendChild(p); leaders[z] = p;
  }
  updateCallouts();
}
function updateCallouts() {
  for (const z of ZONE_IDS) {
    const zone = app.R.zones[z]; const c = callouts[z]; if (!c) continue;
    c.el.dataset.tier = zone.tier; leaders[z].dataset.tier = zone.tier;
    c.el.innerHTML = `<span class="c-name">${esc(app.K.zones[z].name)}</span><span class="c-line">${status(zone.tier)}<span class="c-val">${esc(zoneHeadline(z))}</span></span>`;
  }
}
const GAP = 58;
function layoutCallouts(list) {
  app.anchors = list;
  const stage = $('#stage'); const W = stage.clientWidth; const H = stage.clientHeight;
  if (W < 620) return; // phones: the lamp grid right below the body carries the labels
  const col = Math.min(W / 2 - 176, 300);
  for (const side of ['l', 'r']) {
    const items = list.filter((a) => SIDE[a.id] === side).sort((a, b) => a.y - b.y);
    let prev = -Infinity;
    const lx0 = W / 2 + (side === 'l' ? -1 : 1) * col;
    // an anchor that sits under the label column gets its label lifted clear of it
    const ys = items.map((a) => { const under = (side === 'l' ? lx0 - a.x : a.x - lx0) > -28; const y = Math.max(a.y - (a.id === 'whole' ? 92 : under ? 54 : 6), prev + GAP, side === 'r' ? 66 : 30); prev = y; return y; });
    const over = prev - (H - 62);
    if (over > 0) for (let i = ys.length - 1; i >= 0; i--) { ys[i] = Math.min(ys[i], H - 62 - (ys.length - 1 - i) * GAP); }
    items.forEach((a, i) => {
      const c = callouts[a.id]; const dir = side === 'l' ? -1 : 1;
      const lx = Math.round(W / 2 + dir * col); const ly = Math.round(ys[i]);
      if (c.x !== lx || c.y !== ly) { c.x = lx; c.y = ly; c.el.style.transform = `translate(${lx}px, ${ly}px)`; }
      const ex = lx - dir * 8; const kx = a.x + dir * Math.min(Math.abs(ex - a.x) * 0.5, Math.abs(ly - a.y) + 14);
      const dx = kx - a.x; const dy = ly - a.y; const len = Math.hypot(dx, dy) || 1;
      const sx = a.x + (dx / len) * 11; const sy = a.y + (dy / len) * 11;
      leaders[a.id].setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)}L${kx.toFixed(1)} ${ly}H${ex}`);
    });
  }
}

// ---------- linked highlight: lamp ↔ body ↔ callout ----------
function highlight(z, fromBody) {
  $$('.lamp.hl, .callout.hl').forEach((e) => e.classList.remove('hl'));
  $$('#leaders path.hl').forEach((e) => e.classList.remove('hl'));
  if (z) {
    const lamp = $(`.lamp[data-zone="${z}"]`); if (lamp) lamp.classList.add('hl');
    if (callouts[z]) { callouts[z].el.classList.add('hl'); leaders[z].classList.add('hl'); }
  }
  if (!fromBody && app.body) app.body.setHighlight(z);
  else if (app.body) app.body.setHighlight(z);
}

// ---------- zone card ----------
function cueShift() {
  if (window.innerWidth < 1100) return 0;
  const st = $('#stage').getBoundingClientRect(); const dk = $('#deck').getBoundingClientRect();
  const cueW = Math.min(560, dk.width);
  return Math.max(0, st.right - (dk.right - cueW)) / 2;
}
export function openZone(z, ind) {
  app.selected = z;
  $$('.lamp').forEach((l) => l.toggleAttribute('aria-current', l.dataset.zone === z));
  $('#stage').classList.add('focused');
  app.cue.open(z, ind);
  if (app.body) app.body.focus(z, cueShift());
}
function closeZone() {
  if (!app.selected) return;
  const z = app.selected; app.selected = null;
  $$('.lamp').forEach((l) => l.removeAttribute('aria-current'));
  $('#stage').classList.remove('focused');
  if (app.body) app.body.focus(null, 0);
  highlight(null);
  const lamp = $(`.lamp[data-zone="${z}"]`);
  if (lamp && document.activeElement && $('#cue').contains(document.activeElement)) lamp.focus({ preventScroll: true });
}

// ---------- refresh after any data change ----------
export function refresh(announce) {
  app.R = evaluate(app.state, app.T);
  renderTop(); renderLamps(); renderAlerts(); renderMetrics(); renderRoutine(); updateCallouts();
  if (app.body) app.body.setStatuses(Object.fromEntries(ZONE_IDS.map((z) => [z, app.R.zones[z].tier])), unackedZones());
  if (app.selected) { app.cue.open(app.selected, app.cue.indicator, true); $$('.lamp').forEach((l) => l.toggleAttribute('aria-current', l.dataset.zone === app.selected)); }
  if (announce) $('#live').textContent = announce;
  updateMore();
}
function acknowledge(ids) {
  ids.forEach((id) => { app.state.acks[id] = { day: app.R.day }; });
  store.save(app.state);
  refresh(`${ids.length} critical alert${ids.length > 1 ? 's' : ''} acknowledged.`);
}

// ---------- power-up sequence (one orchestrated moment) ----------
function bootSequence() {
  const gsap = window.gsap;
  const order = [...ZONE_IDS].sort((a, b) => TIER[app.R.zones[a].tier] - TIER[app.R.zones[b].tier]);
  const finish = () => { document.body.classList.remove('booting'); $$('.lamp, .master').forEach((l) => l.classList.add('lit')); };
  if (reduced() || !gsap) { app.body.boot(order, true); finish(); return; }
  gsap.registerPlugin(window.ScrambleTextPlugin);
  const lampsEl = $('#zones');
  const tl = gsap.timeline({ onComplete: finish });
  tl.add(app.body.boot(order), 0)
    .add(() => lampsEl.classList.add('test'), 0.35)
    .add(() => lampsEl.classList.remove('test'), 0.8);
  order.forEach((z, i) => tl.add(() => { const l = $(`.lamp[data-zone="${z}"]`); if (l) l.classList.add('lit'); }, 0.9 + i * 0.04));
  tl.fromTo('#callouts, #leaders', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out', clearProps: 'opacity' }, 1.25);
  $$('.metric').forEach((row, i) => {
    const b = $('b[data-final]', row); const at = 1.3 + i * 0.035;
    tl.fromTo(row, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'opacity' }, at)
      .to(b, { duration: 0.55, scrambleText: { text: b.dataset.final, chars: '0123456789', speed: 0.7 } }, at);
  });
  tl.fromTo('.alert', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out', stagger: 0.07, clearProps: 'opacity,transform' }, 1.8)
    .fromTo('.routine, .badges, .today-actions', { opacity: 0 }, { opacity: 1, duration: 0.4, clearProps: 'opacity' }, 1.9)
    .add(() => $('#master').classList.add('lit'), 2.3);
  // from-states render immediately, so the CSS guard can go as soon as the timeline exists
  document.body.classList.remove('booting');
}

// ---------- events ----------
function wire() {
  // a sheet that re-rendered the screen cannot hand focus back by itself
  $$('dialog.sheet').forEach((dlg) => dlg.addEventListener('close', () => {
    const a = document.activeElement;
    if (a && a !== document.body && a.isConnected && !dlg.contains(a)) return;
    (app.invoker && $(app.invoker) || $('#open-checkin')).focus();
  }));
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open], [data-ack], [data-log], .lamp, #master, #link, #open-checkin, #open-report, #reset-demo, #open-about, [data-about]');
    if (!t) return;
    app.invoker = t.dataset.log ? `[data-log="${t.dataset.log}"]` : t.id ? `#${t.id}` : null;
    if (t.matches('.lamp')) return openZone(t.dataset.zone);
    if (t.dataset.open) return openZone(t.dataset.open, t.dataset.ind || undefined);
    if (t.dataset.ack) return acknowledge([t.dataset.ack]);
    if (t.id === 'master') { const u = unacked().map((a) => a.id); if (u.length) acknowledge(u); return undefined; }
    if (t.dataset.log) return openCheckin(app, t.dataset.log);
    if (t.id === 'open-checkin') return openCheckin(app);
    if (t.id === 'open-report') return openReport(app);
    if (t.id === 'open-about' || t.hasAttribute('data-about')) return openAbout(app);
    if (t.id === 'link') {
      app.state.link = app.state.link === 'blackout' ? 'up' : 'blackout';
      const sent = app.state.link === 'up' ? flushQueue(app) : 0;
      store.save(app.state); refresh();
      toast(app.state.link === 'blackout' ? 'Simulated blackout: new reports will wait in the queue.' : sent ? `Link restored (simulated): ${sent} queued report${sent > 1 ? 's' : ''} marked as sent.` : 'Link restored (simulated).');
      return undefined;
    }
    if (t.id === 'reset-demo') { app.state = store.resetDemo(app.T); closeZone(); app.cue.close(); refresh('Demo data restored.'); toast('Demo data restored: mission day 60.'); }
    return undefined;
  });
  $('#env').addEventListener('change', (e) => {
    store.setEnv(app.state, e.target.value, app.T);
    refresh();
    $(`#env input[value="${app.state.env}"]`).focus();
    const dose = app.R.indicators.radiation;
    toast(`${app.T.environments[app.state.env].long}. Earth link: ${linkInfo().text.toLowerCase()}. Radiation dose: ${dose.display} ${dose.unit}.`);
    for (const n of [$('#link'), $('.metric[data-ind="radiation"]')]) { n.classList.remove('changed'); n.getBoundingClientRect(); n.classList.add('changed'); }
  });
  const over = (e) => { const l = e.target.closest('.lamp, .callout, .metric, .alert'); if (l && (l.dataset.zone || l.dataset.open)) highlight(l.dataset.zone || l.dataset.open); };
  const out = (e) => { const l = e.target.closest('.lamp, .callout, .metric, .alert'); if (l) highlight(null); };
  for (const sel of ['#zones', '#callouts', '#metrics', '#alerts']) {
    const n = $(sel);
    n.addEventListener('pointerover', over); n.addEventListener('pointerout', out);
    n.addEventListener('focusin', over); n.addEventListener('focusout', out);
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && app.selected && !document.querySelector('dialog[open]')) { app.cue.close(); } });
  let rt = null;
  document.addEventListener('scroll', updateMore, { capture: true, passive: true });
  const mo = new ResizeObserver(updateMore); mo.observe($('.annun')); mo.observe($('#alerts'));
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (app.selected && app.body) app.body.focus(app.selected, cueShift()); }, 150); });
}

// ---------- start ----------
async function start() {
  const [T, K] = await Promise.all(['data/thresholds.json', 'data/knowledge.json'].map((u) => fetch(u).then((r) => r.json())));
  app.T = T; app.K = K;
  app.state = store.load(T);
  app.R = evaluate(app.state, T);
  app.cue = createCue(app, { onClose: closeZone });
  renderTop(); renderLamps(); renderAlerts(); renderMetrics(); renderRoutine(); buildCallouts();
  wire();

  const opts = { zones: ZONE_IDS, onHover: (z) => highlight(z, true), onSelect: (z) => openZone(z), onFrame: layoutCallouts };
  const container = $('#body3d');
  if (!reduced() && window.gsap) {
    try {
      const m = await import('./body3d.js');
      if (m.webglAvailable()) app.body = await m.createBody(container, opts);
    } catch (err) { console.warn('3D body unavailable, using the 2D figure.', err); }
  }
  if (!app.body) { container.innerHTML = ''; app.body = createFigure(container, opts); $('#stage').classList.add('flat'); $('#stage-hint').textContent = 'Select a zone to read its card.'; }
  app.body.setStatuses(Object.fromEntries(ZONE_IDS.map((z) => [z, app.R.zones[z].tier])), unackedZones());
  bootSequence();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
start().catch((err) => {
  console.error(err);
  document.body.classList.remove('booting');
  $('#stage-hint').textContent = 'The app could not start. Reload the page.';
});
