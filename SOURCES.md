# SOURCES

Every number used by the rules engine, with the exact page it was read on and a verbatim quote.
All pages were opened on **2026-11-15**. Machine-readable copy: `data/thresholds.json`.

Legend: **verified** = number read on the source page, quote is verbatim ·
**team heuristic** = a rule chosen by team Lyra, not a medical standard ·
**placeholder — not verified** = no source found; shown with that label in the UI.

The reference values are general Earth-based clinical references. The app is decision support, not a diagnosis.

## 1. Thresholds

### Resting heart rate — 60–100 bpm · verified
- American Heart Association, "All About Heart Rate" —
  https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse
  > "A normal resting heart rate is between 60 and 100 beats per minute if you are sitting or lying and you are calm and feeling well."
- MedlinePlus (U.S. National Library of Medicine), "Pulse" — https://medlineplus.gov/ency/article/003399.htm
  > "Children 10 years and older, and adults (including seniors): 60 to 100 beats per minute" · "Well-trained athletes: 40 to 60 beats per minute"
- No single-value Critical threshold was verified → the app uses none (outside range = Attention; team mapping).

### Blood pressure — verified (AHA categories)
- American Heart Association, "Understanding Blood Pressure Readings" —
  https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings
  > "NORMAL LESS THAN 120 and LESS THAN 80 · ELEVATED 120 – 129 and LESS THAN 80 · STAGE 1 HYPERTENSION (High Blood Pressure) 130 – 139 or 80 – 89 · STAGE 2 HYPERTENSION (High Blood Pressure) 140 OR HIGHER or 90 OR HIGHER · SEVERE HYPERTENSION (If you don't have symptoms*, call your healthcare professional.) HIGHER THAN 180 and/or HIGHER THAN 120 · HYPERTENSIVE EMERGENCY (If you have any of these symptoms*, call 911.) HIGHER THAN 180 and/or HIGHER THAN 120"
- Changed vs. BUILD_PROMPT: the AHA page no longer says "hypertensive crisis"; the top rows are "Severe hypertension" / "Hypertensive emergency". The app uses the current wording.
- Tier mapping (team): Attention from 140/90 (TEAM_CONCEPT §9), Critical above 180 and/or 120.

### Body temperature — 36.1–37.2 °C normal, fever from 38.0 °C · verified
- MedlinePlus, "Body temperature norms" — https://medlineplus.gov/ency/article/001982.htm
  > "Some studies have shown that the normal body temperature can have a wide range, from 97°F (36.1°C) to 99°F (37.2°C). A temperature over 100.4°F (38°C) most often means you have a fever caused by an infection or illness."
- CDC, "Definitions of Signs, Symptoms, and Conditions of Ill Travelers" —
  https://www.cdc.gov/port-health/php/definitions-symptoms-reportable-illness/index.html
  > "A fever (has a measured temperature of 100.4 °F [38 °C] or greater, or feels warm to the touch, or gives a history of feeling feverish)"
- Tier mapping (team): 37.3–37.9 °C or below 36.1 °C = Attention; ≥ 38.0 °C = Critical (TEAM_CONCEPT §9).

### Fasting blood glucose — verified
- American Diabetes Association, "Diabetes Diagnosis & Tests" — https://diabetes.org/about-diabetes/diagnosis
  > "Fasting Plasma Glucose (FPG) — Normal: less than 100 mg/dL · Prediabetes: 100 mg/dl to 125 mg/dL · Diabetes: 126 mg/dL or higher"
- American Diabetes Association, "Low Blood Glucose (Hypoglycemia)" — https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose
  > "Low blood glucose is when your levels fall below 70 mg/dL"
- ADA Standards of Care in Diabetes—2025 (abridged), Section 6, Clinical Diabetes — https://doi.org/10.2337/cd25-a006
  > "Level 1 is glucose <70 mg/dL (<3.9 mmol/L) but ≥54 mg/dL (≥3.0 mmol/L). Level 2 is glucose <54 mg/dL (<3.0 mmol/L)."
- "70–99 normal" combines two statements (normal fasting < 100; low < 70). No Critical HIGH value was verified → high values are Attention.

### Sleep — 7 or more hours · verified (CDC)
- CDC, "About Sleep" — https://www.cdc.gov/sleep/about/index.html
  > "Adult 18–60 years: 7 or more hours"
- In-flight context — Barger LK et al., The Lancet Neurology 2014 (NASA-funded) — https://doi.org/10.1016/S1474-4422(14)70122-X (PubMed 25127232)
  > "during space shuttle missions (7·35 h [SD 0·47] attempted, 5·96 h [0·56] obtained)" · "Crew members on ISS missions obtained significantly less sleep during spaceflight (6·09 h [0·67])"
- Changed vs. BUILD_PROMPT: "~6.5 h in flight" was **not** confirmed; the verified figures are 6.09 h (ISS) and 5.96 h (shuttle).
- AASM/SRS consensus (J Clin Sleep Med 2015, doi 10.5664/jcsm.4758): **not directly verified** — the site blocks automated access.
- "Chronic shortfall is red" (TEAM_CONCEPT §9): **placeholder — not verified**, no sourced number.

### Blood oxygen (SpO2) — 95–100 % normal, under 90 % low · verified
- MedlinePlus, "Pulse Oximetry" — https://medlineplus.gov/lab-tests/pulse-oximetry/
  > "A normal oxygen saturation level ranges between 95% and 100%."
- Mayo Clinic, "Hypoxemia" — https://www.mayoclinic.org/symptoms/hypoxemia/basics/definition/sym-20050930
  > "Healthy pulse oximeter values range from 95% to 100%. Values under 90% are low."
