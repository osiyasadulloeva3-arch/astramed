// node tests/rules.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classify, bpCategory, trend, evaluate, validate, validateDay, streak } from '../js/rules.js';
import { makeDemo } from '../data/demo.js';

const T = JSON.parse(readFileSync(new URL('../data/thresholds.json', import.meta.url)));
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

const flat = (over = {}, len = 10) => ({
  env: 'station',
  baseline: { restingHr: 62, sys: 114, dia: 74, bodyTemp: 36.7, fastingGlucose: 90, sleepHours: 7.4, mood: 4, climate: 4 },
  days: Array.from({ length: len }, (_, i) => ({ day: i + 1, checkedIn: true, restingHr: 64, sys: 114, dia: 74, bodyTemp: 36.7, fastingGlucose: 90, spo2: 98, sleepHours: 7.4, mood: 4, climate: 4, exerciseMin: 120, dose: 0.7, symptoms: {}, vision: null, ...over })),
});

t('reference ranges: boundaries', () => {
  assert.equal(classify('restingHr', 60, T).tier, 'normal');
  assert.equal(classify('restingHr', 100, T).tier, 'normal');
  assert.equal(classify('restingHr', 59, T).tier, 'attention');
  assert.equal(classify('restingHr', 101, T).tier, 'attention');
  assert.equal(classify('bodyTemp', 37.2, T).tier, 'normal');
  assert.equal(classify('bodyTemp', 37.3, T).tier, 'attention');
  assert.equal(classify('bodyTemp', 38.0, T).tier, 'critical');
  assert.equal(classify('bodyTemp', 36.0, T).tier, 'attention');
  assert.equal(classify('fastingGlucose', 53, T).tier, 'critical');
  assert.equal(classify('fastingGlucose', 54, T).tier, 'attention');
  assert.equal(classify('fastingGlucose', 70, T).tier, 'normal');
  assert.equal(classify('fastingGlucose', 99, T).tier, 'normal');
  assert.equal(classify('fastingGlucose', 100, T).tier, 'attention');
  assert.equal(classify('sleepHours', 7, T).tier, 'normal');
  assert.equal(classify('sleepHours', 6.9, T).tier, 'attention');
  assert.equal(classify('spo2', 95, T).tier, 'normal');
  assert.equal(classify('spo2', 94, T).tier, 'attention');
  assert.equal(classify('spo2', 89, T).tier, 'critical');
});

t('blood pressure: AHA categories and tiers', () => {
  assert.equal(bpCategory(118, 76, T).id, 'normal');
  assert.equal(bpCategory(124, 78, T).id, 'elevated');
  assert.equal(bpCategory(124, 82, T).id, 'stage1');
  assert.equal(bpCategory(140, 70, T).id, 'stage2');
  assert.equal(bpCategory(120, 90, T).id, 'stage2');
  assert.equal(bpCategory(180, 120, T).id, 'stage2');
  assert.equal(bpCategory(181, 80, T).id, 'severe');
  assert.equal(bpCategory(150, 121, T).id, 'severe');
  assert.equal(classify('bp', 139, T, 89).tier, 'normal');
  assert.equal(classify('bp', 140, T, 80).tier, 'attention');
  assert.equal(classify('bp', 185, T, 100).tier, 'critical');
});

t('all normal → no alerts, score 100', () => {
  const r = evaluate(flat(), T);
  assert.equal(r.alerts.length, 0);
  assert.equal(r.score, 100);
  for (const z of Object.values(r.zones)) assert.equal(z.tier, 'normal');
});

t('personal baseline: in range but far from own baseline → Attention', () => {
  const s = flat({ restingHr: 80 }); // 60–100 is fine in general, but +18 over this person's 62
  const r = evaluate(s, T);
  assert.equal(classify('restingHr', 80, T).tier, 'normal');
  assert.equal(r.indicators.restingHr.tier, 'attention');
  assert.ok(r.indicators.restingHr.reasons.some((x) => x.kind === 'baseline'));
  assert.equal(r.zones.heart.tier, 'attention');
  // inside tolerance → normal
  assert.equal(evaluate(flat({ restingHr: 76 }), T).indicators.restingHr.tier, 'normal');
});

t('trend: steady drift inside the normal range → Attention', () => {
  const s = flat();
  [116, 117, 119, 120, 122, 123, 125].forEach((v, i) => { s.days[3 + i].sys = v; });
  const r = evaluate(s, T);
  const bp = r.indicators.bp;
  assert.equal(classify('bp', 125, T, 74).tier, 'normal');
  assert.equal(bp.tier, 'attention');
  assert.ok(bp.reasons.some((x) => x.kind === 'trend'));
  assert.ok(r.alerts.some((a) => a.indicator === 'bp' && a.kind === 'trend'));
});

