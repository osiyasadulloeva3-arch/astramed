# Astronaut Self-Assessment Health Monitor — Solution Concept

**Challenge:** NASA Space Apps 2026 — Health Monitoring Software
**Purpose of this document:** a single reference for the team that links each spaceflight problem to its health consequences, to the feature that addresses it, and to the technology that makes it work in space conditions.

---

## 1. Summary

On long missions (Moon, Mars), astronauts are exposed to space radiation, isolation, altered gravity and a closed, hostile environment. Medical help from Earth becomes slow or unavailable, so astronauts must be able to assess their own health and act on it.

**Our idea:** an offline-first, visual self-assessment tool built around a clickable human figure. Each body zone is linked to a NASA-defined spaceflight risk and shows a traffic-light status (green / yellow / red) calculated from the astronaut's own measurements. Each indicator comes with a plain-language explanation and an action plan, and critical results trigger an escalation package for the flight surgeon on the ground.

---

## 2. The problem space

### 2.1 Five hazards of human spaceflight (NASA Human Research Program)

| # | Hazard | What it means | Why it matters for monitoring |
|---|---|---|---|
| 1 | Space radiation | Invisible exposure beyond Earth's protective shield; one of the most hazardous aspects of spaceflight | Cannot be felt; needs instruments and dose tracking |
| 2 | Isolation and confinement | Small group, small space, long time | Mood, sleep and team tension must be tracked |
| 3 | Distance from Earth | Mars is on average about 140 million miles away; a mission lasts roughly three years instead of a three-day lunar trip | Delayed communication, no resupply, no quick medical care, so the crew must be self-sufficient |
| 4 | Gravity fields | Muscles, bones, inner ear and organs adapt to new gravity levels (on Mars, 3/8 of Earth's gravity for up to two years) | Bone, muscle, balance and cardiovascular changes |
| 5 | Hostile / closed environments | Temperature, pressure, lighting, noise, microbes, immune responses inside the spacecraft | Infections, immune changes, fatigue |

**Important:** the hazards are not independent. They feed off each other and amplify effects on the body, so the tool should show combined risk, not only single values.

### 2.2 Additional pressures on long missions (Canadian Space Agency)

- More time in weightlessness and more radiation exposure.
- Longer isolation, very far from home.
- Larger communication delays.
- Less ability to rely on Earth for food, materials and emergency medical help.
- Effects of weightlessness resemble accelerated aging and the consequences of a sedentary lifestyle.

---

## 3. Problems → consequences → what we monitor → how the tool responds

| Hazard / risk (NASA) | Health consequences | Indicators the astronaut can provide | Tool response (feature) |
|---|---|---|---|
| **Cardiovascular adaptations** (weightlessness alters circulation and heart/vessel function) | Higher risk of cardiovascular events | Blood pressure, resting heart rate, heart rate on standing, fatigue | Heart zone status, trend alert, exercise and rest guidance, escalation on sustained abnormal values |
| **Spaceflight-induced bone changes** | Bones become more brittle, higher chance of painful fractures | Exercise minutes, back or bone pain, diet log | Bone/muscle zone, exercise streak, nutrition and supplement reminders |
| **Reduced cardiorespiratory and musculoskeletal fitness** | Loss of bone density, muscle strength and heart/vessel performance | Daily exercise duration and type, perceived exertion | Exercise tracker, gamified targets |
| **Altered immune responses** | Dormant viruses can reactivate, causing rashes and other symptoms | Body temperature, skin symptoms, general symptoms | Immune/skin zone, symptom checklist, fever thresholds |
| **Host–microorganism interactions** | Skin and gut microbiome changes raise chance of illness | Gut and skin symptoms, hygiene checklist | Symptom checklist, hygiene reminders |
| **Spaceflight Associated Neuro-ocular Syndrome (SANS)** | Structural changes in eyes and brain | Vision test (on-screen chart), headaches | Eyes/head zone, periodic vision check prompt, escalation on vision change |
| **Altered sensorimotor and vestibular function** | Motion sickness, dizziness, poor coordination, difficulty walking or operating vehicles | Dizziness and coordination self-rating | Symptom check, caution advice before critical tasks |
| **Inadequate food and nutrition** | Reduced health and performance | Meal log, blood glucose (mg/dL) | Metabolic zone, nutrition guidance |
| **Behavioral changes and psychiatric disorders** | Psychological toll from isolation, radiation, distance | Daily mood (1–5), stress level | Mind zone, weekly mood trend, support actions |
| **Inadequate sleep and irregular schedules** | Chronic sleep loss, disrupted internal clock | Hours of sleep, sleep quality | Sleep tracker, circadian guidance |
| **Inadequate teamwork** | Miscommunication, team tension, reduced safety | Short team-climate rating | Behavioral risk warning when combined with poor sleep and mood |
| **Radiation-induced cancer** | Higher cancer risk | Accumulated dose from dosimeter (manual entry or device feed) | Whole-body radiation indicator, cumulative dose display |
| **Decompression sickness / hypoxia / spacewalk injury** | Nitrogen bubbles in tissues, low oxygen, fatigue and injury during spacewalks | Pre- and post-spacewalk symptoms, SpO2 if a sensor is available | EVA checklist and symptom check |

---

## 4. How NASA and CSA already approach monitoring (technologies we can mirror)

| Existing approach | Source | What it does | How we reuse the idea |
|---|---|---|---|
| Wrist actigraphy (ARCHeR, Artemis II) | NASA HRP | Measures motion, sleep patterns and light exposure | Sleep and activity module |
| Immune biomarkers | NASA HRP | Blood and saliva analysis of the crew | "Future sample results" input field and immune zone logic |
| Standard Measures | NASA HRP | Consistent set of physiological and psychological measures collected from all crews | Our data model follows a fixed, comparable set of indicators |
| Omics Archive | NASA HRP | Blood, urine, saliva, fecal and cell samples to track molecular-level change | Optional lab-result import |
| Tempus Pro telemedicine device | NASA HRP | Collects and integrates health data, enabling remote near real-time diagnosis | Escalation package for the flight surgeon |
| Canadian Active Neutron Spectrometer (CANS) | CSA | Compact, autonomous instrument measuring neutron radiation; neutrons are about 30% of total radiation on the ISS; CSA awarded a $5.5M contract for continued development | Radiation input from a dosimeter or spectrometer feed |
| B-Complex study | NASA HRP | Tests whether a daily B-vitamin supplement can prevent brain and eye changes | Supplement reminder as an evidence-based action |
| Thigh Cuff study | NASA HRP | Tests tight thigh cuffs to keep fluids in the legs and prevent eye disorders | Listed as a countermeasure in the SANS card |
| Zero T2 | NASA HRP | Studies exercise in space without a treadmill | Exercise guidance for limited equipment |
| Space gardening | NASA HRP | Fresh vegetables as a way to ease isolation | Wellbeing action suggestion |
| AI-powered and augmented-reality health tools on Expedition 75 | NASA | Being tested on the ISS | Supports the direction of guided, interactive self-assessment |

---

## 5. Questions the challenge asks, and our answers

| Question | Our answer |
|---|---|
| Which measurements can be performed in space? | Blood pressure, heart rate, body temperature, blood glucose, sleep hours, mood and symptom checklists, on-screen vision check, exercise log, radiation dose from the onboard dosimeter. All are low-equipment and fit a spacecraft. |
| Why is each exam needed? | Each indicator maps to a NASA-listed risk (see Section 3). Every card explains this in one or two lines. |
| How do spaceflight hazards affect each indicator? | Each indicator card contains a "How spaceflight affects this" section (for example fluid shift and blood pressure, isolation and mood). |
| When should the crew or ground flight surgeons be involved? | When a value enters the red zone, when a yellow trend persists, or when several risk factors combine. The tool then offers an escalation package. |
| What actions prevent a critical condition? | Each card contains an action plan: rest, exercise, nutrition, hydration, supplements where evidence exists, and contacting the surgeon. |

---

## 6. Proposed solution

### 6.1 Main interface

A clickable human figure. Each body zone has a status colour calculated from the latest measurements.

| Zone | Linked NASA risk | Inputs |
|---|---|---|
| Heart | Cardiovascular adaptations | Blood pressure, heart rate, standing heart rate |
| Bones and muscles | Bone changes, reduced fitness | Exercise minutes, pain, nutrition |
| Eyes and head | SANS | Vision check, headache |
| Immune system and skin | Immune changes, microbiome | Temperature, skin and general symptoms |
| Mind | Behavioral risk, sleep, teamwork | Mood, sleep hours, team climate |
| Metabolism | Nutrition | Blood glucose (mg/dL), meal log |
| Whole body | Radiation | Cumulative dose |

### 6.2 Key features

| Feature | Purpose |
|---|---|
| Offline-first operation | Responds to the "distance from Earth" hazard; works with no connection |
| Indicator cards | Four blocks: how to measure, why it matters, how spaceflight affects it, what to do |
| Traffic-light status | At-a-glance interpretation |
| Personal baseline | Compares against the astronaut's own pre-flight norm, not only general ranges |
| Trend alerts | Warns when a value drifts in one direction even if still "green" |
| Combined-risk rules | For example poor sleep + low mood + team tension raises a behavioral warning |
| Environment switch | Station / Moon / Mars changes thresholds and advice |
| Measurement schedule | Reminders as part of the mission routine |
| Gamification | Streaks, badges, crew health score |
| Escalation package | Exportable report for the flight surgeon, to be sent when a channel is available |

---

## 7. Architecture: what is responsible for what

| Layer | Responsibility | Components |
|---|---|---|
| **UI** | Show status, explain, interact | SVG human figure, indicator panel, indicator card, trend charts, environment switch |
| **Input** | Collect health data | Measurement form, symptom checklist, optional camera input (experimental), demo dataset |
| **Rules engine** (core) | Turn data into status and advice | Thresholds (JSON), personal baseline, trend analysis, combined-risk rules, environment adjustments, escalation logic |
| **Knowledge** | Explain and advise | JSON content: measure / why / spaceflight effect / action, mapped to NASA risks |
| **Storage** | Keep history locally | LocalStorage or IndexedDB; JSON/PDF export |
| **Engagement** | Keep the crew using it | Streaks, badges, score, scheduled reminders |

---

## 8. Implementation options

| Option | Technologies | Pros | Cons | Best when |
|---|---|---|---|---|
| **1. No-build web app** | HTML, CSS, JavaScript, SVG, Chart.js | Single file, runs immediately, easy to demo | Less structure as it grows | Solo or very limited time (recommended for the hackathon) |
| **2. React app** | React, Vite, Recharts or D3, Tailwind, Zustand | Components, easy to split work | Longer setup | Team of 2–4 wanting clean architecture |
| **3. Python dashboard** | Streamlit or Dash, Plotly, Pandas | Fast charts and logic | Weak for a clickable figure and animation | Team strong in Python |
| **4. PWA layer** | Service Worker, web manifest on top of 1 or 2 | True offline use, supports the autonomy argument | Extra setup | Add at the end if time remains |

### Technology by task

| Task | Technology |
|---|---|
| Figure and animation | SVG with CSS animations (GSAP or Framer Motion optional) |
| Charts | Chart.js (simplest), Recharts or D3 (more flexible) |
| State | Plain JS object (option 1) or Zustand (React) |
| Offline | Service Worker and PWA manifest |
| Camera input | getUserMedia with MediaPipe or TensorFlow.js; experimental only (e.g., pulse from face video) |
| Export | jsPDF or print stylesheet |
| Visual design | Dark space-style theme, high-contrast traffic-light colours |

---

## 9. Reference indicators and thresholds

These are general Earth-based reference ranges, shown as **placeholders to be verified** against NASA medical standards or a physician. Spaceflight can shift normal values.

| Indicator | Reference range | Attention |
|---|---|---|
| Resting heart rate | 60–100 bpm | Persistent values outside the range |
| Blood pressure | About 120/80 | From about 140/90 |
| Body temperature | 36.1–37.2 °C | From about 38 °C is red |
| Fasting blood glucose | 70–99 mg/dL | Values outside the range |
| Sleep | About 7–8 h average | Chronic shortfall is red |
| Mood (1–5) | Weekly trend matters more than a single value | Sustained decline |

---

## 10. Details and constraints to account for

| Area | Consideration |
|---|---|
| Mission context | Risks differ for low Earth orbit, the Moon and Mars; choose and state the scenario |
| Communication delay | Software must work without Earth; escalation data is prepared and sent later |
| Standardisation | Use a fixed, comparable indicator set (as NASA Standard Measures does) |
| Interacting hazards | Show combined risk, not isolated values |
| Crew burden | Small crew, little time: measurements must be short and simple |
| Radiation | Needs specialised sensors; neutron radiation is a separate, especially harmful component |
| Non-expert users | Do not assume astronauts know how to assess health; keep instructions simple |
| Accuracy | Camera-based measurements are limited; present as a supplement |
| Safety wording | Mark all guidance as informational, not a medical diagnosis |
| Data privacy | Medical data of astronauts is sensitive; keep it local by default |
| Benefit on Earth | Space health research also helps with osteoporosis, balance problems, cardiovascular disorders and type 2 diabetes (CSA) |

---

## 11. Work split and timeline

| Role | Tasks |
|---|---|
| Frontend / design | Figure, cards, charts, animations |
| Logic | Rules engine, thresholds, trend analysis, demo data |
| Content / presentation | Texts for each indicator and risk, final pitch |
| Solo path | Data and rules → figure → charts → texts → presentation |

**Minimum strong demo:** coloured figure, trend chart, explanation cards, and one combined-risk rule in action.

**Suggested order:**
1. Define 6–8 indicators with thresholds and card texts.
2. Build the interface (figure, status colours, chart, card).
3. Add the input form and 14 days of demo data.
4. Implement rules and recommendations.
5. Prepare the pitch: answer the five challenge questions and show one "day in the life of a crew member" scenario.

---

## 12. Sources

- NASA HRP — Five Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA HRP — Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- NASA HRP — Ongoing Research: https://www.nasa.gov/hrp/ongoing-hrp-research/
- NASA — Humans in Space: https://www.nasa.gov/humans-in-space/
- Canadian Space Agency — Monitoring radiation for astronaut health: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Canadian Space Agency — Why do we conduct science experiments in space?: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- NASA Space Apps Challenge 2026 — Health Monitoring Software (challenge text provided by the team)
