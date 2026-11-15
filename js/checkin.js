// Daily check-in: the operating panel. Big targets, steppers, icon choices; meant to take under a minute.
import { SYMPTOMS, LIMITS, validateDay, latest } from './rules.js';
import * as store from './state.js';
import { $, $$, esc, icon, toast } from './ui.js';
import { chime } from './sound.js';
import { refresh } from './main.js';

const NUM = [
  { f: 'restingHr', g: 'vitals', label: 'Resting heart rate', unit: 'bpm', step: 1, dp: 0 },
  { f: 'standingHr', g: 'vitals', label: 'Heart rate on standing', unit: 'bpm', step: 1, dp: 0 },
  { f: 'sys', g: 'vitals', label: 'Systolic pressure', unit: 'mmHg', step: 1, dp: 0 },
  { f: 'dia', g: 'vitals', label: 'Diastolic pressure', unit: 'mmHg', step: 1, dp: 0 },
  { f: 'bodyTemp', g: 'vitals', label: 'Body temperature', unit: '°C', step: 0.1, dp: 1 },
  { f: 'fastingGlucose', g: 'vitals', label: 'Fasting blood glucose', unit: 'mg/dL', step: 1, dp: 0 },
  { f: 'spo2', g: 'vitals', label: 'Blood oxygen', hint: 'optional', unit: '%', step: 1, dp: 0 },
  { f: 'sleepHours', g: 'checkin', label: 'Sleep last night', unit: 'h', step: 0.5, dp: 1 },
  { f: 'exerciseMin', g: 'exercise', label: 'Exercise today', unit: 'min', step: 5, dp: 0 },
  { f: 'meals', g: 'exercise', label: 'Meals eaten today', unit: 'meals', step: 1, dp: 0 },
  { f: 'dose', g: 'dose', label: 'Dosimeter reading for today', unit: 'mSv', step: 0.05, dp: 2 },
];

// Coded icons for the 1–5 choices (no emoji): bars, a face, two circles that move together.
const bars = (k) => [0, 1, 2, 3, 4].map((i) => `<rect x="${2.5 + i * 4}" y="${17 - i * 3}" width="2.6" height="${4 + i * 3}" ${i < k ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width=".8" opacity=".55"'}/>`).join('');
const face = (k) => { const c = (k - 3) * 2.4; return `<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8.6" cy="9.6" r="1.2" fill="currentColor"/><circle cx="15.4" cy="9.6" r="1.2" fill="currentColor"/><path d="M7.4 ${(15.2 - c / 2).toFixed(1)}Q12 ${(15.2 + c).toFixed(1)} 16.6 ${(15.2 - c / 2).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`; };
const pair = (k) => { const d = 8.2 - k * 1.5; return `<circle cx="${(12 - d).toFixed(1)}" cy="12" r="5.4" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="${(12 + d).toFixed(1)}" cy="12" r="5.4" fill="none" stroke="currentColor" stroke-width="1.4"/>`; };
const SCALES = [
  { f: 'sleepQuality', label: 'Sleep quality', words: ['Very poor', 'Poor', 'Fair', 'Good', 'Very good'], art: bars },
  { f: 'mood', label: 'Mood', words: ['Very low', 'Low', 'Even', 'Good', 'Very good'], art: face },
  { f: 'climate', label: 'Team climate', words: ['Tense', 'Strained', 'Neutral', 'Friendly', 'Close'], art: pair },
];

const AMSLER = (() => {
  let g = '';
  for (let i = 0; i <= 20; i++) g += `<path d="M${i * 12} 0V240M0 ${i * 12}H240"/>`;
  return `<svg class="amsler" viewBox="-1 -1 242 242" role="img" aria-label="Square grid of straight lines with a dot in the centre"><g fill="none" stroke="currentColor" stroke-width=".8">${g}</g><circle cx="120" cy="120" r="3.4" fill="currentColor"/></svg>`;
})();

const fmt = (v, dp) => (typeof v === 'number' ? String(+v.toFixed(dp)) : '');

