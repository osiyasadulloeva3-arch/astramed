// Trend charts on the zone card (Apache ECharts, loaded from vendor/ on first use — never from the network).
import { INDICATORS } from './rules.js';
import { reduced } from './ui.js';

let loading = null;
export function loadECharts() {
  if (window.echarts) return Promise.resolve(window.echarts);
  loading = loading || new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/echarts/echarts.min.js';
    s.onload = () => res(window.echarts); s.onerror = () => rej(new Error('chart library missing'));
    document.head.appendChild(s);
  });
  return loading;
}

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const fmt = (v, dp) => (v === null || v === undefined ? 'not logged' : Number(v).toFixed(dp));

/** Everything the chart needs for one indicator. All limit numbers are read from thresholds.json. */
export function chartSpec(app, id, range) {
  const { state, T } = app;
  const meta = INDICATORS.find((i) => i.id === id);
  const ind = app.R.indicators[id];
  const all = state.days;
  const n = range === 'all' ? all.length : Math.min(range, all.length);
  const days = all.slice(-n);
  const tol = T.heuristics.baselineTolerance; const b = state.baseline; const I = T.indicators;
  const spec = { x: days.map((d) => d.day), series: [], lines: [], band: null, tier: ind.tier, unit: meta.unit, dp: meta.dp, type: 'line', label: meta.label, note: '' };
  const col = (f) => days.map((d) => (typeof d[f] === 'number' ? d[f] : null));
  const band = (f) => { if (typeof b[f] === 'number' && tol[f]) { spec.band = { from: b[f] - tol[f], to: b[f] + tol[f], text: `Your baseline ${fmt(b[f], meta.dp)} ± ${tol[f]}` }; spec.note = 'Shaded band: your pre-flight baseline with the team\'s tolerance (team heuristic).'; } else if (typeof b[f] === 'number') { spec.lines.push({ y: b[f], text: `Your baseline ${fmt(b[f], meta.dp)}`, tier: 'none' }); } };

  if (id === 'radiation') {
    let c = b.priorDose || 0;
    const cum = all.map((d) => { if (typeof d.dose !== 'number') return null; c += d.dose; return +c.toFixed(1); }).slice(-n);
    spec.series.push({ name: 'Cumulative dose', data: cum });
    const lim = I.radiation.careerLimit.lt; const fr = T.heuristics.radiationAttentionFraction;
    spec.lines.push({ y: lim, text: `Career limit ${lim} mSv`, tier: 'critical' }, { y: lim * fr.value, text: `Attention at ${fr.value * 100} % of the limit (placeholder — not verified)`, tier: 'attention' });
    spec.area = true; spec.min = 0;
  } else if (id === 'bp') {
    spec.series.push({ name: 'Systolic', data: col('sys') }, { name: 'Diastolic', data: col('dia'), soft: true });
    const s2 = I.bloodPressure.categories.find((x) => x.id === 'stage2');
    const el = I.bloodPressure.categories.find((x) => x.id === 'elevated');
    spec.lines.push({ y: s2.systolic.gte, text: `Stage 2 from ${s2.systolic.gte} systolic (AHA)`, tier: 'attention' }, { y: s2.diastolic.gte, text: `Stage 2 from ${s2.diastolic.gte} diastolic (AHA)`, tier: 'attention' });
    if (typeof b.sys === 'number') spec.lines.push({ y: b.sys, text: `Your baseline ${b.sys} systolic`, tier: 'none', pos: 'insideStartBottom' });
    spec.band = { from: el.systolic.min, to: el.systolic.max + 1, text: `Elevated ${el.systolic.min}–${el.systolic.max} systolic (AHA)`, amber: true };
    spec.note = 'Shaded band: the AHA "Elevated" category for systolic pressure. It is below the Stage 2 lines, so a reading there is flagged only when it also trends upward or leaves your baseline.';
  } else if (id === 'exercise') {
    spec.type = 'bar'; spec.min = 0;
    spec.series.push({ name: 'Exercise', data: col('exerciseMin') });
  } else {
    spec.series.push({ name: meta.label, data: col(meta.field) });
    band(meta.field);
    if (id === 'restingHr') spec.lines.push({ y: I.restingHr.normal.max, text: `Normal up to ${I.restingHr.normal.max}`, tier: 'attention' }, { y: I.restingHr.normal.min, text: `Normal from ${I.restingHr.normal.min}`, tier: 'attention' });
    if (id === 'bodyTemp') spec.lines.push({ y: I.bodyTemp.fever.gte, text: `Fever from ${I.bodyTemp.fever.gte.toFixed(1)}`, tier: 'critical' }, { y: I.bodyTemp.normal.max, text: `Normal up to ${I.bodyTemp.normal.max}`, tier: 'attention' });
    if (id === 'fastingGlucose') spec.lines.push({ y: I.fastingGlucose.normal.max, text: `Normal up to ${I.fastingGlucose.normal.max}`, tier: 'attention' }, { y: I.fastingGlucose.normal.min, text: `Normal from ${I.fastingGlucose.normal.min}`, tier: 'attention' });
    if (id === 'sleepHours') spec.lines.push({ y: I.sleepHours.recommended.gte, text: `Recommended ${I.sleepHours.recommended.gte} h or more`, tier: 'attention' });
    if (id === 'spo2') spec.lines.push({ y: I.spo2.normal.min, text: `Normal from ${I.spo2.normal.min}`, tier: 'attention' });
    if (id === 'mood' || id === 'climate') { spec.min = 1; spec.max = 5; spec.step = 1; }
  }
  // week-ago versus latest
  const main = spec.series[0].data;
  let last = main.length - 1; while (last >= 0 && main[last] === null) last--;
  spec.last = last; spec.weekAgo = last - 7 >= 0 && main[last - 7] !== null ? last - 7 : -1;
  return spec;
}

