// Crew files and data: who is using this device, a new empty crew file, export, import, delete, reset.
// Also the first-visit welcome note. Everything stays in this browser.
import * as store from './state.js';
import { LIMITS, validate } from './rules.js';
import { $, esc, icon, toast } from './ui.js';
import { use } from './main.js';
import { download } from './report.js';

const BASE = [
  { f: 'restingHr', ref: 'restingHr', label: 'Resting heart rate', unit: 'bpm', step: 1, dp: 0 },
  { f: 'sys', ref: 'bloodPressure', label: 'Systolic pressure', unit: 'mmHg', step: 1, dp: 0 },
  { f: 'dia', ref: 'bloodPressure', label: 'Diastolic pressure', unit: 'mmHg', step: 1, dp: 0 },
  { f: 'bodyTemp', ref: 'bodyTemp', label: 'Body temperature', unit: '°C', step: 0.1, dp: 1 },
  { f: 'fastingGlucose', ref: 'fastingGlucose', label: 'Fasting blood glucose', unit: 'mg/dL', step: 1, dp: 0 },
  { f: 'sleepHours', ref: 'sleepHours', label: 'Usual sleep', unit: 'h', step: 0.5, dp: 1 },
];
const WHO = [
  { f: 'name', label: 'Name', hint: 'required', ph: 'for example S. Karimova', auto: 'name' },
  { f: 'role', label: 'Role', hint: 'optional', ph: 'for example Mission specialist', auto: 'organization-title' },
  { f: 'mission', label: 'Mission', hint: 'optional', ph: 'for example Lyra-2', auto: 'off' },
];
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const fmt = (v, dp) => String(+v.toFixed(dp));

// hints and stepper start values come from the same sourced ranges the rules use
function ref(T, n) {
  const I = T.indicators[n.ref];
  if (I.categories) { const lt = I.categories[0][n.f === 'sys' ? 'systolic' : 'diastolic'].lt; return { hint: `Normal category: below ${lt} ${n.unit}`, start: lt - 1 }; }
  if (I.normal) return { hint: `Reference range: ${I.normal.min} to ${I.normal.max} ${n.unit}`, start: (I.normal.min + I.normal.max) / 2 };
  return { hint: `Recommended for adults: ${I.recommended.gte} ${n.unit} or more`, start: I.recommended.gte };
}

let view = 'list';
let note = null; // { bad, text } shown under the data buttons
let asking = false; // delete confirmation is open

function listView(app) {
  const rows = store.crew(app.T);
  const cur = rows.find((r) => r.active);
  return `<div class="sheet-in">
    <header class="sheet-head"><div><h2 id="crew-title">Crew and data</h2><p>Crew files stay in this browser, on this device. Nothing is sent anywhere.</p></div>
      <button class="sheet-close" type="button" data-close aria-label="Close">${icon('close', 14)}</button></header>
    <div class="sheet-body crew">
      <section><h3>Crew files on this device</h3>
        <ul class="crew-list">${rows.map((r) => `<li class="crew-row" ${r.active ? 'data-active' : ''}>
          <div class="crew-who"><b>${esc(r.name)}</b><small>${esc([r.role, r.mission].filter(Boolean).join(', '))}</small></div>
          <span class="crew-meta">${r.demo ? `Demo mission, day ${r.day}, fictional data` : `Mission day ${r.day}, ${r.logged} check-in${r.logged === 1 ? '' : 's'} logged`}</span>
          ${r.active ? `<span class="crew-now">${icon('check')} Open now</span>` : `<button class="btn btn-line" type="button" data-switch="${esc(r.id)}">Open<span class="sr-only"> the file of ${esc(r.name)}</span></button>`}
        </li>`).join('')}</ul>
        <button class="btn btn-solid" type="button" data-new>New crew file</button>
      </section>
      <section><h3>Data</h3>
        <p class="ci-note">An export is one JSON file with every crew file on this device, the demo mission included. Keep a copy: clearing the browser data removes the files. An import is checked value by value before anything is stored.</p>
        <div class="data-row">
          <button class="btn btn-line" type="button" data-export>Export all data (JSON)</button>
          <button class="btn btn-line" type="button" data-import>Import from JSON</button>
          <input type="file" id="crew-file" accept="application/json,.json" hidden>
        </div>
        <p class="data-note" id="crew-note" role="alert" ${note && note.bad ? 'data-bad' : ''}>${note ? esc(note.text) : ''}</p>
        <div class="data-row">
          <button class="btn btn-line" type="button" data-delete ${cur.demo ? 'disabled' : ''}>Delete this crew file</button>
          <button class="btn btn-line" type="button" data-reset>Reset the demo mission</button>
        </div>
        ${cur.demo ? '<p class="ci-note">The demo mission is open. It cannot be deleted, only reset to day 60.</p>' : ''}
        ${asking && !cur.demo ? `<div class="confirm" id="crew-confirm"><p>Delete the crew file of <b>${esc(cur.name)}</b>? Its ${cur.day} day${cur.day === 1 ? '' : 's'} of entries will be removed from this device. Export first if you want a copy.</p>
          <div class="data-row"><button class="btn btn-danger" type="button" data-delete-yes>Delete the file</button><button class="btn btn-quiet" type="button" data-delete-no>Keep it</button></div></div>` : ''}
      </section>
    </div></div>`;
}

