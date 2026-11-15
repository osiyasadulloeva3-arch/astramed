// "Sources and limits": what the tool is, what it is not, and where every number comes from.
import { INDICATORS } from './rules.js';
import { $, esc, icon, stamp } from './ui.js';

const STATUS_WORD = { verified: 'read on the source page', derived: 'calculated from a sourced distance', 'team-heuristic': 'team heuristic', placeholder: 'placeholder — not verified' };
const REF_LABEL = { restingHr: 'Resting heart rate', bloodPressure: 'Blood pressure', bodyTemp: 'Body temperature', fastingGlucose: 'Fasting blood glucose', sleepHours: 'Sleep', spo2: 'Blood oxygen (SpO2)', mood: 'Mood and team climate', radiation: 'Radiation dose' };

export function openAbout(app) {
  const dlg = $('#about');
  const { T } = app; const H = T.heuristics;
  const refs = [...new Set(INDICATORS.map((i) => i.ref).filter(Boolean))];
  const src = (s) => `<li><span lang="en">${esc(s.org)}. ${esc(s.title)}.</span>${s.url ? ` <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a>` : ''}</li>`;
  const delay = (L) => (L.oneWaySeconds ? (L.oneWaySeconds < 60 ? `${L.oneWaySeconds.toFixed(2)} s one way` : `${(L.oneWaySeconds / 60).toFixed(1)} min one way`) : 'near real-time');

  dlg.innerHTML = `<div class="sheet-in">
    <header class="sheet-head"><div><h2 id="about-title">Sources and limits</h2><p>What this tool is, and what it is not.</p></div>
      <button class="sheet-close" type="button" data-close aria-label="Close">${icon('close', 14)}</button></header>
    <div class="sheet-body about">
      <p class="about-lead">AstraMed is a student hackathon prototype made by team Lyra in Dushanbe, Tajikistan. The demo mission uses fictional data. Not a NASA product, and not endorsed by NASA. It is decision support, not a diagnosis: for a Critical value, contact the crew medical officer or the flight surgeon.</p>
      <p class="about-guide">How it works, the full rules table and a three-minute walkthrough are in the <a href="guide.html">Guide</a>.</p>

      <h3>Limits you should know</h3>
      <ul class="about-list">
        <li>The tool does not measure anything. Every reading is typed in by the crew member.</li>
        <li>Reference ranges are general clinical references made for adults on Earth. No spaceflight-specific ranges are published for most of them, so each reading is also compared with the crew member's own pre-flight baseline.</li>
        <li>The astronaut, the mission and all 60 days of data are invented for the demo.</li>
        <li>The vision self-check is a screening prompt, not an eye exam.</li>
        <li>Sending a report is simulated. Nothing leaves this device, and the app makes no network requests while it runs.</li>
      </ul>

      <h3>Where the numbers come from</h3>
      <p>Checked on ${esc(T.meta.verifiedOn)}. The exact quote for each limit is on its card, under “Source for these limits”. Links open only when a network is available.</p>
      <dl class="about-src">${refs.map((r) => { const I = T.indicators[r]; return `<div><dt>${esc(REF_LABEL[r] || r)} ${I.status === 'verified' ? '' : stamp(I.status)}</dt><dd><ul>${(I.sources || []).map(src).join('')}</ul></dd></div>`; }).join('')}</dl>

      <h3>Communication delay</h3>
      <dl class="about-src">${Object.values(T.environments).map((e) => `<div><dt>${esc(e.label)}: ${delay(e.link)} <em class="stamp">${esc(STATUS_WORD[e.link.status] || e.link.status)}</em></dt><dd>${esc(e.link.note)}${e.link.source ? `<ul>${src(e.link.source)}</ul>` : ''}</dd></div>`).join('')}</dl>

      <h3>Rules made by the team</h3>
      <p>${esc(H.note)}</p>
      <ul class="about-list">
        <li>Personal-baseline tolerance, trend rule, combined sleep, mood and team-climate rule, low-mood rule, exercise gap of ${H.exerciseGapDays} days, crew health score. ${stamp('team-heuristic')}</li>
        <li>Chronic short sleep: average under ${H.sleepChronic.avgBelow} h over ${H.sleepChronic.days} days. ${stamp('placeholder')}</li>
        <li>Radiation Attention level at ${H.radiationAttentionFraction.value * 100} % of the career limit. ${stamp('placeholder')}</li>
      </ul>

      <h3>Credits</h3>
      <ul class="about-list">
        <li>Idea and concept: team Lyra. Built with AI assistance (Claude Code); see AI_USAGE.md.</li>
        <li>Body model: “Animated Human” by Quaternius, CC0.</li>
        <li>Libraries, stored inside the app: three.js (MIT), GSAP (GreenSock standard no-charge license), Apache ECharts (Apache-2.0), jsPDF (MIT).</li>
        <li>Typefaces: Archivo and Literata, SIL Open Font License 1.1.</li>
        <li>Risk names follow the NASA Human Research Program risk list. Full list of sources and licenses: SOURCES.md.</li>
      </ul>
    </div></div>`;
  dlg.onclick = (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); };
  if (!dlg.open) dlg.showModal();
}