function field(n, t) {
  return `<div class="fld" data-field="${n.f}">
    <label for="ci-${n.f}">${esc(n.label)}${n.hint ? ` <small>${esc(n.hint)}</small>` : ''}</label>
    <div class="fld-row">
      <button class="step" type="button" data-step="-1" aria-label="Lower ${esc(n.label.toLowerCase())}">${icon('minus', 14)}</button>
      <input id="ci-${n.f}" name="${n.f}" type="text" inputmode="decimal" autocomplete="off" value="${fmt(t[n.f], n.dp)}" placeholder="not logged" aria-describedby="ci-${n.f}-u ci-${n.f}-e">
      <span class="fld-unit" id="ci-${n.f}-u">${esc(n.unit)}</span>
      <button class="step" type="button" data-step="1" aria-label="Raise ${esc(n.label.toLowerCase())}">${icon('plus', 14)}</button>
    </div>
    <p class="fld-err" id="ci-${n.f}-e" role="alert"></p>
  </div>`;
}
const group = (g, t) => NUM.filter((n) => n.g === g).map((n) => field(n, t)).join('');
function scale(s, t) {
  return `<fieldset class="scale"><legend>${esc(s.label)}</legend><div class="scale-row">${s.words.map((w, i) => `<label><input type="radio" name="${s.f}" value="${i + 1}" ${t[s.f] === i + 1 ? 'checked' : ''}><span><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">${s.art(i + 1)}</svg><b>${esc(w)}</b></span></label>`).join('')}</div></fieldset>`;
}

