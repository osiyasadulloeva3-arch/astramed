// Escalation package for the flight surgeon: summary, flagged values, symptoms, actions.
// PDF and JSON are built on this device. "Sending" is simulated: nothing leaves the device.
import { INDICATORS, SYMPTOMS, TIER, TIER_WORD, ZONE_IDS } from './rules.js';
import * as store from './state.js';
import { $, esc, icon, status, stamp, toast } from './ui.js';
import { refresh, linkInfo } from './main.js';

const DISCLAIMER = 'Decision support, not a diagnosis. Critical values → contact crew medical officer / flight surgeon.';
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const WHO = { critical: 'surgeon', attention: 'crew' };
const WHO_WORD = { surgeon: 'Flight surgeon', crew: 'Crew medical officer', self: 'Self-care' };

/** One plain object feeds the on-screen sheet, the JSON file and the PDF. */
export function buildReport(app, range, zone) {
  const { state, R, T, K } = app;
  const days = state.days.slice(-range);
  const stat = (f, dp) => {
    const v = days.map((d) => d[f]).filter(num);
    return v.length ? { min: Math.min(...v), max: Math.max(...v), mean: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(Math.max(dp, 1)), n: v.length } : null;
  };
  const summary = INDICATORS.filter((m) => m.id !== 'vision').map((m) => {
    const ind = R.indicators[m.id]; const a = stat(m.field, m.dp); const b = m.field2 ? stat(m.field2, m.dp) : null;
    const j = (k) => (a ? (b ? `${a[k]}/${b[k]}` : String(a[k])) : 'not logged');
    return { id: m.id, zone: K.zones[m.zone].name, label: m.id === 'radiation' ? 'Radiation: cumulative dose (latest), daily dose (min, mean, max)' : m.label, unit: m.unit, latest: ind.display, status: TIER_WORD[ind.tier], tier: ind.tier, band: ind.band || '', min: j('min'), mean: j('mean'), max: j('max'), readings: a ? a.n : 0, baseline: ind.baseline ?? null };
  });
  const flagged = R.alerts.map((a) => ({ tier: a.tier, status: TIER_WORD[a.tier], zoneId: a.zone, zone: K.zones[a.zone].name, title: a.title, why: a.why.map((r) => r.text), basis: a.why.map((r) => r.heuristic || 'sourced reference'), acknowledgedOnDay: state.acks[a.id] ? state.acks[a.id].day : null }));
  if (zone) flagged.sort((x, y) => (y.zoneId === zone) - (x.zoneId === zone) || TIER[y.tier] - TIER[x.tier]);
  const symptoms = days.filter((d) => d.symptoms && Object.keys(d.symptoms).length).map((d) => ({ day: d.day, symptoms: SYMPTOMS.filter((s) => d.symptoms[s.id]).map((s) => s.label) }));
  const vision = days.filter((d) => d.vision && d.vision.result).map((d) => ({ day: d.day, result: d.vision.result === 'worse' ? 'Worse than before' : 'No change' }));
  const actions = R.alerts.filter((a) => a.indicator).map((a) => { const who = WHO[a.tier] || 'self'; return { indicator: R.indicators[a.indicator].label, level: WHO_WORD[who], text: K.indicators[a.indicator].do[who] }; });
  const rad = R.indicators.radiation;
  return {
    title: 'Crew health report for the flight surgeon',
    tool: 'Astronaut Self-Assessment Health Monitor, student hackathon prototype by team Lyra',
    disclaimer: DISCLAIMER,
    dataNote: state.demo ? 'Fictional demo data. No real person is described.' : 'Self-reported data.',
    crewMember: state.profile.name, role: state.profile.role, mission: state.profile.mission,
    missionDay: R.day, periodDays: days.length, fromDay: days[0].day, toDay: days[days.length - 1].day,
    environment: T.environments[state.env].long || T.environments[state.env].label,
    earthLink: linkInfo().text, escalation: K.environments[state.env].escalation,
    crewHealthScore: { value: R.score, note: 'Team heuristic: 100 minus 8 per Attention zone and 20 per Critical zone.' },
    zones: ZONE_IDS.map((z) => ({ zone: K.zones[z].name, status: TIER_WORD[R.zones[z].tier], tier: R.zones[z].tier })),
    flagged, actions, symptoms, vision, summary,
    radiation: num(rad.value) ? { cumulativeMsv: rad.value, careerLimitMsv: rad.limit, shareOfLimit: +(rad.fraction * 100).toFixed(1) + ' %' } : null,
    thresholds: `Reference ranges were read from their sources on ${T.meta.verifiedOn}; each one is listed with a quote inside the app. Rules marked "team heuristic" are the team's own and are not medical standards.`,
  };
}

