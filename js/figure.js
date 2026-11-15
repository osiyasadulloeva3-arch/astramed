// Static 2D figure with the same seven zones. Used when WebGL is unavailable or the user prefers reduced motion.
// Same API as body3d.js so main.js does not care which one it got.
const NS = 'http://www.w3.org/2000/svg';
const POS = { mind: [120, 24], eyes: [120, 66], heart: [136, 140], metabolism: [120, 214], immune: [66, 152], bones: [145, 342], whole: [212, 494] };
const OUTLINE = 'M120 22C138 22 147 36 146 54C145 68 138 80 131 84L131 94C150 98 166 102 172 114C178 128 180 160 184 190L192 250C194 262 190 268 184 266C178 264 176 256 175 248L164 190L158 150L156 210C156 232 160 250 160 276L156 370L152 462L164 480C166 485 163 487 158 487L134 487L132 462L126 370L120 290L114 370L108 462L106 487L82 487C77 487 74 485 76 480L88 462L84 370L80 276C80 250 84 232 84 210L82 150L76 190L65 248C64 256 62 264 56 266C50 268 46 262 48 250L56 190C60 160 62 128 68 114C74 102 90 98 109 94L109 84C102 80 95 68 94 54C93 36 102 22 120 22Z';
const BONES = 'M120 96V258M96 118Q120 108 144 118M94 136Q120 126 146 136M94 154Q120 144 146 154M96 172Q120 163 144 172M98 190Q120 182 142 190M92 262Q120 244 148 262Q120 282 92 262M72 116L60 190L56 252M168 116L180 190L184 252M102 276L98 370L96 462M138 276L142 370L144 462';

export function createFigure(container, { zones, onHover, onSelect, onFrame }) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 240 520'); svg.setAttribute('class', 'figure'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<ellipse class="fig-dose" cx="120" cy="494" rx="92" ry="13"/>
    <path class="fig-body" d="${OUTLINE}"/><path class="fig-bone" d="${BONES}"/>
    ${zones.map((z) => `<g class="fig-anchor" data-zone="${z}" transform="translate(${POS[z][0]} ${POS[z][1]})"><circle class="ring" r="7"/><circle class="core" r="2.6"/><circle class="fig-hit" r="20"/></g>`).join('')}`;
  container.appendChild(svg);
  const anchor = (z) => svg.querySelector(`.fig-anchor[data-zone="${z}"]`);

  svg.addEventListener('click', (e) => { const g = e.target.closest('.fig-anchor'); if (g) onSelect(g.dataset.zone); });
  svg.addEventListener('pointerover', (e) => { const g = e.target.closest('.fig-anchor'); onHover(g ? g.dataset.zone : null); });
  svg.addEventListener('pointerleave', () => onHover(null));

  function report() {
    const m = svg.getScreenCTM(); const box = container.getBoundingClientRect();
    if (!m || !onFrame) return;
    onFrame(zones.map((id) => ({ id, x: m.a * POS[id][0] + m.e - box.left, y: m.d * POS[id][1] + m.f - box.top })));
  }
  const ro = new ResizeObserver(report); ro.observe(container);

  return {
    supported: false,
    setStatuses(tiers, unacked = {}) {
      zones.forEach((z) => { const a = anchor(z); a.dataset.tier = tiers[z]; a.querySelector('.ring').setAttribute('r', unacked[z] ? 10 : 7); });
      report();
    },
    setHighlight(id) { zones.forEach((z) => anchor(z).classList.toggle('hl', z === id)); },
    focus() {},
    boot() { return window.gsap ? window.gsap.timeline().fromTo(svg, { opacity: 0 }, { opacity: 1, duration: 0.2 }) : null; },
    dispose() { ro.disconnect(); svg.remove(); },
  };
}
