// Rules engine — pure functions, no DOM. Numbers come from data/thresholds.json.
// Decision support, not a diagnosis.

export const TIER = { none: 0, normal: 1, attention: 2, critical: 3 };
export const TIER_WORD = { none: 'Tracked', normal: 'Normal', attention: 'Attention', critical: 'Critical' };

// Fixed, comparable indicator set (TEAM_CONCEPT §3, §6.1).
export const INDICATORS = [
  { id: 'restingHr', zone: 'heart', label: 'Resting heart rate', short: 'Resting HR', unit: 'bpm', field: 'restingHr', dp: 0, ref: 'restingHr' },
  { id: 'bp', zone: 'heart', label: 'Blood pressure', short: 'Blood pressure', unit: 'mmHg', field: 'sys', field2: 'dia', dp: 0, ref: 'bloodPressure' },
  { id: 'standingHr', zone: 'heart', label: 'Heart rate on standing', short: 'Standing HR', unit: 'bpm', field: 'standingHr', dp: 0, ref: null },
  { id: 'spo2', zone: 'heart', label: 'Blood oxygen (SpO2)', short: 'SpO2', unit: '%', field: 'spo2', dp: 0, ref: 'spo2' },
  { id: 'exercise', zone: 'bones', label: 'Exercise', short: 'Exercise', unit: 'min', field: 'exerciseMin', dp: 0, ref: null },
  { id: 'vision', zone: 'eyes', label: 'Vision self-check', short: 'Vision check', unit: '', field: 'vision', dp: 0, ref: null },
  { id: 'bodyTemp', zone: 'immune', label: 'Body temperature', short: 'Temperature', unit: '°C', field: 'bodyTemp', dp: 1, ref: 'bodyTemp' },
  { id: 'sleepHours', zone: 'mind', label: 'Sleep', short: 'Sleep', unit: 'h', field: 'sleepHours', dp: 1, ref: 'sleepHours' },
  { id: 'mood', zone: 'mind', label: 'Mood', short: 'Mood', unit: '/ 5', field: 'mood', dp: 0, ref: 'mood' },
  { id: 'climate', zone: 'mind', label: 'Team climate', short: 'Team climate', unit: '/ 5', field: 'climate', dp: 0, ref: 'mood' },
  { id: 'fastingGlucose', zone: 'metabolism', label: 'Fasting blood glucose', short: 'Glucose', unit: 'mg/dL', field: 'fastingGlucose', dp: 0, ref: 'fastingGlucose' },
  { id: 'radiation', zone: 'whole', label: 'Radiation, cumulative dose', short: 'Radiation dose', unit: 'mSv', field: 'dose', dp: 1, ref: 'radiation' },
];

export const SYMPTOMS = [
  { id: 'rash', zone: 'immune', label: 'Skin rash or irritation' },
  { id: 'gut', zone: 'immune', label: 'Stomach or gut upset' },
  { id: 'headache', zone: 'eyes', label: 'Headache' },
  { id: 'dizziness', zone: 'eyes', label: 'Dizziness or poor balance' },
  { id: 'visionChange', zone: 'eyes', label: 'Change in vision' },
  { id: 'pain', zone: 'bones', label: 'Back or bone pain' },
  { id: 'fatigue', zone: 'heart', label: 'Unusual fatigue' },
];