function newView(app) {
  const { T } = app;
  const who = WHO.map((w) => `<div class="fld fld-text" data-field="${w.f}">
      <label for="nf-${w.f}">${w.label} <small>${w.hint}</small></label>
      <div class="fld-row"><input id="nf-${w.f}" name="${w.f}" type="text" maxlength="40" autocomplete="${w.auto}" placeholder="${w.ph}" aria-describedby="nf-${w.f}-e"></div>
      <p class="fld-err" id="nf-${w.f}-e" role="alert"></p></div>`).join('');
  const base = BASE.map((n) => `<div class="fld" data-field="${n.f}">
      <label for="nf-${n.f}">${n.label} <small>optional</small></label>
      <div class="fld-row">
        <button class="step" type="button" data-step="-1" aria-label="Lower ${n.label.toLowerCase()}">${icon('minus', 14)}</button>
        <input id="nf-${n.f}" name="${n.f}" type="text" inputmode="decimal" autocomplete="off" placeholder="not known" aria-describedby="nf-${n.f}-u nf-${n.f}-h nf-${n.f}-e">
        <span class="fld-unit" id="nf-${n.f}-u">${n.unit}</span>
        <button class="step" type="button" data-step="1" aria-label="Raise ${n.label.toLowerCase()}">${icon('plus', 14)}</button>
      </div>
      <p class="fld-hint" id="nf-${n.f}-h">${esc(ref(T, n).hint)}</p>
      <p class="fld-err" id="nf-${n.f}-e" role="alert"></p></div>`).join('');
  return `<form class="sheet-in" id="crew-form" novalidate>
    <header class="sheet-head"><div><h2 id="crew-title">New crew file</h2><p>Mission day 1 starts today. The file is kept only on this device.</p></div>
      <button class="sheet-close" type="button" data-back aria-label="Back to crew and data">${icon('close', 14)}</button></header>
    <div class="sheet-body crew">
      <section><h3>Crew member</h3><div class="ci-grid">${who}</div></section>
      <section><h3>Mission environment</h3>
        <div class="env nf-env" role="radiogroup" aria-label="Mission environment">${Object.entries(T.environments).map(([id, e]) => `<label class="env-opt"><input type="radio" name="env" value="${id}" ${id === 'mars' ? 'checked' : ''}><span>${esc(e.label)}<small>${esc(e.long)}</small></span></label>`).join('')}</div>
        <p class="ci-note">It sets the Earth-link delay and the radiation dose rate. You can change it later in the top bar.</p>
      </section>
      <section><h3>Pre-flight baseline</h3>
        <p class="ci-note">Your own usual values, measured on Earth before the flight. Every reading is compared with the reference range and with these. Leave a field empty if you do not know the value; then only the reference range is used for it.</p>
        <div class="ci-grid">${base}</div>
      </section>
    </div>
    <footer class="sheet-foot"><p class="ci-sum" id="nf-sum" role="alert"></p><button class="btn btn-quiet" type="button" data-back>Back</button><button class="btn btn-solid" type="submit">Create crew file</button></footer>
  </form>`;
}

