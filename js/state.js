// App state in localStorage. No network, no accounts.
// The demo mission lives under KEY. Each crew file made on this device has its own key; INDEX lists them and remembers the open one.
import { makeDemo, demoDoses } from '../data/demo.js';
import { SYMPTOMS, validate, validateDay } from './rules.js';

const KEY = 'lyra.health.v1';
const INDEX = 'astramed.crew.v1';
const fileKey = (id) => `astramed.file.${id}`;
const DAY_FIELDS = ['restingHr', 'standingHr', 'sys', 'dia', 'bodyTemp', 'fastingGlucose', 'spo2', 'sleepHours', 'sleepQuality', 'mood', 'climate', 'exerciseMin', 'meals', 'dose'];
const BASE_FIELDS = ['restingHr', 'standingHr', 'sys', 'dia', 'bodyTemp', 'fastingGlucose', 'spo2', 'sleepHours', 'mood', 'climate', 'exerciseMin'];
const MAX_DAYS = 1500;
const MAX_FILES = 50;
export const BASELINE_DAYS = 7; // logged days before the app talks about trends

function read(key) {
  try {
    const s = JSON.parse(localStorage.getItem(key));
    if (s && s.version === 1 && Array.isArray(s.days) && s.days.length) return s;
  } catch { /* corrupted or blocked storage */ }
  return null;
}
function readIndex() {
  try {
    const i = JSON.parse(localStorage.getItem(INDEX));
    if (i && Array.isArray(i.files)) return i;
  } catch { /* fall through */ }
  return { active: 'demo', welcome: null, files: [] };
}
const writeIndex = (i) => { try { localStorage.setItem(INDEX, JSON.stringify(i)); } catch { /* storage full or blocked */ } };

// ---------- calendar: a crew file made here gets one record per real day since it was started ----------
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayNo = (start) => Math.floor((Date.parse(isoToday()) - Date.parse(start)) / 864e5) + 1;
const blankDay = (n) => ({ day: n, checkedIn: false, ...Object.fromEntries(DAY_FIELDS.map((f) => [f, null])), symptoms: {}, vision: null });
function rollover(s) {
  const n = Math.min(dayNo(s.startDate), MAX_DAYS);
  const before = s.days.length;
  while (s.days.length < n) s.days.push(blankDay(s.days.length + 1));
  return s.days.length > before;
}

// ---------- open, save, switch ----------
export function load(T) {
  const idx = readIndex();
  if (idx.active !== 'demo') {
    const s = read(fileKey(idx.active));
    if (s) { if (rollover(s)) save(s); return s; }
  }
  let s = read(KEY);
  if (!s) { s = makeDemo(T); save(s); }
  return s;
}

export function save(s) {
  try { localStorage.setItem(s.id ? fileKey(s.id) : KEY, JSON.stringify(s)); } catch { /* storage full or blocked: keep working in memory */ }
}

export function resetDemo(T) {
  const s = makeDemo(T);
  save(s);
  return s;
}

/** Every crew file on this device, the demo mission first. */
export function crew(T) {
  const idx = readIndex();
  const active = idx.active !== 'demo' && idx.files.includes(idx.active) && read(fileKey(idx.active)) ? idx.active : 'demo';
  const row = (id, s) => ({ id, name: s.profile.name, role: s.profile.role, mission: s.profile.mission, demo: id === 'demo', day: s.days.length, logged: s.days.filter((d) => d.checkedIn).length, active: id === active });
  return [row('demo', read(KEY) || makeDemo(T)), ...idx.files.map((id) => { const s = read(fileKey(id)); return s && row(id, s); }).filter(Boolean)];
}

export function switchTo(id, T) {
  const idx = readIndex();
  idx.active = id === 'demo' || idx.files.includes(id) ? id : 'demo';
  writeIndex(idx);
  return load(T);
}

const newId = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');

/** A new, empty crew file: mission day 1 is today, nothing logged yet. */
export function createFile({ name, role, mission, env, baseline }, T) {
  const idx = readIndex();
  const s = {
    version: 1, id: newId(), demo: false, edited: false, startDate: isoToday(),
    profile: { name, role, mission }, env: T.environments[env] ? env : 'mars', link: 'up',
    baseline: { ...Object.fromEntries(BASE_FIELDS.map((f) => [f, null])), ...baseline, priorDose: 0 },
    days: [blankDay(1)], acks: {}, reports: [],
  };
  save(s);
  idx.files.push(s.id); idx.active = s.id;
  writeIndex(idx);
  return s;
}

export function deleteFile(id) {
  const idx = readIndex();
  try { localStorage.removeItem(fileKey(id)); } catch { /* blocked storage */ }
  idx.files = idx.files.filter((f) => f !== id);
  if (idx.active === id) idx.active = 'demo';
  writeIndex(idx);
}

export const welcome = () => readIndex().welcome;
export function setWelcome(v) { const idx = readIndex(); idx.welcome = v; writeIndex(idx); }

/** Logged days of an own crew file while it is still too young for trends; null for the demo and for older files. */
export function building(s) {
  if (s.demo) return null;
  const n = s.days.filter((d) => d.checkedIn).length;
  return n < BASELINE_DAYS ? n : null;
}

