// Zone card: the reading surface. Paper cue card that slides over the right side of the deck.
import { INDICATORS, SYMPTOMS, TIER, TIER_WORD } from './rules.js';
import * as store from './state.js';
import { $, $$, esc, glyph, status, icon, stamp, updateMore, ARROW_WORD } from './ui.js';
import { chartSpec, renderChart } from './charts.js';
import { openCheckin } from './checkin.js';
import { openReport } from './report.js';

const GUIDE = [['measure', 'How to measure'], ['why', 'Why it matters'], ['space', 'How spaceflight affects it']];
const STEPS = [['self', 'Self-care', 'normal'], ['crew', 'Crew medical officer', 'attention'], ['surgeon', 'Flight surgeon', 'critical']];
const RANGES = [[7, '7 days'], [30, '30 days'], ['all', 'All']];

export function createCue(app, { onClose }) {
  const el = $('#cue');
  const cue = { zone: null, indicator: null, range: 30, chart: null, ro: null };

  function sources(ind) {
    const { T } = app;
    const meta = INDICATORS.find((i) => i.id === ind.id);
    const ref = meta.ref && T.indicators[meta.ref];
    if (!ref) return `<p>No reference range is used for this reading. It is tracked against your own baseline and shown for context only. ${stamp('team-heuristic')}</p>`;
    const src = ref.sources.map((s) => `<li><blockquote lang="en">${esc(s.quote)}</blockquote><cite lang="en">${esc(s.org)}. ${esc(s.title)}.</cite>${s.url ? ` <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a>` : ''}</li>`).join('');
    const tiers = ['attention', 'critical'].filter((t) => ref.tiers && ref.tiers[t]).map((t) => `<li>${status(t)} <span>${esc(ref.tiers[t])}</span></li>`).join('');
    const verified = ref.status === 'verified' ? `Numbers were read on the source pages on ${esc(T.meta.verifiedOn)}.` : '';
    return `<ul class="src-list">${src}</ul>
      ${tiers ? `<p class="src-h">How the team maps these numbers to a status ${stamp(ref.tierStatus)}</p><ul class="src-tiers">${tiers}</ul>` : ''}
      <p class="src-note">${verified} ${ref.status !== 'verified' ? stamp(ref.status) : ''} ${esc(ref.notes || '')}</p>
      <p class="src-note">Links open only when a network is available. The quotes above are stored in the app.</p>`;
  }

  function panel(ind) {
    const { K, R, state, T } = app;
    const k = K.indicators[ind.id];
    const t = store.today(state);
    const stale = ind.loggedDay !== null && ind.loggedDay !== t.day && ind.id !== 'radiation';
    const cur = ind.tier === 'critical' ? 'surgeon' : ind.tier === 'attention' ? 'crew' : 'self';
    const hasBase = ind.baseline !== undefined && ind.baseline !== null;
    const extra = ind.id === 'radiation'
      ? `<p class="ind-extra">Dose rate used for this environment (${esc(T.environments[state.env].long)}): <b>${ind.envDaily} mSv per day</b> (${esc(ind.envKind)}). At this rate the career limit is about <b>${ind.daysToLimit} days</b> away.${ind.designLimit ? ` The design limit for this kind of vehicle is ${ind.designLimit} mSv per day.` : ''}</p>` : '';
    const chart = ind.id === 'vision'
      ? `<ul class="vis-log">${state.days.filter((d) => d.vision && d.vision.result).slice(-5).reverse().map((d) => `<li><span>Day ${d.day}</span><b>${d.vision.result === 'same' ? 'No change' : 'Worse than reference'}</b></li>`).join('') || '<li>No vision checks yet.</li>'}</ul>
         <button class="btn btn-ink" type="button" data-cue-log="vision">Start the vision self-check</button>`
      : `<div class="seg" role="group" aria-label="Chart range">${RANGES.map(([v, l]) => `<button type="button" data-range="${v}" aria-pressed="${String(cue.range) === String(v)}">${l}</button>`).join('')}</div>
         <div class="chart" id="cue-chart" role="img" aria-label="${esc(ind.label)} trend chart"></div>
         <p class="chart-cap" id="cue-chart-cap"></p>`;
    const top = ind.reasons.filter((r) => r.tier === ind.tier);
    const cause = !top.length || top.some((r) => r.kind !== 'trend' && r.kind !== 'baseline') ? ind.band : top[0].kind === 'trend' ? '7-day trend' : 'off your baseline';
    return `<div class="ind-head">
        <p class="ind-num"><b>${esc(ind.display)}</b><small>${esc(ind.unit)}</small></p>
        <ul class="ind-meta">
          <li>${status(ind.tier)}${cause ? `<span class="ind-band">${esc(cause)}</span>` : ''}</li>
          ${cause !== ind.band && ind.band ? `<li>${ind.id === 'bp' ? 'AHA category' : 'Reference range'}: ${esc(ind.band.toLowerCase())}</li>` : ''}
          ${hasBase ? `<li>${icon(ind.arrow)} ${ARROW_WORD[ind.arrow]} (${esc(ind.baseline)}${ind.unit && ind.unit !== '/ 5' ? ' ' + esc(ind.unit) : ''})</li>` : ''}
          ${stale ? `<li>Last logged on day ${ind.loggedDay}</li>` : ''}
        </ul>
      </div>
      ${extra}${chart}
      <div class="guide">${GUIDE.map(([f, h]) => `<div><h4>${h}</h4><p>${esc(k[f])}</p></div>`).join('')}</div>
      <h4 class="steps-h">What to do</h4>
      <ol class="steps">${STEPS.map(([f, h, tier]) => `<li ${f === cur ? 'data-now' : ''} data-tier="${tier}"><b>${h}${f === cur ? '<i>start here</i>' : ''}</b><p>${esc(k.do[f])}</p></li>`).join('')}</ol>
      <details class="src"><summary>${icon('info', 14)} Source for these limits</summary>${sources(ind)}</details>`;
  }

  function render(keepScroll) {
    const { K, R, state, T } = app;
    const z = cue.zone; const zone = R.zones[z]; const kz = K.zones[z];
    const inds = zone.indicators.map((id) => R.indicators[id]);
    if (!cue.indicator || !zone.indicators.includes(cue.indicator)) cue.indicator = [...inds].sort((a, b) => TIER[b.tier] - TIER[a.tier])[0].id;
    const ind = R.indicators[cue.indicator];
    const why = [...zone.reasons, ...inds.flatMap((i) => i.reasons.filter((r) => TIER[r.tier] >= TIER.attention))];
    const t = store.today(state);
    const syms = SYMPTOMS.filter((s) => s.zone === z && t.symptoms && t.symptoms[s.id]);
    const L = T.environments[state.env];
    const scroll = keepScroll ? el.querySelector('.cue-body')?.scrollTop : 0;
    el.innerHTML = `<div class="cue-paper">
      <header class="cue-head">
        <h2 id="cue-title">${esc(kz.name)}</h2>
        <span class="cue-stamp" data-tier="${zone.tier}">${glyph(zone.tier)}<span>${TIER_WORD[zone.tier]}</span></span>
        <button class="cue-close" type="button" aria-label="Close card">${icon('close', 16)}</button>
      </header>
      <div class="cue-body">
        <p class="cue-about">${esc(kz.about)}</p>
        <section class="cue-why">
          <h3>Why this status</h3>
          ${why.length ? `<ul>${why.map((r) => `<li data-tier="${r.tier}">${glyph(r.tier)}<span>${esc(r.text)} ${stamp(r.heuristic)}</span></li>`).join('')}</ul>` : '<p>Every reading in this zone is inside its range and close to your baseline.</p>'}
          ${syms.map((s) => `<p class="cue-sym"><b>${esc(s.label)}.</b> ${esc(K.symptoms[s.id])}</p>`).join('')}
        </section>
        ${inds.length > 1 ? `<div class="tabs" role="tablist" aria-label="Readings in this zone">${inds.map((i) => `<button type="button" role="tab" id="tab-${i.id}" aria-selected="${i.id === ind.id}" tabindex="${i.id === ind.id ? 0 : -1}" data-tab="${i.id}" data-tier="${i.tier}"><span>${esc(i.short)}</span><small>${glyph(i.tier)}${TIER_WORD[i.tier]}</small></button>`).join('')}</div>` : ''}
        <section class="ind" ${inds.length > 1 ? `role="tabpanel" aria-labelledby="tab-${ind.id}"` : ''}>
          <h3 class="ind-title">${esc(ind.label)}</h3>
          ${panel(ind)}
        </section>
        <section class="cue-env">
          <h3>If this turns Critical on the ${esc(L.long.toLowerCase())}</h3>
          <p>${esc(K.environments[state.env].escalation)}</p>
        </section>
        <section class="cue-risk">
          <h3>Related risks on the NASA Human Research Program list</h3>
          <ul lang="en">${kz.risks.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
          <p class="src-note">Names quoted from <a href="${esc(K.meta.riskUrl)}" target="_blank" rel="noopener noreferrer">${esc(K.meta.riskUrl)}</a>. This app is not part of that program.</p>
        </section>
        <div class="cue-actions">
          ${TIER[zone.tier] >= TIER.attention ? '<button class="btn btn-ink" type="button" data-cue-report>Prepare report for the flight surgeon</button>' : ''}
          <button class="btn btn-inkline" type="button" data-cue-log="">Log a new reading</button>
        </div>
      <div class="more" aria-hidden="true"><span></span></div>
      </div></div>`;
    if (scroll) el.querySelector('.cue-body').scrollTop = scroll;
    updateMore();
    drawChart();
  }

  async function drawChart() {
    const box = $('#cue-chart', el);
    if (cue.chart) { cue.chart.dispose(); cue.chart = null; }
    if (cue.ro) { cue.ro.disconnect(); cue.ro = null; }
    if (!box) return;
    const spec = chartSpec(app, cue.indicator, cue.range);
    const s0 = spec.series[0].data; const f = (i) => spec.series.map((s) => (s.data[i] === null ? '' : Number(s.data[i]).toFixed(spec.dp))).join('/');
    const cap = [];
    if (spec.weekAgo >= 0 && spec.last >= 0) cap.push(`A week before the latest reading: ${f(spec.weekAgo)} ${spec.unit} (${spec.type === 'bar' ? 'dark bar' : 'open circle'}). Latest: ${f(spec.last)} ${spec.unit}.`);
    else if (spec.last >= 0) cap.push(`Latest reading: ${f(spec.last)} ${spec.unit}.`);
    if (s0.some((v, i) => v === null && i < spec.last)) cap.push('Gaps are days with no entry.');
    if (spec.note) cap.push(spec.note);
    $('#cue-chart-cap', el).textContent = cap.join(' ');
    box.setAttribute('aria-label', `${spec.label} over ${spec.x.length} days. ${cap[0] || ''}`);
    try {
      const chart = await renderChart(box, spec);
      if (!box.isConnected) { chart.dispose(); return; }
      cue.chart = chart;
      cue.ro = new ResizeObserver(() => chart.resize()); cue.ro.observe(box);
    } catch (err) { box.textContent = 'Chart could not be drawn.'; console.error(err); }
  }

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('.cue-close')) return api.close();
    if (t.dataset.tab) { cue.indicator = t.dataset.tab; render(true); $(`#tab-${cue.indicator}`, el).focus(); return undefined; }
    if (t.dataset.range) { cue.range = t.dataset.range === 'all' ? 'all' : Number(t.dataset.range); $$('[data-range]', el).forEach((b) => b.setAttribute('aria-pressed', String(b === t))); drawChart(); return undefined; }
    if ('cueReport' in t.dataset) return openReport(app, { zone: cue.zone });
    if ('cueLog' in t.dataset) return openCheckin(app, t.dataset.cueLog || undefined);
    return undefined;
  });
  el.addEventListener('keydown', (e) => {
    const tab = e.target.closest('[role="tab"]'); if (!tab) return;
    const tabs = $$('[role="tab"]', el); const i = tabs.indexOf(tab);
    const j = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault(); tabs[j].click();
  });

  const api = {
    get indicator() { return cue.indicator; },
    get zone() { return cue.zone; },
    open(z, ind, keep) {
      const same = keep && cue.zone === z;
      cue.zone = z; cue.indicator = ind || (same ? cue.indicator : null);
      render(same);
      if (same) return;
      el.removeAttribute('inert'); el.setAttribute('aria-hidden', 'false');
      el.classList.add('open'); document.body.classList.add('cue-open');
      el.focus({ preventScroll: true });
    },
    close() {
      if (!cue.zone) return;
      cue.zone = null;
      onClose();
      el.classList.remove('open'); document.body.classList.remove('cue-open');
      el.setAttribute('aria-hidden', 'true'); el.setAttribute('inert', '');
    },
  };
  return api;
}