function readForm(form) {
  const errors = {};
  const who = Object.fromEntries(WHO.map((w) => [w.f, form.elements[w.f].value.replace(/\s+/g, ' ').trim().slice(0, 40)]));
  if (!who.name) errors.name = 'Enter a name for this crew file.';
  const baseline = {};
  BASE.forEach((n) => {
    const raw = form.elements[n.f].value.trim().replace(',', '.');
    const v = raw === '' ? null : Number(raw);
    baseline[n.f] = v;
    if (v === null) return;
    const r = validate(n.f, v);
    if (!r.ok) errors[n.f] = Number.isFinite(v) ? r.msg : 'Enter digits only.';
  });
  if (!errors.sys && !errors.dia) {
    if ((baseline.sys === null) !== (baseline.dia === null)) errors[baseline.sys === null ? 'sys' : 'dia'] = 'Enter both pressure numbers, or neither.';
    else if (baseline.sys !== null && baseline.dia >= baseline.sys) errors.dia = 'Diastolic must be lower than systolic.';
  }
  return { errors, input: { ...who, env: form.elements.env.value, baseline } };
}
function showErrors(form, errors) {
  [...WHO, ...BASE].forEach((n) => {
    const box = $(`[data-field="${n.f}"]`, form); const msg = errors[n.f] || '';
    $('.fld-err', box).textContent = msg; box.toggleAttribute('data-bad', !!msg);
    form.elements[n.f].setAttribute('aria-invalid', String(!!msg));
  });
  const bad = Object.keys(errors);
  $('#nf-sum', form).textContent = bad.length ? `${bad.length} field${bad.length > 1 ? 's' : ''} cannot be saved. Check the marked field${bad.length > 1 ? 's' : ''}.` : '';
  if (bad.length) form.elements[bad[0]].focus();
  return !bad.length;
}

async function importFile(app, file, render) {
  try {
    if (file.size > MAX_IMPORT_BYTES) throw new Error('This file is larger than 5 MB, which is more than an AstraMed export can be. Nothing was imported.');
    let obj;
    try { obj = JSON.parse(await file.text()); } catch { throw new Error('This file is not valid JSON. Nothing was imported.'); }
    const r = store.importAll(obj, app.T);
    note = { text: `Import finished: ${r.added} crew file${r.added === 1 ? '' : 's'} added, ${r.replaced} replaced.` };
    use(store.load(app.T), 'Import finished.');
  } catch (err) { note = { bad: true, text: err.message }; }
  render();
}