// ---------- files ----------
function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
let pdfLib = null;
const loadPdf = () => (pdfLib = pdfLib || new Promise((res, rej) => {
  if (window.jspdf) return res(window.jspdf);
  const s = document.createElement('script'); s.src = 'vendor/jspdf/jspdf.umd.min.js';
  s.onload = () => res(window.jspdf); s.onerror = () => rej(new Error('PDF library missing'));
  document.head.appendChild(s); return undefined;
}));
// The built-in PDF fonts cover Latin-1 only.
const plain = (s) => String(s).replace(/→/g, ':').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, '-').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[^\x20-\xFF]/g, '');

export async function buildPdf(rep) {
  const { jsPDF } = await loadPdf();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = 595; const H = 842; const M = 48; let y = M;
  const room = (h) => { if (y + h > H - M - 24) { doc.addPage(); y = M; } };
  const text = (t, o = {}) => {
    const size = o.size || 9.5; doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(o.grey ? 95 : 20);
    doc.splitTextToSize(plain(t), W - 2 * M - (o.indent || 0)).forEach((l) => { room(size * 1.4); doc.text(l, M + (o.indent || 0), y); y += size * 1.4; });
    y += o.gap || 0;
  };
  const h = (t) => { y += 10; room(40); text(t, { bold: true, size: 11, gap: 2 }); doc.setDrawColor(20); doc.setLineWidth(0.6); doc.line(M, y - 6, W - M, y - 6); y += 6; };

  text(rep.title, { bold: true, size: 17, gap: 4 });
  text(`${rep.crewMember}, ${rep.role}. Mission ${rep.mission}, mission day ${rep.missionDay}. ${rep.environment}.`);
  text(`Period: mission days ${rep.fromDay} to ${rep.toDay} (${rep.periodDays} days). Earth link: ${rep.earthLink}.`, { gap: 6 });
  text(rep.disclaimer, { bold: true });
  text(`${rep.dataNote} ${rep.tool}. Not a NASA product.`, { grey: true });

  h('Zone status');
  rep.zones.forEach((z) => text(`${z.status.toUpperCase()}   ${z.zone}`, { bold: z.tier !== 'normal' }));
  text(`Crew health score ${rep.crewHealthScore.value} of 100. ${rep.crewHealthScore.note}`, { grey: true });

  h(`Flagged values (${rep.flagged.length})`);
  if (!rep.flagged.length) text('Nothing is flagged in this period.');
  rep.flagged.forEach((f) => {
    room(44);
    text(`${f.status.toUpperCase()}: ${f.title} (${f.zone})${f.acknowledgedOnDay ? `, acknowledged on day ${f.acknowledgedOnDay}` : ''}`, { bold: true });
    f.why.forEach((w, i) => text(w + (f.basis[i] === 'sourced reference' ? '' : ` [${f.basis[i] === 'placeholder' ? 'placeholder, not verified' : 'team heuristic'}]`), { indent: 12 }));
    y += 4;
  });

  h('Suggested next step for each flagged reading');
  if (!rep.actions.length) text('No actions are suggested.');
  rep.actions.forEach((a) => { room(36); text(`${a.indicator}: ${a.level}`, { bold: true }); text(a.text, { indent: 12, gap: 3 }); });
  text(rep.escalation, { grey: true });

  h('Symptoms and vision self-checks');
  text(rep.symptoms.length ? rep.symptoms.map((s) => `Day ${s.day}: ${s.symptoms.join(', ')}`).join('. ') + '.' : 'No symptoms were reported in this period.');
  text(rep.vision.length ? rep.vision.map((v) => `Day ${v.day}: ${v.result}`).join('. ') + '. Screening only.' : 'No vision self-check in this period.');

  h(`Summary of readings, days ${rep.fromDay} to ${rep.toDay}`);
  const X = [M, M + 232, M + 300, M + 352, M + 404, M + 456];
  const row = (cells, o = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(8.5); doc.setTextColor(o.grey ? 95 : 20);
    const first = doc.splitTextToSize(plain(cells[0]), 222); room(first.length * 11 + 2);
    first.forEach((l, i) => doc.text(l, X[0], y + i * 11));
    cells.slice(1).forEach((c, i) => doc.text(plain(c), X[i + 1], y));
    y += first.length * 11 + 3;
  };
  row(['Reading', 'Latest', 'Min', 'Mean', 'Max', 'Status'], { grey: true });
  rep.summary.forEach((s) => row([`${s.label}${s.unit ? `, ${s.unit}` : ''}`, s.latest, s.min, s.mean, s.max, s.status], { bold: s.tier === 'attention' || s.tier === 'critical' }));
  if (rep.radiation) text(`Cumulative dose ${rep.radiation.cumulativeMsv} mSv, ${rep.radiation.shareOfLimit} of the ${rep.radiation.careerLimitMsv} mSv career limit.`, { gap: 2 });
  y += 6; text(rep.thresholds, { grey: true });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(95); doc.text(plain(`${rep.disclaimer}   Page ${p} of ${pages}`), M, H - 30); }
  return doc;
}