t('trend: noise without direction does not fire; improving direction does not fire', () => {
  assert.equal(trend([114, 118, 113, 117, 112, 118, 114], 6, 4, 'up').fired, false);
  assert.equal(trend([128, 126, 125, 123, 121, 119, 117], 6, 4, 'up').fired, false);
  assert.equal(trend([7.4, 7.2, 7.0, 6.8, 6.6, 6.4, 6.2], 0.8, 4, 'down').fired, true);
  assert.equal(trend([1, 2, 3], 1, 2, 'up'), null);
});

t('combined rule: sleep + mood + team climate low together → behavioral warning', () => {
  const s = flat();
  s.days.slice(-3).forEach((d) => { d.sleepHours = 6.5; d.mood = 2; d.climate = 2; });
  const r = evaluate(s, T);
  assert.ok(r.combined);
  assert.ok(r.alerts.some((a) => a.kind === 'combined' && a.zone === 'mind'));
  assert.equal(r.zones.mind.tier, 'attention');
  // only two of three → no combined warning
  const s2 = flat();
  s2.days.slice(-3).forEach((d) => { d.sleepHours = 6.5; d.mood = 2; });
  assert.equal(evaluate(s2, T).combined, null);
});

t('chronic sleep shortfall (placeholder rule) → Critical', () => {
  const r = evaluate(flat({ sleepHours: 5.5 }), T);
  assert.equal(r.indicators.sleepHours.tier, 'critical');
  assert.ok(r.indicators.sleepHours.reasons.some((x) => x.heuristic === 'placeholder'));
});

t('radiation: cumulative dose vs career limit, environment context', () => {
  const s = flat({ dose: 1.8 }, 100); // 180 mSv
  const r = evaluate({ ...s, env: 'mars' }, T).indicators.radiation;
  assert.equal(Math.round(r.value), 180);
  assert.equal(r.tier, 'normal');
  assert.equal(r.envDaily, 1.8);
  assert.equal(r.designLimit, 1.3);
  assert.equal(evaluate({ ...s, env: 'station' }, T).indicators.radiation.envDaily, 0.731);
  assert.equal(evaluate({ ...s, env: 'moon' }, T).indicators.radiation.envDaily, 1.369);
  assert.equal(evaluate(flat({ dose: 1.8 }, 170), T).indicators.radiation.tier, 'attention'); // 306 mSv > 50 %
  assert.equal(evaluate(flat({ dose: 2 }, 300), T).indicators.radiation.tier, 'critical'); // 600 mSv
});

t('symptoms and exercise gap raise the right zone', () => {
  const s = flat();
  s.days.at(-1).symptoms = { rash: true, headache: true };
  const r = evaluate(s, T);
  assert.equal(r.zones.immune.tier, 'attention');
  assert.equal(r.zones.eyes.tier, 'attention');
  const g = flat();
  g.days.slice(-3).forEach((d) => { d.exerciseMin = 0; });
  assert.equal(evaluate(g, T).zones.bones.tier, 'attention');
});

t('score: 100 − 8 per Attention zone − 20 per Critical zone', () => {
  const s = flat({ bodyTemp: 38.4 });
  s.days.at(-1).symptoms = { headache: true };
  const r = evaluate(s, T);
  assert.equal(r.zones.immune.tier, 'critical');
  assert.equal(r.score, 100 - 20 - 8);
});

t('validation rejects impossible values', () => {
  assert.equal(validate('restingHr', 300).ok, false);
  assert.equal(validate('bodyTemp', 12).ok, false);
  assert.equal(validate('bodyTemp', 36.6).ok, true);
  assert.equal(validate('sleepHours', 25).ok, false);
  assert.equal(validate('spo2', 101).ok, false);
  assert.ok(validateDay({ sys: 80, dia: 95 }).dia);
  assert.deepEqual(validateDay({ sys: 120, dia: 80, restingHr: 64 }), {});
});

t('demo story: day 60 shows all three tiers', () => {
  const s = makeDemo(T);
  assert.equal(s.days.length, 60);
  assert.deepEqual(makeDemo(T), s); // deterministic
  const r = evaluate(s, T);
  assert.equal(r.zones.immune.tier, 'critical'); // fever 38.1 °C
  assert.equal(r.indicators.bodyTemp.display, '38.1');
  assert.equal(r.zones.heart.tier, 'attention'); // BP trend, value still in range
  assert.equal(r.indicators.bp.reasons.find((x) => x.kind === 'range').tier, 'normal');
  assert.ok(r.indicators.bp.reasons.some((x) => x.kind === 'trend'));
  assert.equal(r.zones.mind.tier, 'attention'); // combined rule, not the chronic placeholder
  assert.ok(r.combined);
  for (const z of ['bones', 'eyes', 'metabolism', 'whole']) assert.equal(r.zones[z].tier, 'normal', z);
  assert.equal(r.score, 100 - 20 - 8 - 8);
  assert.equal(streak(s.days), 27);
  console.log('    alerts:', r.alerts.map((a) => `[${a.tier}] ${a.title}`).join(' | '));
  console.log('    dose:', r.indicators.radiation.display, 'mSv; days to limit', r.indicators.radiation.daysToLimit);
});

console.log(`\n${n} tests passed`);