// ---------- export and import ----------
export function exportAll(T) {
  const idx = readIndex();
  return {
    app: 'AstraMed', format: 1, exportedAt: new Date().toISOString(),
    note: 'Crew health files from AstraMed, a student hackathon prototype by team Lyra. Decision support, not a diagnosis.',
    files: [read(KEY) || makeDemo(T), ...idx.files.map((id) => read(fileKey(id))).filter(Boolean)],
  };
}

const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');

/** Rebuilds one crew file from known fields only. Anything unknown is dropped; anything out of range stops the import. */
function cleanFile(o, T, n) {
  const fail = (what) => { throw new Error(`Crew file ${n} in this export cannot be used: ${what}. Nothing was imported.`); };
  const value = (f, v, where) => {
    if (v === null || v === undefined) return null;
    if (!validate(f, v).ok) fail(`${where} has an impossible value for ${f}`);
    return v;
  };
  if (!o || typeof o !== 'object' || o.version !== 1) fail('unknown format');
  const p = o.profile && typeof o.profile === 'object' ? o.profile : {};
  const name = text(p.name, 40);
  if (!name) fail('the crew name is missing');
  if (typeof o.env !== 'string' || !Object.hasOwn(T.environments, o.env)) fail('unknown mission environment');
  if (!Array.isArray(o.days) || !o.days.length || o.days.length > MAX_DAYS) fail(`it must hold between 1 and ${MAX_DAYS} days`);
  const demo = o.demo === true && !o.id;
  if (!demo && !(typeof o.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.startDate) && dayNo(o.startDate) >= 1)) fail('the start date is missing or in the future');
  const b = o.baseline && typeof o.baseline === 'object' ? o.baseline : {};
  const baseline = Object.fromEntries(BASE_FIELDS.map((f) => [f, value(f, b[f], 'the baseline')]));
  if (typeof baseline.sys === 'number' && typeof baseline.dia === 'number' && baseline.dia >= baseline.sys) fail('baseline diastolic pressure must be lower than systolic');
  baseline.priorDose = typeof b.priorDose === 'number' && b.priorDose >= 0 && b.priorDose <= 10000 ? b.priorDose : 0;
  const days = o.days.map((d, i) => {
    if (!d || typeof d !== 'object') fail(`day ${i + 1} is not a record`);
    const rec = { day: i + 1, checkedIn: d.checkedIn === true };
    DAY_FIELDS.forEach((f) => { rec[f] = value(f, d[f], `day ${i + 1}`); });
    if (Object.keys(validateDay(rec)).length) fail(`day ${i + 1} has a diastolic pressure that is not lower than the systolic one`);
    const sym = d.symptoms && typeof d.symptoms === 'object' ? d.symptoms : {};
    rec.symptoms = Object.fromEntries(SYMPTOMS.filter((s) => sym[s.id] === true).map((s) => [s.id, true]));
    rec.vision = d.vision && (d.vision.result === 'same' || d.vision.result === 'worse') ? { result: d.vision.result } : null;
    return rec;
  });
  const acks = Object.fromEntries(Object.entries(o.acks && typeof o.acks === 'object' ? o.acks : {})
    .filter(([k, v]) => /^d\d{1,4}:[\w:.-]{1,60}$/.test(k) && v && Number.isInteger(v.day)).slice(0, 5000).map(([k, v]) => [k, { day: v.day }]));
  const reports = (Array.isArray(o.reports) ? o.reports : []).slice(0, 500)
    .filter((r) => r && Number.isInteger(r.day) && Number.isInteger(r.range) && r.range > 0 && r.range <= MAX_DAYS)
    .map((r, i) => ({ id: `r${i + 1}`, day: r.day, range: r.range, status: r.status === 'queued' ? 'queued' : 'sent' }));
  const s = {
    version: 1, demo, edited: o.edited === true,
    profile: { name, role: text(p.role, 40), mission: text(p.mission, 40) },
    env: o.env, link: o.link === 'blackout' ? 'blackout' : 'up', baseline, days, acks, reports,
  };
  if (!demo) { s.id = typeof o.id === 'string' && /^[a-z0-9]{8}$/.test(o.id) ? o.id : newId(); s.startDate = o.startDate; s.edited = true; }
  return s;
}

/** Checks the whole export first; stores it only when every file in it is valid. A file with a known id replaces that file. */
export function importAll(obj, T) {
  if (!obj || typeof obj !== 'object' || obj.app !== 'AstraMed' || obj.format !== 1 || !Array.isArray(obj.files) || !obj.files.length) throw new Error('This is not an AstraMed export file. Nothing was imported.');
  if (obj.files.length > MAX_FILES) throw new Error(`An export can hold at most ${MAX_FILES} crew files. Nothing was imported.`);
  const clean = obj.files.map((f, i) => cleanFile(f, T, i + 1));
  const idx = readIndex();
  let added = 0; let replaced = 0;
  clean.forEach((s) => {
    if (s.id && !idx.files.includes(s.id)) { idx.files.push(s.id); added++; } else replaced++;
    save(s);
  });
  writeIndex(idx);
  return { added, replaced };
}

/** Environment switch. Untouched demo history gets doses typical for that environment; real entries are never rewritten. */
export function setEnv(s, env, T) {
  s.env = env;
  if (s.demo && !s.edited) {
    const doses = demoDoses(T, env, s.days.length);
    s.days.forEach((d, i) => { if (d.dose !== null) d.dose = doses[i]; });
  }
  save(s);
}

export const today = (s) => s.days[s.days.length - 1];