export function openCrew(app, start = 'list') {
  const dlg = $('#crew');
  view = start; note = null; asking = false;
  const render = (focus) => {
    dlg.innerHTML = view === 'new' ? newView(app) : listView(app);
    const form = $('#crew-form', dlg);
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const { errors, input } = readForm(form);
        if (!showErrors(form, errors)) return;
        const s = store.createFile(input, app.T);
        store.setWelcome('own');
        dlg.close();
        use(s, `Crew file of ${s.profile.name} opened, mission day 1.`);
        toast(`Salom, ${s.profile.name}. Your crew file is open on mission day 1. Log the first check-in to start.`);
      };
      form.elements.name.focus();
    } else {
      $('#crew-file', dlg).onchange = (e) => { const f = e.target.files[0]; if (f) importFile(app, f, () => render('[data-import]')); };
      const el = focus && $(focus, dlg); if (el) el.focus();
    }
  };
  dlg.onclick = (e) => {
    if (e.target === dlg) return dlg.close();
    const b = e.target.closest('button'); if (!b) return undefined;
    const d = b.dataset;
    if ('close' in d) return dlg.close();
    if ('new' in d) { view = 'new'; return render(); }
    if ('back' in d) { view = 'list'; return render('[data-new]'); }
    if (d.switch) {
      const s = store.switchTo(d.switch, app.T);
      dlg.close();
      use(s, `Crew file of ${s.profile.name} opened, mission day ${store.today(s).day}.`);
      return toast(`Salom, ${s.profile.name}. Mission day ${store.today(s).day}${s.demo ? ', demo mission with fictional data' : ''}.`);
    }
    if ('export' in d) {
      const all = store.exportAll(app.T);
      download(`astramed-crew-files-${all.exportedAt.slice(0, 10)}.json`, new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' }));
      note = { text: `Exported ${all.files.length} crew file${all.files.length === 1 ? '' : 's'} to a JSON file on this device.` };
      return render('[data-export]');
    }
    if ('import' in d) { const inp = $('#crew-file', dlg); inp.value = ''; return inp.click(); }
    if ('delete' in d) { asking = true; note = null; return render('[data-delete-no]'); }
    if ('deleteNo' in d) { asking = false; return render('[data-delete]'); }
    if ('deleteYes' in d) {
      const name = app.state.profile.name;
      store.deleteFile(app.state.id);
      asking = false; note = { text: `The crew file of ${name} was deleted from this device. The demo mission is open.` };
      use(store.load(app.T), 'Crew file deleted. The demo mission is open.');
      return render('[data-new]');
    }
    if ('reset' in d) {
      const s = store.resetDemo(app.T);
      if (app.state.demo) use(s, 'Demo data restored.');
      note = { text: 'The demo mission was reset to day 60.' };
      return render('[data-reset]');
    }
    if (d.step) {
      const box = b.closest('.fld'); const n = BASE.find((x) => x.f === box.dataset.field); const input = $('input', box);
      const cur = Number(input.value.trim().replace(',', '.'));
      let v = input.value.trim() === '' || !Number.isFinite(cur) ? ref(app.T, n).start : cur + Number(d.step) * n.step;
      v = Math.min(LIMITS[n.f][1], Math.max(LIMITS[n.f][0], v));
      input.value = fmt(v, n.dp);
    }
    return undefined;
  };
  render();
  if (!dlg.open) dlg.showModal();
}

/** First visit: a small note in the corner, shown after the power-up sequence. It never blocks the demo. */
export function showWelcome(app) {
  if (store.welcome()) return;
  const el = $('#welcome');
  el.innerHTML = `<p class="wl-hi">Salom, Rahimi.</p>
    <h2 id="welcome-title">Welcome to AstraMed</h2>
    <p class="wl-sub">Astronaut self-assessment health monitor by team Lyra for NASA Space Apps 2026.</p>
    <p>This is a demo mission with fictional data: flight engineer A. Rahimi, day 60 on the way to Mars. Look around, or start a file with your own readings. Either way everything stays on this device.</p>
    <div class="wl-act"><button class="btn" type="button" data-welcome="demo">Explore the demo mission</button><button class="btn" type="button" data-welcome="own">Start my own crew file</button></div>
    <button class="wl-close" type="button" data-welcome="demo" aria-label="Close the welcome note">${icon('close', 12)}</button>`;
  el.hidden = false;
  el.onclick = (e) => {
    const b = e.target.closest('[data-welcome]'); if (!b) return;
    store.setWelcome(b.dataset.welcome);
    el.hidden = true; el.innerHTML = '';
    if (b.dataset.welcome === 'own') { app.invoker = '#open-crew'; openCrew(app, 'new'); } else $('#open-crew').focus({ preventScroll: true });
  };
}
