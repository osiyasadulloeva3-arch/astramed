# DESIGN — Astronaut Self-Assessment Health Monitor (team Lyra)

## 1. Subject, audience, the one job
- **Subject:** one crew member's body, 60 days into a Mars transit, read against verified medical references.
- **Audience:** a tired, non-physician astronaut (daily, < 60 s) and a hackathon judge (10 s, no clicks).
- **The one job of the main screen:** answer "am I OK, where not, and what do I do now" before any click.

## 2. Art direction — "Lightbox & Annunciator"
A living **radiograph** of the crew member, mounted in a **caution-and-warning annunciator panel**; every
explanation is a printed **cue card**. Three real objects from medicine and flight decks, not "space UI":
- the **lightbox**: the 3D body is cold, pale X-ray film — neutral, never status-coloured itself;
- the **annunciator**: 7 engraved lamps (one per zone) + a Master Caution button you must press to acknowledge;
- the **cue card**: zone details slide in as a sheet of bone paper with dark ink — a deliberate dark → light flip,
  because long instructions read better on paper, and because no other dashboard in the room will do it.

## 3. Tokens
| Token | Hex | Role |
|---|---|---|
| `--lampblack` | `#0C0D0B` | page: warm green-black of a blackened panel (not navy) |
| `--anodized` | `#171915` | raised instrument surfaces |
| `--rule` | `#33362E` | engraved hairlines, dividers |
| `--bone` | `#EAE6D8` | ink on dark; paper of the cue cards |
| `--film` | `#CFE3E6` | the radiograph body, neutral readout glow |
| `--calm` / `--amber` / `--alarm` | `#86C7B4` / `#F2A23A` / `#F0503C` | Normal / Attention / Critical — the only saturated colours |

Secondary: `--ash #A3A293` (secondary text on dark, 7.5:1), `--ink #1A1B17` (text on paper), status inks for paper
`#1F6B5A / #8A5200 / #B3261A` (all ≥ 4.5:1 on bone).

**Type (self-hosted, OFL, variable):**
- **Archivo** (width 62–125, weight 100–900) — the instrument voice. Width axis is used on purpose:
  68 % condensed bold caps for lamp legends (engraved panel lettering), 112 % wide for big numerals, 100 % for UI.
- **Literata** (optical size) — the cue-card voice: explanations, "why am I seeing this", advice.
- Scale 12 · 13 · 15 · 18 · 24 · 36 · 56 px; tabular numerals everywhere a number can change.

**Space** 4 · 8 · 12 · 16 · 24 · 32 · 48. **Radius** 2 px on instruments (hard-edged), cue card has one cut corner.
No soft grey shadows; depth comes from hairlines, inset bevels and light.

**Motion tokens:** `--ease-out cubic-bezier(.23,1,.32,1)` (enter, feedback) · `--ease-in-out cubic-bezier(.77,0,.175,1)`
(camera, on-screen moves) · `--ease-drawer cubic-bezier(.32,.72,0,1)` (cue card) · press 160 ms · hover/colour 180 ms ·
card in 320 ms / out 200 ms · camera dolly 700 ms. Only transform/opacity; never `transition: all`.

