// Sound. Every tone is synthesised here with the Web Audio API: no audio files, nothing downloaded.
// Off until the crew member switches it on; the choice is remembered on this device.
import { $, toast } from './ui.js';

const KEY = 'astramed.sound.v1';
const D4 = 293.66; // home note
const note = (semitones) => D4 * 2 ** (semitones / 12);
// A mode on D with the lowered second (E flat) and the raised sixth (B): the colour of Shashmaqam melodies, not a quote from one.
const MOTIF = [[0, 0], [7, 0.3], [9, 0.6], [5, 0.86], [1, 1.16], [0, 1.5]]; // D A B G E-flat D

let ctx = null; let out = null; let on = false;
let pad = null; let beat = null; let alarm = null;
let hr = null; let known = null; let lastTick = null; let forget = null;

const live = () => on && ctx && ctx.state === 'running';

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  out = ctx.createGain(); out.gain.value = 0.5; // never louder than gentle
  const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 3200;
  out.connect(soft).connect(ctx.destination);
}

/** One plucked note: fast attack, long quiet tail. */
function pluck(freq, at, gain, len, type = 'triangle') {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + len + 0.05);
}

const motif = () => MOTIF.forEach(([n, at], i) => pluck(note(n), at, 0.09, i === MOTIF.length - 1 ? 1.6 : 0.9));

// ---------- ambient bed: a low warm pad, with a soft pulse at today's resting heart rate ----------
function startPad() {
  const g = ctx.createGain(); g.gain.value = 0.0001;
  g.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 4);
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 420;
  const osc = [note(-24), note(-12) * 1.003, note(-5)].map((f) => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(warm); o.start(); return o; });
  warm.connect(g).connect(out);
  pad = { g, osc };
  pulse();
}
function stopPad() {
  clearTimeout(beat);
  if (!pad) return;
  const { g, osc } = pad; pad = null;
  g.gain.cancelScheduledValues(ctx.currentTime);
  g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
  osc.forEach((o) => o.stop(ctx.currentTime + 0.6));
}
function pulse() {
  clearTimeout(beat);
  if (!pad) return;
  if (hr && live()) pluck(note(-12), 0, 0.05, 0.32, 'sine');
  beat = setTimeout(pulse, 60000 / (hr || 60));
}

// ---------- Critical: a two-tone annunciator, played once ----------
function annunciate() {
  hush();
  const t = ctx.currentTime + 0.7; // after the chime or the select tone
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = 'triangle';
  for (let i = 0; i < 6; i++) o.frequency.setValueAtTime(i % 2 ? 660 : 880, t + i * 0.17);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
  g.gain.setValueAtTime(0.11, t + 0.98);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.04);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + 1.1);
  alarm = { o, g };
  o.onended = () => { if (alarm && alarm.o === o) alarm = null; };
}

// ---------- switch ----------
/** Starts the audio. Browsers allow it only after a click, a tap or a key press. */
function start() {
  if (!ctx) build();
  ctx.resume().then(() => {
    unwatch();
    if (!on || pad) return;
    startPad(); motif();
  }).catch(() => {});
}
const wake = () => { if (on && !pad) start(); else unwatch(); };
function unwatch() { document.removeEventListener('pointerup', wake, true); document.removeEventListener('keydown', wake, true); }

function show() {
  const b = $('#sound');
  b.setAttribute('aria-pressed', String(on));
  b.title = on ? 'Sound is on' : 'Sound is off';
}

function set(v) {
  on = v;
  try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* blocked storage: the choice lasts for this visit */ }
  show();
  if (on) start();
  else if (ctx) { hush(); stopPad(); ctx.suspend(); }
}

export function initSound() {
  try { on = localStorage.getItem(KEY) === '1'; } catch { on = false; }
  show();
  $('#sound').addEventListener('click', () => {
    set(!on);
    toast(on ? 'Sound on. Every tone is made on this device; a Critical alert plays a two-tone signal once.' : 'Sound off.');
  });
  // a remembered "on" has to wait for the first click or key press
  if (on) { document.addEventListener('pointerup', wake, true); document.addEventListener('keydown', wake, true); }
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
  });
}

// ---------- what the app plays ----------
/** Soft tick when the pointer or the focus reaches another zone. */
export function tick(zone) {
  clearTimeout(forget);
  if (!zone) { forget = setTimeout(() => { lastTick = null; }, 500); return; }
  if (zone === lastTick) return;
  lastTick = zone;
  if (live()) pluck(note(24), 0, 0.025, 0.06, 'sine');
}
/** Zone card opened. */
export function select() { if (live()) { pluck(note(7), 0, 0.06, 0.4); pluck(note(12), 0.07, 0.06, 0.55); } }
/** Check-in saved. */
export function chime() { if (live()) [12, 17, 19].forEach((n, i) => pluck(note(n), i * 0.11, 0.07, 1.1, 'sine')); }
/** Unacknowledged Critical alerts on screen. A new one plays the annunciator once; Attention alerts never make a sound. */
export function critical(ids) {
  const fresh = known !== null && ids.some((id) => !known.has(id));
  known = new Set(ids);
  if (fresh && live()) annunciate();
}
/** Acknowledge silences the annunciator. */
export function hush() {
  if (!alarm) return;
  const { o, g } = alarm; alarm = null;
  g.gain.cancelScheduledValues(ctx.currentTime);
  g.gain.setValueAtTime(0, ctx.currentTime);
  o.stop(ctx.currentTime + 0.02);
}
/** Today's resting heart rate sets the tempo of the pulse; without a reading the pad plays alone. */
export function setPulse(bpm) { hr = typeof bpm === 'number' && bpm >= 30 && bpm <= 220 ? bpm : null; }

/** For tests: what is playing and how loud the output is right now. */
export const probe = () => ({ on, state: ctx ? ctx.state : 'none', pad: !!pad, alarm: !!alarm, hr });