export function openCheckin(app, item) {
  const dlg = $('#checkin');
  const { state } = app;
  const t = store.today(state);
  const lastVision = [...state.days].reverse().find((d) => d.vision && d.vision.result);
  const visionNote = !lastVision ? 'Not done yet.' : lastVision.day === t.day ? `Recorded today: ${lastVision.vision.result === 'worse' ? 'worse than reference' : 'no change'}.` : `Last done on day ${lastVision.day}.`;

  dlg.innerHTML = `
  <form class="sheet-in" id="ci-form" novalidate>
    <header class="sheet-head"><div><h2 id="checkin-title">Daily check-in</h2><p>Mission day ${t.day}. Leave a field empty if you did not measure it.</p></div>
      <button class="sheet-close" type="button" data-close aria-label="Close check-in">${icon('close', 14)}</button></header>
    <div class="sheet-body">
      <section data-item="vitals"><h3>Morning vitals</h3><div class="ci-grid">${group('vitals', t)}</div></section>
      <section data-item="checkin"><h3>Sleep and mind</h3><div class="ci-grid">${group('checkin', t)}</div>${SCALES.map((s) => scale(s, t)).join('')}</section>
      <section data-item="exercise"><h3>Exercise and food</h3><div class="ci-grid">${group('exercise', t)}</div></section>
      <section data-item="dose"><h3>Radiation</h3><div class="ci-grid">${group('dose', t)}</div><p class="ci-note">Copy the daily value from the onboard dosimeter. This app does not measure radiation.</p></section>
      <section data-item="symptoms"><h3>Symptoms today</h3><div class="sym">${SYMPTOMS.map((s) => `<label><input type="checkbox" name="sym-${s.id}" ${t.symptoms && t.symptoms[s.id] ? 'checked' : ''}><span>${icon('check')}${esc(s.label)}</span></label>`).join('')}</div></section>
      <section data-item="vision"><h3>Vision self-check</h3><div class="ci-vision"><p>${esc(visionNote)} Planned once a week.</p><button class="btn btn-line" type="button" data-vision>Start the vision self-check</button></div></section>
    </div>
    <footer class="sheet-foot"><p class="ci-sum" id="ci-sum" role="alert"></p><button class="btn btn-quiet" type="button" data-close>Cancel</button><button class="btn btn-solid" type="submit">Save check-in</button></footer>
  </form>
  <div class="sheet-in" id="ci-vision" hidden>
    <header class="sheet-head"><div><h2>Vision self-check</h2><p>Screening only. It cannot replace an eye exam.</p></div>
      <button class="sheet-close" type="button" data-back aria-label="Back to the check-in">${icon('close', 14)}</button></header>
    <div class="sheet-body vis">
      ${AMSLER}
      <div class="vis-side">
        <ol class="vis-steps">
          <li>Hold the screen at your usual reading distance, the same as last time.</li>
          <li>Cover one eye. Look only at the centre dot.</li>
          <li>Without moving your eye, notice the lines: are any wavy, blurred, dim or missing?</li>
          <li>Repeat with the other eye, then compare with your last check.</li>
        </ol>
        <div class="vis-letters" aria-hidden="true"><span>E F P T O Z</span><span>L P E D P E C</span><span>F D E D F C Z P</span></div>
        <p class="ci-note">Also read the three rows of letters with each eye. Smaller rows that were clear before and are not clear now count as a change.</p>
        <div class="vis-answer">
          <button class="btn btn-solid" type="button" data-result="same">No change</button>
          <button class="btn btn-line" type="button" data-result="worse">Worse than before</button>
        </div>
      </div>
    </div>
  </div>`;

  const form = $('#ci-form', dlg); const vis = $('#ci-vision', dlg);
  const showVision = (on) => { form.hidden = on; vis.hidden = !on; (on ? $('[data-result]', vis) : $('[data-vision]', form)).focus(); };
  const close = () => { dlg.close(); };

  const read = () => {
    const out = {};
    NUM.forEach((n) => { const raw = form.elements[n.f].value.trim().replace(',', '.'); out[n.f] = raw === '' ? null : Number(raw); });
    SCALES.forEach((s) => { const v = form.elements[s.f].value; out[s.f] = v ? Number(v) : null; });
    return out;
  };
  const showErrors = (errors) => {
    NUM.forEach((n) => {
      const box = $(`[data-field="${n.f}"]`, form); const msg = errors[n.f] || '';
      $('.fld-err', box).textContent = msg; box.toggleAttribute('data-bad', !!msg);
      form.elements[n.f].setAttribute('aria-invalid', String(!!msg));
    });
    const bad = Object.keys(errors);
    $('#ci-sum', form).textContent = bad.length ? `${bad.length} value${bad.length > 1 ? 's' : ''} cannot be saved. Check the marked field${bad.length > 1 ? 's' : ''}.` : '';
    if (bad.length) form.elements[bad[0]].focus();
    return !bad.length;
  };
  const check = (vals) => {
    const errors = {};
    NUM.forEach((n) => { if (vals[n.f] !== null && !Number.isFinite(vals[n.f])) errors[n.f] = 'Enter digits only, for example ' + fmt((latest(state.days.slice(0, -1), n.f) || { value: LIMITS[n.f][0] }).value, n.dp) + '.'; });
    Object.assign(errors, { ...validateDay(vals), ...errors });
    if ((vals.sys === null) !== (vals.dia === null)) errors[vals.sys === null ? 'sys' : 'dia'] = 'Enter both pressure numbers.';
    return errors;
  };

  dlg.onclick = (e) => {
    if (e.target === dlg) return close();
    const b = e.target.closest('button'); if (!b) return undefined;
    if ('close' in b.dataset) return close();
    if ('vision' in b.dataset) return showVision(true);
    if ('back' in b.dataset) return item === 'vision' ? close() : showVision(false);
    if (b.dataset.step) {
      const box = b.closest('.fld'); const n = NUM.find((x) => x.f === box.dataset.field); const input = form.elements[n.f];
      const cur = Number(input.value.trim().replace(',', '.'));
      const prev = latest(state.days.slice(0, -1), n.f);
      let v = input.value.trim() === '' || !Number.isFinite(cur) ? (prev ? prev.value : state.baseline[n.f] ?? LIMITS[n.f][0]) : cur + Number(b.dataset.step) * n.step;
      v = Math.min(LIMITS[n.f][1], Math.max(LIMITS[n.f][0], v));
      input.value = fmt(v, n.dp);
      if (box.hasAttribute('data-bad')) showErrors({ ...check(read()) });
      return undefined;
    }
    if (b.dataset.result) {
      t.vision = { result: b.dataset.result };
      state.edited = true; store.save(state);
      refresh(`Vision self-check recorded: ${b.dataset.result === 'worse' ? 'worse than before' : 'no change'}.`);
      toast(b.dataset.result === 'worse' ? 'Vision self-check recorded: worse than before. Tell the crew medical officer.' : 'Vision self-check recorded: no change.');
      return close();
    }
    return undefined;
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    const vals = read();
    if (!showErrors(check(vals))) return;
    Object.assign(t, vals);
    t.symptoms = Object.fromEntries(SYMPTOMS.filter((s) => form.elements[`sym-${s.id}`].checked).map((s) => [s.id, true]));
    t.checkedIn = true; state.edited = true;
    store.save(state);
    refresh(`Check-in saved for mission day ${t.day}.`);
    toast(`Check-in saved for mission day ${t.day}.`); chime();
    close();
  };

  if (!dlg.open) dlg.showModal();
  if (item === 'vision') showVision(true);
  else if (item) {
    const sec = $(`[data-item="${item}"]`, form);
    if (sec) { sec.scrollIntoView({ block: 'start' }); const empty = $$('input[type="text"]', sec).find((i) => i.value === '') || $('input', sec); if (empty) empty.focus({ preventScroll: true }); }
  }
}