## 4. Wireframes
Desktop 1440 × 900 (no page scroll):
```
┌ Lyra-1 crew health file │ A. Rahimi, flight engineer │ Mission day 060 │ Station·Moon·[Mars] │ Earth link … │ Score │ Check-in ┐
├─ ANNUNCIATOR ──────┬──────────────────────────────────────────────────┬─ TODAY ───────────────────┤
│ [HEART ▲ ATTN ]    │                                                  │ Resting HR    68 bpm  → ~~ │
│ [BONES ✓ NORMAL]   │                  radiograph body                 │ Blood press. 127/81   ↑ ~~ │
│ [EYES  ✓ NORMAL]   │            (3D, slow turn, drag to orbit)        │ Temperature  38.1 °C  ↑ ~~ │
│ [IMMUNE ■ CRITICAL]│          zone anchors + leader-line labels       │ Glucose      92 mg/dL → ~~ │
│ [MIND  ▲ ATTN ]    │                                                  │ Sleep         5.4 h   ↓ ~~ │
│ [METAB ✓ NORMAL]   │                                                  │ Mood          2 / 5   ↓ ~~ │
│ [RADIATION ✓ ]     │                                                  │ Dose        106 mSv   ↑ ~~ │
│ [MASTER CAUTION]   │                                                  ├─ ROUTINE ─────────────────┤
├─ Alerts ───────────┤                                                  │ 07:00 vitals ✓  13:00 …    │
│ ■ Fever 38.1 °C …  │                                                  │ streak 60 d · badges       │
│ ▲ BP trend … why?  │                                                  │ [Report for flight surgeon]│
├────────────────────┴──────────────────────────────────────────────────┴────────────────────────────┤
│ Decision support, not a diagnosis. Critical values → contact crew medical officer / flight surgeon. │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
Zone click → camera dollies to the zone, body shifts left, a bone-paper CUE CARD (560 px) slides over the right column.
```
Phone 390 × 844 (page scrolls):
```
┌ Lyra-1 · Day 060 · Mars ▾ · Score ┐
│        radiograph body (46 vh)     │
│ ▲HEART ✓BONES ✓EYES ■IMMUNE        │  ← annunciator as a 4+4 lamp grid
│ ▲MIND ✓METAB ✓RAD  [MASTER]        │
│ Alerts (stack)                     │
│ Today metrics (list)               │
│ Routine · streak · report          │
│ disclaimer                         │
└ [ Check-in ] sticky thumb button ──┘   cue card / check-in = full-height bottom sheets
```

## 5. Motion budget
**One orchestrated moment — power-up (≈ 2.6 s, GSAP timeline, the video's first 5 seconds):**
| t (s) | Cast | What |
|---|---|---|
| 0.00 | Lead: body | lightbox scan plane rises feet → head, film develops behind it (1.4 s, ease-in-out) |
| 0.35 | Support: lamps | **lamp test** — all 7 lamps flash bone-white once, as real annunciators do on power-up |
| 0.90 | Lead: zones | anchors ignite Normal → Attention → Critical (40 ms steps); lamps settle to their status in sync |
| 1.30 | Support: metrics | values decode (ScrambleText) and count up, rows 35 ms apart |
| 1.80 | Support: alerts | alert rows slide up 8 px + fade (2 steps); Master Caution lights last |
| static | top bar, disclaimer, frame | never animate — they are the instrument housing |

Afterwards **feedback only**: lamp/zone hover link (180 ms), press scale 0.97 (160 ms), cue card (320/200 ms, drawer
curve, exits faster), camera dolly (700 ms), chart draw-in (once per open), Attention = slow amber breathing,
**only Critical pulses**. Keyboard-triggered actions do not animate focus. `prefers-reduced-motion`: no scan, no pulse,
no dolly — final state with a 200 ms cross-fade; the static 2D figure replaces the 3D turn.

## 6. Self-critique against the generic default, and what changed
- *First pass was:* cyan hologram on navy, glass cards, mono labels. That is the 100 other dashboards. **Changed:**
  the body is a neutral radiograph (film white), colour is reserved for status only; the page is warm lampblack.
- *"Rounded card kit"* → no cards on the main screen: hairline-ruled instrument regions, hard 2 px corners; the only
  "card" is literally a card (paper cue card) and it looks like one.
- *All-caps eyebrows everywhere* → caps exist **only** where real hardware has them: lamp legends. Headings are sentence case.
- *Mono for numbers* → Archivo wide with tabular figures instead; the width axis carries the instrument feel.
- *Fade-up on everything* → one boot sequence with a real-world reason (power-up + lamp test), then stillness.
- *Risk kept on purpose:* the dark → paper flip. If reviewers find it jarring, fallback = same card in `--anodized`.
- *Honesty rule:* any value that is a team heuristic or placeholder is stamped so on the card, like a pencilled
  correction on a checklist — it becomes part of the look instead of fine print.