export async function renderChart(el, spec) {
  const echarts = await loadECharts();
  const ink = css('--ink'); const soft = css('--ink-soft'); const rule = css('--paper-rule');
  const tierInk = { normal: css('--calm-ink'), attention: css('--amber-ink'), critical: css('--alarm-ink'), none: soft };
  const few = spec.x.length <= 31;
  const vals = spec.series.flatMap((s) => s.data).filter((v) => v !== null);
  const refs = [...spec.lines.map((l) => l.y), ...(spec.band ? [spec.band.from, spec.band.to] : [])];
  let lo = Math.min(...vals, ...refs); let hi = Math.max(...vals, ...refs);
  const pad = (hi - lo || 1) * 0.08;
  const raw = (hi - lo + 2 * pad) / 4; const mag = 10 ** Math.floor(Math.log10(raw));
  const step = spec.step || [1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) * mag;
  lo = spec.min !== undefined ? spec.min : Math.floor((lo - pad) / step) * step; hi = spec.max !== undefined ? spec.max : Math.ceil((hi + pad) / step) * step;

  const series = spec.series.map((s, si) => {
    const data = s.data.map((v, i) => {
      if (si === 0 && i === spec.last) return { value: v, symbol: 'circle', symbolSize: 10, itemStyle: { color: tierInk[spec.tier], borderColor: css('--bone'), borderWidth: 2 } };
      if (si === 0 && i === spec.weekAgo) return { value: v, symbol: 'emptyCircle', symbolSize: 9, itemStyle: { color: ink, borderWidth: 1.5 } };
      return v;
    });
    const base = { name: s.name, data, type: spec.type, color: s.soft ? soft : ink, animationDuration: 700, animationEasing: 'cubicOut' };
    if (spec.type === 'bar') return { ...base, barMaxWidth: 12, itemStyle: { color: soft } };
    return { ...base, symbol: 'circle', symbolSize: few ? 4 : 0, showSymbol: true, lineStyle: { width: s.soft ? 1.1 : 1.8, color: s.soft ? soft : ink }, areaStyle: spec.area ? { color: 'rgba(26,27,23,.08)' } : undefined };
  });
  series[0].markLine = { silent: true, symbol: 'none', animation: false,
    data: spec.lines.map((l) => ({ yAxis: l.y, lineStyle: { color: tierInk[l.tier], type: [5, 4], width: 1.1 }, label: { formatter: l.text, position: l.pos || 'insideEndTop', color: tierInk[l.tier], fontSize: 11, fontFamily: 'Archivo', fontWeight: 600, distance: [0, 3] } })) };
  if (spec.band) series[0].markArea = { silent: true, animation: false, itemStyle: { color: spec.band.amber ? 'rgba(184,118,10,.16)' : 'rgba(26,27,23,.075)' }, label: { position: 'insideBottomLeft', color: spec.band.amber ? tierInk.attention : soft, fontSize: 11, fontFamily: 'Archivo', distance: 4 }, data: [[{ yAxis: spec.band.from, name: spec.band.text }, { yAxis: spec.band.to }]] };

  const chart = echarts.getInstanceByDom(el) || echarts.init(el, null, { renderer: 'canvas' });
  chart.setOption({
    animation: !reduced(),
    textStyle: { fontFamily: 'Archivo, sans-serif' },
    grid: { left: 38, right: 14, top: 14, bottom: 24 },
    tooltip: { trigger: 'axis', confine: true, transitionDuration: 0, backgroundColor: ink, borderWidth: 0, padding: [6, 10], textStyle: { color: css('--bone'), fontSize: 12, fontFamily: 'Archivo' },
      axisPointer: { type: 'line', lineStyle: { color: soft, width: 1, type: 'solid' } },
      formatter: (ps) => `Day ${ps[0].axisValue}<br>${ps.map((p) => `${p.seriesName}: ${fmt(p.value, spec.dp)}${p.value === null || p.value === undefined ? '' : ' ' + spec.unit}`).join('<br>')}` },
    xAxis: { type: 'category', data: spec.x, boundaryGap: spec.type === 'bar', axisLine: { lineStyle: { color: ink } }, axisTick: { show: false }, axisLabel: { color: soft, fontSize: 11, hideOverlap: true, formatter: (v) => `d${v}` } },
    yAxis: { type: 'value', min: +lo.toFixed(2), max: +hi.toFixed(2), interval: step, axisLabel: { color: soft, fontSize: 11, formatter: (v) => (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(1)) }, splitLine: { lineStyle: { color: rule, width: 1 } } },
    series,
  }, true);
  return chart;
}