export const ZONE_IDS = ['heart', 'bones', 'eyes', 'immune', 'mind', 'metabolism', 'whole'];

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const round = (v, dp = 0) => { const k = 10 ** dp; return Math.round(v * k) / k; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

/** Values of one field for the last n days that have it (oldest → newest). */
export function lastValues(days, field, n) {
  const out = [];
  for (let i = days.length - 1; i >= 0 && out.length < n; i--) if (num(days[i][field])) out.unshift(days[i][field]);
  return out;
}
export function latest(days, field) {
  for (let i = days.length - 1; i >= 0; i--) if (num(days[i][field])) return { value: days[i][field], day: days[i].day };
  return null;
}

/** AHA category for a reading (names from thresholds.json). */
export function bpCategory(sys, dia, T) {
  const c = Object.fromEntries(T.indicators.bloodPressure.categories.map((x) => [x.id, x]));
  if (sys > c.severe.systolic.gt || dia > c.severe.diastolic.gt) return c.severe;
  if (sys >= c.stage2.systolic.gte || dia >= c.stage2.diastolic.gte) return c.stage2;
  if (sys >= c.stage1.systolic.min || dia >= c.stage1.diastolic.min) return c.stage1;
  if (sys >= c.elevated.systolic.min) return c.elevated;
  return c.normal;
}

/** Reference-range check for a single value. Returns { tier, band, text }. */
export function classify(id, v, T, v2) {
  const I = T.indicators;
  switch (id) {
    case 'restingHr': {
      const { min, max } = I.restingHr.normal;
      if (v < min) return { tier: 'attention', band: 'Below range', text: `Below the ${min}–${max} bpm resting range.` };
      if (v > max) return { tier: 'attention', band: 'Above range', text: `Above the ${min}–${max} bpm resting range.` };
      return { tier: 'normal', band: 'In range', text: `Inside the ${min}–${max} bpm resting range.` };
    }
    case 'bp': {
      const cat = bpCategory(v, v2, T);
      if (cat.id === 'severe') return { tier: 'critical', band: cat.name, text: 'Higher than 180 and/or higher than 120 mmHg: severe hypertension range. With chest pain, shortness of breath, numbness, weakness or vision change this is an emergency.' };
      if (cat.id === 'stage2') return { tier: 'attention', band: cat.name, text: '140 or higher, or 90 or higher: stage 2 hypertension range.' };
      return { tier: 'normal', band: cat.name, text: `Below 140/90 mmHg. AHA category: ${cat.name}.` };
    }
    case 'bodyTemp': {
      const { min, max } = I.bodyTemp.normal; const fever = I.bodyTemp.fever.gte;
      if (v >= fever) return { tier: 'critical', band: 'Fever', text: `${fever.toFixed(1)} °C or higher counts as a fever.` };
      if (v > max) return { tier: 'attention', band: 'Raised', text: `Above the ${min}–${max} °C normal range, below the ${fever.toFixed(1)} °C fever line.` };
      if (v < min) return { tier: 'attention', band: 'Low', text: `Below the ${min}–${max} °C normal range.` };
      return { tier: 'normal', band: 'In range', text: `Inside the ${min}–${max} °C normal range.` };
    }
    case 'fastingGlucose': {
      const b = Object.fromEntries(I.fastingGlucose.bands.map((x) => [x.id, x]));
      if (v < b.low2.lt) return { tier: 'critical', band: b.low2.name, text: `Below ${b.low2.lt} mg/dL: level 2 hypoglycemia.` };
      if (v < b.low1.lt) return { tier: 'attention', band: b.low1.name, text: `Below ${b.low1.lt} mg/dL: low blood glucose.` };
      if (v < b.normal.lt) return { tier: 'normal', band: 'In range', text: `Inside the ${b.normal.min}–${b.normal.lt - 1} mg/dL fasting range.` };
      return { tier: 'attention', band: 'Above range', text: `${b.normal.lt} mg/dL or higher: above the normal fasting range.` };
    }
    case 'sleepHours': {
      const rec = I.sleepHours.recommended.gte;
      if (v < rec) return { tier: 'attention', band: 'Short', text: `Less than the ${rec} hours recommended for adults.` };
      return { tier: 'normal', band: 'Enough', text: `${rec} hours or more, as recommended for adults.` };
    }
    case 'spo2': {
      const low = I.spo2.low.lt; const min = I.spo2.normal.min;
      if (v < low) return { tier: 'critical', band: 'Low', text: `Under ${low} % is low.` };
      if (v < min) return { tier: 'attention', band: 'Below range', text: `Below the ${min}–100 % normal range.` };
      return { tier: 'normal', band: 'In range', text: `Inside the ${min}–100 % normal range.` };
    }
    default:
      return { tier: 'none', band: '', text: '' };
  }
}

/** Trend: least-squares change over the last N days plus a count of steps in that direction. */
export function trend(values, minChange, minSteps, bad) {
  const n = values.length;
  if (n < 6 || !num(minChange)) return null;
  const xm = (n - 1) / 2; const ym = mean(values);
  let sxy = 0; let sxx = 0;
  values.forEach((y, x) => { sxy += (x - xm) * (y - ym); sxx += (x - xm) ** 2; });
  const change = (sxy / sxx) * (n - 1);
  const dir = change > 0 ? 'up' : 'down';
  let steps = 0;
  for (let i = 1; i < n; i++) if ((dir === 'up' && values[i] > values[i - 1]) || (dir === 'down' && values[i] < values[i - 1])) steps++;
  const fired = Math.abs(change) >= minChange && steps >= minSteps && (bad === 'both' || bad === dir);
  return { fired, dir, change, steps, from: values[0], to: values[n - 1], n };
}

const worse = (a, b) => (TIER[a] >= TIER[b] ? a : b);

/**
 * Evaluate the whole state.
 * state: { days:[{day, ...fields, symptoms:{}, vision:{result}}], baseline:{}, env:'station'|'moon'|'mars' }
 */
export function evaluate(state, T) {
  const { days, baseline = {}, env = 'mars' } = state;
  const H = T.heuristics;
  const today = days[days.length - 1] || { day: 0, symptoms: {} };
  const out = { day: today.day, env, indicators: {}, zones: {}, alerts: [], score: 100 };
  const tol = H.baselineTolerance;

  const addTrend = (ind, field, label, unit, dp) => {
    const tr = trend(lastValues(days, field, H.trend.days), H.trend.minChange[field], H.trend.minSteps, H.trend.bad[field]);
    if (tr && tr.fired) {
      ind.trendAlert = true;
      ind.reasons.push({ kind: 'trend', tier: 'attention', heuristic: 'team-heuristic',
        text: `${label} has ${tr.dir === 'up' ? 'risen' : 'fallen'} about ${round(Math.abs(round(tr.to, dp) - round(tr.from, dp)), dp)} ${unit} over the last ${tr.n} days (from ${round(tr.from, dp)} to ${round(tr.to, dp)}), moving the same way on ${tr.steps} of ${tr.n - 1} days.` });
    }
    return tr;
  };
  const addBaseline = (ind, field, label, unit, dp, v, onlyBelow) => {
    const b = baseline[field];
    if (!num(b) || !num(tol[field])) return;
    const d = v - b;
    if (Math.abs(d) > tol[field] && (!onlyBelow || d < 0)) {
      ind.reasons.push({ kind: 'baseline', tier: 'attention', heuristic: 'team-heuristic',
        text: `${label} is ${round(Math.abs(d), dp)} ${unit} ${d > 0 ? 'above' : 'below'} your pre-flight baseline of ${round(b, dp)} ${unit} (tolerance ±${tol[field]}).` });
    }
  };
  const arrow = (v, b, eps) => (!num(v) || !num(b) ? 'flat' : v - b > eps ? 'up' : b - v > eps ? 'down' : 'flat');

  for (const def of INDICATORS) {
    const ind = { id: def.id, zone: def.zone, label: def.label, short: def.short, unit: def.unit, dp: def.dp, value: null, display: '—', tier: 'none', band: '', reasons: [], arrow: 'flat', loggedDay: null };
    out.indicators[def.id] = ind;
    const L = def.id === 'vision' ? null : latest(days, def.field);

    if (def.id === 'bp') {
      const L2 = latest(days, 'dia');
      if (L && L2) {
        ind.value = L.value; ind.value2 = L2.value; ind.loggedDay = L.day;
        ind.display = `${round(L.value)}/${round(L2.value)}`;
        const c = classify('bp', L.value, T, L2.value);
        ind.band = c.band; ind.reasons.push({ kind: 'range', tier: c.tier, text: c.text });
        addBaseline(ind, 'sys', 'Systolic pressure', 'mmHg', 0, L.value);
        addBaseline(ind, 'dia', 'Diastolic pressure', 'mmHg', 0, L2.value);
        addTrend(ind, 'sys', 'Systolic pressure', 'mmHg', 0);
        if (!ind.trendAlert) addTrend(ind, 'dia', 'Diastolic pressure', 'mmHg', 0);
        ind.baseline = num(baseline.sys) ? `${baseline.sys}/${baseline.dia}` : null;
        ind.arrow = arrow(L.value, baseline.sys, 4);
      }
    } else if (def.id === 'radiation') {
      const R = T.indicators.radiation;
      const cum = days.reduce((s, d) => s + (num(d.dose) ? d.dose : 0), 0) + (baseline.priorDose || 0);
      const limit = R.careerLimit.lt;
      const envKey = T.environments[env].radiationEnv;
      const e = R.env[envKey];
      const frac = cum / limit;
      ind.value = cum; ind.display = cum.toFixed(1); ind.loggedDay = (latest(days, 'dose') || {}).day || null;
      ind.limit = limit; ind.fraction = frac; ind.envDaily = e.dailyDose; ind.designLimit = e.designLimit || null; ind.envKind = e.kind;
      ind.daysToLimit = cum < limit ? Math.floor((limit - cum) / e.dailyDose) : 0;
      ind.arrow = 'up';
      if (cum >= limit) ind.reasons.push({ kind: 'range', tier: 'critical', text: `Cumulative dose has reached the ${limit} mSv career limit.` });
      else if (frac >= H.radiationAttentionFraction.value) ind.reasons.push({ kind: 'range', tier: 'attention', heuristic: 'placeholder', text: `Cumulative dose is above ${Math.round(H.radiationAttentionFraction.value * 100)} % of the ${limit} mSv career limit.` });
      else ind.reasons.push({ kind: 'range', tier: 'normal', text: `${(frac * 100).toFixed(0)} % of the ${limit} mSv career limit.` });
      ind.band = `${(frac * 100).toFixed(0)} % of career limit`;
    } else if (def.id === 'exercise') {
      const recent = [];
      for (let i = days.length - 1; i >= 0 && recent.length < H.exerciseGapDays; i--) if (num(days[i].exerciseMin)) recent.unshift(days[i].exerciseMin);
      if (L) { ind.value = L.value; ind.display = String(round(L.value)); ind.loggedDay = L.day; }
      if (recent.length === H.exerciseGapDays && recent.every((m) => m === 0)) {
        ind.reasons.push({ kind: 'gap', tier: 'attention', heuristic: 'team-heuristic', text: `No exercise logged on the last ${H.exerciseGapDays} recorded days.` });
      } else if (recent.length) ind.reasons.push({ kind: 'range', tier: 'normal', text: 'Exercise logged in the last few days.' });
      ind.arrow = arrow(L && L.value, baseline.exerciseMin, 15);
    } else if (def.id === 'vision') {
      let last = null;
      for (let i = days.length - 1; i >= 0; i--) if (days[i].vision && days[i].vision.result) { last = { ...days[i].vision, day: days[i].day }; break; }
      if (last) {
        ind.value = last.result; ind.loggedDay = last.day;
        ind.display = last.result === 'worse' ? 'Changed' : 'No change';
        ind.reasons.push(last.result === 'worse'
          ? { kind: 'symptom', tier: 'attention', heuristic: 'team-heuristic', text: `Vision self-check on day ${last.day} was worse than your reference.` }
          : { kind: 'range', tier: 'normal', text: `Vision self-check on day ${last.day}: no change.` });
      }
    } else if (L) {
      const v = L.value;
      ind.value = v; ind.loggedDay = L.day; ind.display = v.toFixed(def.dp);
      ind.baseline = num(baseline[def.field]) ? baseline[def.field] : null;
      const eps = { restingHr: 4, bodyTemp: 0.3, fastingGlucose: 5, sleepHours: 0.5, mood: 0.5, climate: 0.5, standingHr: 5, spo2: 1 }[def.field] ?? 0;
      ind.arrow = arrow(v, baseline[def.field], eps);
      if (def.ref && def.ref !== 'mood') {
        const c = classify(def.id, v, T);
        ind.band = c.band; ind.reasons.push({ kind: 'range', tier: c.tier, text: c.text });
      }
      addBaseline(ind, def.field, def.label, def.unit, def.dp, v, def.field === 'sleepHours');
      if (H.trend.bad[def.field]) addTrend(ind, def.field, def.label, def.unit.replace('/ 5', 'points'), 1);

      if (def.id === 'sleepHours') {
        const w = lastValues(days, 'sleepHours', H.sleepChronic.days);
        if (w.length === H.sleepChronic.days && mean(w) < H.sleepChronic.avgBelow) {
          ind.reasons.push({ kind: 'chronic', tier: 'critical', heuristic: 'placeholder', text: `Average sleep over ${w.length} days is ${mean(w).toFixed(1)} h, under ${H.sleepChronic.avgBelow} h (chronic shortfall).` });
        }
      }
      if (def.id === 'mood' || def.id === 'climate') {
        const w = lastValues(days, def.field, H.moodLow.days);
        if (w.length === H.moodLow.days && mean(w) <= H.moodLow.avgAtMost) {
          ind.reasons.push({ kind: 'range', tier: 'attention', heuristic: 'team-heuristic', text: `Sustained low ${def.id === 'mood' ? 'mood' : 'team climate'}: ${mean(w).toFixed(1)} of 5 on average over the last ${w.length} days (${H.moodLow.avgAtMost} or lower counts as low).` });
          ind.band = 'Sustained low';
        } else if (!ind.reasons.length) ind.reasons.push({ kind: 'range', tier: 'normal', text: 'No sustained decline in the last days.' });
      }
    }
    ind.tier = ind.reasons.reduce((t, r) => worse(t, r.tier), ind.value === null ? 'none' : ind.reasons.length ? 'normal' : 'none');
  }

  // Zones
  for (const z of ZONE_IDS) out.zones[z] = { id: z, tier: 'normal', reasons: [], indicators: INDICATORS.filter((d) => d.zone === z).map((d) => d.id) };
  for (const ind of Object.values(out.indicators)) {
    const z = out.zones[ind.zone];
    if (TIER[ind.tier] > TIER[z.tier]) z.tier = ind.tier;
  }

  // Symptoms reported today
  const sym = today.symptoms || {};
  for (const s of SYMPTOMS) {
    if (sym[s.id]) {
      const z = out.zones[s.zone];
      z.reasons.push({ kind: 'symptom', tier: 'attention', heuristic: 'team-heuristic', symptom: s.id, text: `You reported "${s.label.toLowerCase()}" today.` });
      z.tier = worse(z.tier, 'attention');
    }
  }

  // Combined behavioral rule (TEAM_CONCEPT §6.2)
  const C = H.combined;
  const s3 = lastValues(days, 'sleepHours', C.days); const m3 = lastValues(days, 'mood', C.days); const c3 = lastValues(days, 'climate', C.days);
  out.combined = null;
  if (s3.length === C.days && m3.length === C.days && c3.length === C.days) {
    const a = { sleep: mean(s3), mood: mean(m3), climate: mean(c3) };
    if (a.sleep < C.sleepBelow && a.mood <= C.moodAtMost && a.climate <= C.climateAtMost) {
      out.combined = { ...a, days: C.days,
        why: [
          { kind: 'combined', tier: 'attention', text: `Sleep: ${a.sleep.toFixed(1)} h a night on average over the last ${C.days} days (under the ${C.sleepBelow} h recommended).` },
          { kind: 'combined', tier: 'attention', heuristic: 'team-heuristic', text: `Mood: ${a.mood.toFixed(1)} of 5 on average (${C.moodAtMost} or lower counts as low).` },
          { kind: 'combined', tier: 'attention', heuristic: 'team-heuristic', text: `Team climate: ${a.climate.toFixed(1)} of 5 on average (${C.climateAtMost} or lower counts as low).` },
          { kind: 'combined', tier: 'attention', heuristic: 'team-heuristic', text: 'Each one alone is manageable. Together they raise behavioral risk, so the three are reported as one warning.' },
        ] };
      const r = { kind: 'combined', tier: 'attention', heuristic: 'team-heuristic',
        text: `Three signals are low together over the last ${C.days} days: sleep ${a.sleep.toFixed(1)} h (under ${C.sleepBelow}), mood ${a.mood.toFixed(1)} of 5 and team climate ${a.climate.toFixed(1)} of 5 (both ${C.moodAtMost} or lower). Each one alone is manageable; together they raise behavioral risk.` };
      out.zones.mind.reasons.push(r);
      out.zones.mind.tier = worse(out.zones.mind.tier, 'attention');
    }
  }

  // Alerts: one per indicator with a non-normal reason, plus zone-level ones.
  const push = (a) => out.alerts.push(a);
  for (const ind of Object.values(out.indicators)) {
    const rs = ind.reasons.filter((r) => TIER[r.tier] >= TIER.attention);
    if (!rs.length) continue;
    if (out.combined && (ind.id === 'mood' || ind.id === 'climate')) continue; // already listed inside the combined-risk alert
    const rangeHit = rs.find((r) => r.kind === 'range' || r.kind === 'chronic' || r.kind === 'gap' || r.kind === 'symptom');
    const kind = rangeHit ? rangeHit.kind : rs[0].kind;
    const val = `${ind.display}${ind.unit ? ' ' + ind.unit : ''}`;
    const title = kind === 'trend' ? `${ind.short}: trend ${ind.reasons.find((r) => r.kind === 'trend').text.includes('risen') ? 'up' : 'down'}, now ${val}`
      : kind === 'baseline' ? `${ind.short} off your baseline: ${val}`
      : `${ind.short} ${val}${ind.band ? ' — ' + ind.band.toLowerCase() : ''}`;
    push({ id: `d${out.day}:${ind.id}:${ind.tier}`, tier: ind.tier, zone: ind.zone, indicator: ind.id, kind, title, why: rs });
  }
  for (const z of Object.values(out.zones)) {
    for (const r of z.reasons) {
      push({ id: `d${out.day}:${z.id}:${r.kind}:${r.symptom || ''}`, tier: r.tier, zone: z.id, indicator: null, kind: r.kind,
        title: r.kind === 'combined' ? 'Combined risk: sleep, mood and team climate are low together' : r.text.replace('You reported', 'Symptom reported:').replace(' today.', ''), why: r.kind === 'combined' ? out.combined.why : [r] });
    }
  }
  // Critical first, then the combined-risk warning, then the rest.
  out.alerts.sort((a, b) => TIER[b.tier] - TIER[a.tier] || (b.kind === 'combined') - (a.kind === 'combined'));

  for (const z of Object.values(out.zones)) out.score -= z.tier === 'critical' ? H.score.critical : z.tier === 'attention' ? H.score.attention : 0;
  out.score = Math.max(0, out.score);
  return out;
}

/** Input validation: reject impossible values (limits are device-sanity bounds, not medical thresholds). */
export const LIMITS = {
  restingHr: [20, 250], standingHr: [20, 250], sys: [50, 260], dia: [30, 160], bodyTemp: [30, 43], fastingGlucose: [20, 600],
  spo2: [50, 100], sleepHours: [0, 24], exerciseMin: [0, 600], dose: [0, 1000], meals: [0, 8], mood: [1, 5], climate: [1, 5], sleepQuality: [1, 5],
};
export function validate(field, v) {
  const lim = LIMITS[field];
  if (!lim) return { ok: true };
  if (!num(v)) return { ok: false, msg: 'Enter a number.' };
  if (v < lim[0] || v > lim[1]) return { ok: false, msg: `Must be between ${lim[0]} and ${lim[1]}.` };
  return { ok: true };
}
export function validateDay(d) {
  const errors = {};
  for (const f of Object.keys(LIMITS)) if (d[f] !== null && d[f] !== undefined && d[f] !== '') { const r = validate(f, d[f]); if (!r.ok) errors[f] = r.msg; }
  if (num(d.sys) && num(d.dia) && d.dia >= d.sys) errors.dia = 'Diastolic must be lower than systolic.';
  return errors;
}

/** Streak of consecutive days with a check-in, counted back from the latest day. Missed days just reset it. */
export function streak(days) {
  let n = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].checkedIn) n++; else break; }
  return n;
}
