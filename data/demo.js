// Deterministic demo history: fictional crew member, 60 mission days. No real person's data.
// Story: blood pressure drifts up inside the normal range (trend alert); sleep, mood and team climate
// sink together over the last days (combined behavioral warning); a fever builds to 38.1 °C on day 60 (Critical).

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEMO_DAYS = 60;

export const DEMO_BASELINE = {
  restingHr: 62, standingHr: 78, sys: 114, dia: 74, bodyTemp: 36.7, fastingGlucose: 90, spo2: 98,
  sleepHours: 7.4, mood: 4, climate: 4, exerciseMin: 120, priorDose: 0,
};

// Last seven days are written by hand so the story is exact (index 0 = day 54).
const TAIL = {
  sys: [121, 123, 122, 124, 126, 127, 128],
  dia: [76, 76, 77, 77, 78, 78, 79],
  restingHr: [66, 67, 65, 66, 67, 69, 70],
  bodyTemp: [36.7, 36.8, 36.7, 36.9, 37.4, 37.8, 38.1],
  sleepHours: [7.1, 6.9, 6.6, 6.2, 5.9, 5.6, 5.4],
  sleepQuality: [4, 4, 3, 3, 2, 2, 2],
  mood: [4, 4, 3, 3, 3, 2, 2],
  climate: [4, 3, 3, 3, 3, 2, 2],
  exerciseMin: [125, 120, 115, 110, 60, 45, null],
  meals: [3, 3, 3, 3, 3, 2, 2],
  fastingGlucose: [91, 89, 93, 90, 94, 91, 92],
};

export function demoDoses(T, env, n = DEMO_DAYS) {
  const daily = T.indicators.radiation.env[T.environments[env].radiationEnv].dailyDose;
  const rnd = mulberry32(2026);
  const out = [];
  for (let i = 0; i < n; i++) out.push(Math.round(daily * (0.94 + rnd() * 0.12) * 100) / 100);
  return out;
}

export function makeDemo(T, env = 'mars') {
  const rnd = mulberry32(1115);
  const j = (amp) => (rnd() * 2 - 1) * amp;
  const r0 = (v) => Math.round(v);
  const r1 = (v) => Math.round(v * 10) / 10;
  const doses = demoDoses(T, env);
  const days = [];
  for (let d = 1; d <= DEMO_DAYS; d++) {
    const drift = d <= 40 ? 0 : (d - 40) / 20; // 0 → 1 over days 41–60
    const rec = {
      day: d, checkedIn: true,
      restingHr: r0(64 + j(2.5)), standingHr: 0,
      sys: r0(114 + drift * 9 + j(2.2)), dia: r0(74 + drift * 3 + j(1.6)),
      bodyTemp: r1(36.7 + j(0.15)), fastingGlucose: r0(90 + j(4)), spo2: r0(98 + j(0.9)),
      sleepHours: r1(7.2 + j(0.5)), sleepQuality: rnd() < 0.75 ? 4 : 3,
      mood: rnd() < 0.8 ? 4 : rnd() < 0.5 ? 5 : 3, climate: rnd() < 0.8 ? 4 : 3,
      exerciseMin: r0(120 + j(14)), meals: 3,
      dose: doses[d - 1], symptoms: {}, vision: null,
    };
    rec.standingHr = rec.restingHr + r0(15 + j(3));
    if (d % 7 === 4) rec.vision = { result: 'same' }; // weekly self-check: days 4, 11, … 53
    const t = d - (DEMO_DAYS - 6);
    if (t >= 0) {
      for (const k of Object.keys(TAIL)) rec[k] = TAIL[k][t];
      rec.standingHr = rec.restingHr + 16;
    }
    days.push(rec);
  }
  // One missed day: streaks restart quietly, nothing is punished.
  const miss = days[32];
  for (const k of Object.keys(miss)) if (!['day', 'dose', 'symptoms', 'vision'].includes(k)) miss[k] = null;
  miss.checkedIn = false;
  days[58].symptoms = { fatigue: true };
  // Today (day 60): morning vitals are in; exercise, dosimeter reading and the weekly vision check are still pending.
  const today = days[59];
  today.symptoms = { rash: true };
  today.dose = null;
  return {
    version: 1, demo: true, edited: false,
    profile: { name: 'A. Rahimi', role: 'Flight engineer', mission: 'Lyra-1' },
    env, link: 'up', baseline: { ...DEMO_BASELINE }, days, acks: {}, reports: [],
  };
}