// ---------- queue (simulated downlink) ----------
export function flushQueue(app) {
  let n = 0;
  app.state.reports.forEach((r) => { if (r.status === 'queued') { r.status = 'sent'; r.sentDay = store.today(app.state).day; n++; } });
  if (n) store.save(app.state);
  return n;
}

// ---------- sheet ----------
export function openReport(app, opts = {}) {
  const dlg = $('#report');
  let range = 7;
  const fileName = (ext) => `lyra-health-report-day${app.R.day}-${range}d.${ext}`;

  const render = () => {
    const rep = buildReport(app, range, opts.zone);
    const blackout = app.state.link === 'blackout';
    const log = [...app.state.reports].reverse().slice(0, 4);
    dlg.innerHTML = `<div class="sheet-in">
      <header class="sheet-head"><div><h2 id="report-title">Report for the flight surgeon</h2>
        <p>${esc(rep.crewMember)}, ${esc(rep.role)}. Mission day ${rep.missionDay}, ${esc(rep.environment)}.</p></div>
        <button class="sheet-close" type="button" data-close aria-label="Close report">${icon('close', 14)}</button></header>
      <div class="sheet-body rep">
        <div class="rep-top">
          <div class="seg" role="group" aria-label="Report period">${[7, 30].map((r) => `<button type="button" data-range="${r}" aria-pressed="${r === range}">Last ${r} days</button>`).join('')}</div>
          <p class="rep-period">Mission days ${rep.fromDay} to ${rep.toDay}</p>
        </div>
        <p class="rep-disc"><strong>Decision support, not a diagnosis.</strong> Critical values → contact crew medical officer / flight surgeon. <span>${esc(rep.dataNote)}</span></p>

        <h3>Zone status</h3>
        <ul class="rep-zones">${rep.zones.map((z) => `<li>${status(z.tier)}<span>${esc(z.zone)}</span></li>`).join('')}</ul>

        <h3>Flagged values, ${rep.flagged.length}</h3>
        ${rep.flagged.length ? `<ul class="rep-flags">${rep.flagged.map((f) => `<li data-tier="${f.tier}">${status(f.tier)}<div><b>${esc(f.title)}</b><small>${esc(f.zone)}${f.acknowledgedOnDay ? `, acknowledged on day ${f.acknowledgedOnDay}` : ''}</small>${f.why.map((w, i) => `<p>${esc(w)} ${f.basis[i] === 'sourced reference' ? '' : stamp(f.basis[i])}</p>`).join('')}</div></li>`).join('')}</ul>` : '<p>Nothing is flagged in this period.</p>'}

        <h3>Suggested next step for each flagged reading</h3>
        ${rep.actions.length ? `<ul class="rep-actions">${rep.actions.map((a) => `<li><b>${esc(a.indicator)}</b><i>${esc(a.level)}</i><p>${esc(a.text)}</p></li>`).join('')}</ul>` : '<p>No actions are suggested.</p>'}
        <p class="rep-note">${esc(rep.escalation)}</p>

        <h3>Symptoms and vision self-checks</h3>
        <p>${rep.symptoms.length ? rep.symptoms.map((s) => `Day ${s.day}: ${esc(s.symptoms.join(', ').toLowerCase())}`).join('. ') + '.' : 'No symptoms were reported in this period.'}
        ${rep.vision.length ? rep.vision.map((v) => `Vision self-check on day ${v.day}: ${esc(v.result.toLowerCase())}`).join('. ') + ' (screening only).' : 'No vision self-check in this period.'}</p>

        <h3>Summary of readings</h3>
        <div class="rep-scroll"><table class="rep-table"><thead><tr><th scope="col">Reading</th><th scope="col">Latest</th><th scope="col">Min</th><th scope="col">Mean</th><th scope="col">Max</th><th scope="col">Status</th></tr></thead>
        <tbody>${rep.summary.map((s) => `<tr><th scope="row">${esc(s.label)}${s.unit ? `<small>${esc(s.unit)}</small>` : ''}</th><td>${esc(s.latest)}</td><td>${esc(s.min)}</td><td>${esc(s.mean)}</td><td>${esc(s.max)}</td><td>${status(s.tier)}</td></tr>`).join('')}</tbody></table></div>
        <p class="rep-note">${esc(rep.thresholds)}</p>

        <h3>Report log</h3>
        ${log.length ? `<ul class="rep-log">${log.map((r) => `<li><span>Day ${r.day}, last ${r.range} days</span><b data-status="${r.status}">${r.status === 'queued' ? 'Waiting for the link' : 'Sent (simulated)'}</b></li>`).join('')}</ul>` : '<p>No report has been sent or queued yet.</p>'}
      </div>
      <footer class="sheet-foot">
        <p class="rep-sim">Sending is simulated. Nothing leaves this device.</p>
        <button class="btn btn-inkline" type="button" data-json>Download JSON</button>
        <button class="btn btn-inkline" type="button" data-pdf>Download PDF</button>
        <button class="btn btn-ink" type="button" data-send>${blackout ? 'Queue until the link returns' : 'Send to the flight surgeon'}</button>
      </footer></div>`;
  };

  dlg.onclick = async (e) => {
    if (e.target === dlg) return dlg.close();
    const b = e.target.closest('button'); if (!b) return undefined;
    if ('close' in b.dataset) return dlg.close();
    if (b.dataset.range) { range = Number(b.dataset.range); render(); $(`[data-range="${range}"]`, dlg).focus(); return undefined; }
    const rep = buildReport(app, range, opts.zone);
    if ('json' in b.dataset) { download(fileName('json'), new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json' })); toast('JSON report saved to this device.'); return undefined; }
    if ('pdf' in b.dataset) {
      b.disabled = true;
      try { const doc = await buildPdf(rep); download(fileName('pdf'), doc.output('blob')); toast('PDF report saved to this device.'); } catch { toast('The PDF could not be built. Use Download JSON instead.'); }
      b.disabled = false; return undefined;
    }
    if ('send' in b.dataset) {
      const blackout = app.state.link === 'blackout';
      app.state.reports.push({ id: `r${app.state.reports.length + 1}`, day: app.R.day, range, status: blackout ? 'queued' : 'sent' });
      store.save(app.state); refresh();
      render(); $('[data-send]', dlg).focus();
      toast(blackout ? 'Report queued. It will be marked as sent when the link returns (simulated).' : `Report marked as sent (simulated). Earth link: ${linkInfo().text.toLowerCase()}.`);
    }
    return undefined;
  };

  render();
  if (!dlg.open) dlg.showModal();
}