- The source says "low", not "urgent". 90–94 % = Attention is a team mapping.

### Mood 1–5, team climate 1–5, sleep quality 1–5 — team heuristic
- docs/TEAM_CONCEPT.md §9: "Weekly trend matters more than a single value — Sustained decline". Not clinical scales.

### Radiation — verified
- NASA-STD-3001 Volume 1, Revision C (approved 2023-09-15) —
  https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf
  > "[V1 4030] An individual crewmember's total career effective radiation dose due to spaceflight radiation exposure shall be less than 600 mSv. This limit is universal for all ages and sexes."
  > "[V1 4033] For habitable space systems designed to support crew for > 60 days, the program shall protect crewmembers from exposure to the galactic cosmic ray (GCR) environment to less than a NASA effective dose … rate of 1.3 mSv/day for systems in free space and to less than 0.9 mSv/day for systems on planetary surfaces."
- Station 0.731 mSv/day, Moon surface 1.369 mSv/day — Zhang S. et al., Science Advances 2020 — https://doi.org/10.1126/sciadv.aaz1334
  > "LND measured an average dose equivalent of 1369 μSv/day on the surface of the Moon. For the same time period, the dose equivalent onboard the International Space Station (ISS) as measured with the DOSIS 3D DOSTEL instruments was 731 μSv/day"
- Mars transit 1.8 mSv/day, Mars surface 0.67 mSv/day — Southwest Research Institute press release on Hassler et al., Science 2014 (Curiosity RAD) —
  https://www.swri.org/newsroom/press-releases/swri-scientists-publish-first-radiation-measurements-the-surface-of-mars
  > "The RAD surface radiation data show an average GCR dose equivalent rate of 0.67 millisieverts per day from August 2012 to June 2013 on the Martian surface" · "RAD data show an average GCR dose equivalent rate of 1.8 millisieverts per day on the journey to Mars, when RAD measured the radiation inside the spaceship."
- Zeitlin C. et al., Science 2013 — https://doi.org/10.1126/science.1235989
  > "The dose equivalent for even the shortest round-trip with current propulsion systems and comparable shielding is found to be 0.66 ± 0.12 sievert."
- Caveats: daily doses are measurements from specific instruments, periods and shielding (scenario context, not limits). Measured values are dose equivalent; the NASA limit is effective dose. An "Attention" fraction of the career limit has no source → **placeholder — not verified**.

## 2. Not verified (placeholders / team heuristics)
| Item | State |
|---|---|
| Mars one-way communication delay in minutes | no minutes figure on the NASA HRP hazards page (checked 2026-11-15). Shown value 12.5 min is derived: 140 million miles (HRP hazards page) / speed of light = 752 s. The team's "up to 20–22 min" is not verified |
| Moon one-way delay 1.28 s | derived: 384,400 km (NASA Moon Facts, https://science.nasa.gov/moon/facts/) / speed of light |
| Station link "near real-time" | team assumption, no figure cited |
| Mood / team climate "sustained low" (3-day average of 2.5 or lower) | team heuristic |
| Personal-baseline tolerances, exercise gap of 3 days, daily schedule times | team heuristic |
| Chronic sleep shortfall cut-off | placeholder — not verified |
| Radiation "Attention" level before the 600 mSv limit | placeholder — not verified |
| Trend alert length (N days) | team heuristic |
| Combined behavioral rule (sleep + mood + team climate) | team heuristic (TEAM_CONCEPT §6.2) |
| Crew health score formula, streaks, badges | team heuristic |

## 3. NASA resources used
- NASA Human Research Program — 5 hazards: https://www.nasa.gov/hrp/hazards/
- NASA Human Research Program — risks (zone ↔ risk names): https://www.nasa.gov/hrp/risks/
- NASA-STD-3001 Vol 1 Rev C (radiation limits), link above.

## 4. Libraries, fonts, assets
Everything below is stored inside the app folder; nothing is loaded from a network at runtime.

| Item | Version | License | Where | Origin |
|---|---|---|---|---|
| three.js (core, OrbitControls, GLTFLoader, EffectComposer + bloom passes, SkeletonUtils, BufferGeometryUtils) | 0.187.0 | MIT (`vendor/three/LICENSE`) | `vendor/three/` | npm package `three` |
| GSAP + ScrambleTextPlugin | 3.15.1 | GreenSock Standard "No Charge" License, https://gsap.com/standard-license (`vendor/gsap/LICENSE.txt`) | `vendor/gsap/` | npm package `gsap` |
| Apache ECharts | 6.1.0 | Apache-2.0 (`vendor/echarts/LICENSE`, `NOTICE`) | `vendor/echarts/` | npm package `echarts` |
| jsPDF | 4.2.1 | MIT (`vendor/jspdf/LICENSE`) | `vendor/jspdf/` | npm package `jspdf` |
| Archivo (variable font) | — | SIL Open Font License 1.1 (`assets/fonts/Archivo-OFL.txt`) | `assets/fonts/` | Omnibus-Type, via Google Fonts |
| Literata (variable font) | — | SIL Open Font License 1.1 (`assets/fonts/Literata-OFL.txt`) | `assets/fonts/` | TypeTogether, via Google Fonts |
| Body model "Animated Human" by Quaternius | — | CC0 1.0 (public domain) | `assets/models/human.glb` | https://poly.pizza/m/c3Ibh9I3udk |
| App icon, 2D body figure, all icons | — | drawn in code by the build (SVG) | `assets/icon.svg`, `js/figure.js`, `js/ui.js` | this project |

No AI-generated images are used. No NASA logo, insignia or branding is used anywhere.
