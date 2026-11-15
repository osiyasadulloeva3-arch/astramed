# STATUS (builder → lead / owner)

## Step 0 — preparation · 2026-11-15 12:40 (Dushanbe)
- **Read fully:** BUILD_PROMPT.md, docs/TEAM_CONCEPT.md, docs/RULES_AND_FACTS.md, KICKOFF_0.md, KICKOFF_1.md;
  skills frontend-design, emil-design-eng, animate, choreograph, review-animations, web-design-guidelines.
- **Verified on the web (verbatim quotes in SOURCES.md, data in data/thresholds.json):** resting HR 60–100 (AHA,
  MedlinePlus); BP categories (AHA); temperature 36.1–37.2 / fever 38.0 (MedlinePlus, CDC); fasting glucose
  <100 / 100–125 / ≥126, low <70, level 2 <54 (ADA); sleep ≥7 h (CDC); SpO2 95–100, <90 low (MedlinePlus, Mayo);
  radiation 600 mSv career limit + 1.3 / 0.9 mSv/day design limits (NASA-STD-3001 Vol 1 Rev C); daily dose
  ISS 0.731, Moon 1.369 (Zhang 2020), Mars transit 1.8, Mars surface 0.67 mSv/day (Curiosity RAD, SwRI).
- **Differs from BUILD_PROMPT §4:** in-flight sleep is 6.09 h (ISS) / 5.96 h (shuttle), not ~6.5 h; AHA no longer
  says "hypertensive crisis" (now "severe hypertension" / "hypertensive emergency"); SpO2 source says "low", not "urgent".
- **Not verified:** AASM sentence (site blocks bots; CDC used instead); Mars comm delay minutes; chronic sleep
  cut-off; radiation Attention %; → marked placeholder / team heuristic. 15 questions in QUESTIONS_FOR_TEAM.md.
- **Next:** KICKOFF_1 — DESIGN.md + features.json, vendor libs, then build feature by feature.

## Milestone 1 — all features built and checked in the browser · 2026-11-15 14:00
- **Done:** all 23 items in features.json are now `passes: true` (22 flipped at 14:00, each after a browser check);
  README.md, SOURCES.md (with licenses), AI_USAGE.md, QUESTIONS_FOR_TEAM.md (25 items); 17 screenshots in docs/screenshots/;
  10 local commits, 0 remotes, nothing pushed or deployed.
- **Evidence (scripts in headless Chrome at 1440, 390 and 375 px, console empty in every run):**
  rules tests 13 passed; fresh load = day 60, 7 metrics, 60 days; reset restores demo; hover/click on 3D zones opens the right card,
  61 fps; all 7 zone cards with guide blocks, tiered actions, sources; charts switch 7 / 30 / All; acknowledge and environment persist
  after reload; Station "near real-time" / Moon 1.3 s / Mars 12.5 min one way; check-in rejects 77 °C ("Must be between 30 and 43"),
  valid save moves score 64 → 76; vision check records; PDF = 2 pages (%PDF-1.3, 18 kB) + JSON; blackout queues the report, link
  restore marks it sent (simulated); offline reload works, 78 requests all 127.0.0.1 or data:; reduced motion shows 2D figure;
  Tab order and Enter work; contrast scan of all visible text = 0 failures; tap targets < 44 px = none;
  Lighthouse accessibility 100 desktop / 100 mobile (run before the last small label change, not re-run after it).
- **Lead's open notes:** stray dots on the cue card and the "Whole body, radiation" label under the ring marker were both fixed in
  commit 677473c and confirmed on screenshots (docs/screenshots/cue-whole-1440.png, main-1440.png).
- **Honest gaps:** Mars delay "12.5 min" is calculated (140 million miles / c), the HRP page gives no minutes figure — labelled
  "calculated" in the app, question 10 for the team. `review-animations` skill is not available in this session; a short manual motion
  check will replace it. Not tested on a real phone or in Safari/Firefox, only headless Chrome.
- **Next:** one reviewer round (single subagent), fix cheap defects, final checks, freeze.
- **ETA:** demo-ready (features pass + reviewer round + fixes) about 15:00; freeze about 15:30. Target was 16:30 / 17:30.
- **Blockers:** none.

## Final — reviewer round done, frozen · 2026-11-15 14:15
- **Done:** one reviewer round (single subagent, no others). Scores: design quality 8, originality 8, craft 7, functionality 8.
  No banned items found (fonts, gradients, eyebrow labels, arrows, numbering, emoji, NASA marks). All 8 defects it listed were cheap
  and are fixed: trend sentence in the report said "about 1.5 °C" for 36.7 → 38.1 (now 1.4); zone-card tabs now carry the status word;
  "team heuristic" stamp is visible next to the crew health score; on a phone the zone lamps come before the body, so status is never
  colour-only on the first screen; callout labels no longer touch the panel edge; lamp says METABOLISM; check-in title uses the serif
  like the other sheets; immune marker moved from the forearm to the upper chest (2D figure too).
  Extra: idle Master Caution legend contrast raised after Lighthouse flagged 2.69.
- **Evidence after the fixes (headless Chrome, 1440 / 390 / 375 px, console empty in every run):** rules tests 13 passed;
  hover.mjs (immune click opens the right card, 61 fps); verify.mjs (offline reload: service worker activated, 78 requests, all
  127.0.0.1 or data:; reduced motion → 2D figure, 7 zones; keyboard; no overflow); verify2.mjs (all zones and tabs, contrast scan
  0 failures on main, card, check-in, report, sources and at 375 px; no tap target under 44 px); dlg_shot.mjs (validation, save,
  score 64 → 76, vision check, PDF 2 pages + JSON, queued → sent simulated); Lighthouse accessibility 100 desktop / 100 mobile.
  features.json 23 / 23 pass. Screenshots: docs/screenshots/ (17 files, refreshed after the fixes where the screen changed).
- **Gap to the target:** craft is 7, below the 8 asked for. The reviewer's craft notes are all fixed, but the fixes were not
  re-scored (only one round was allowed), so 7 is the last measured number.
- **Not done / not checked:** no test on a real phone, Safari or Firefox (headless Chrome only); `review-animations` was not run as a skill (it is not in this
  session's skill list, although its file is in .claude/skills/) — replaced by a short manual check (boot runs once, about 2.3 s; press 160 ms, hover 180 ms, card in
  320 ms / out 200 ms; only Critical pulses; reduced motion skips the boot); web-design-guidelines was a spot check by grep, not a
  full written audit; Mars delay 12.5 min is calculated, not quoted from a source (labelled in the app, question 10);
  25 open questions for the team in QUESTIONS_FOR_TEAM.md; the reviewer did not read boot-2.png, reduced-1440.png or the whole
  knowledge.json.
- **Git:** local commits only, 0 remotes, nothing pushed or deployed.
- **Blockers:** none. Builder stops here.

## Publishing prep (lead's request) · 2026-11-15 14:25
- **Done:** .gitignore now excludes .claude/, KICKOFF_*.md, BUILD_PROMPT.md; they were removed from the git index (files stay on
  disk). They are still in the earlier commits of the local history — a push of the full history would publish them.
- **Evidence (subpath):** app served at http://127.0.0.1:8766/lyra-app/ (temporary second server, stopped after the test): first
  load 7 lamps + 3D body; service worker activated with scope /lyra-app/; manifest start_url resolves to /lyra-app/index.html and
  scope to /lyra-app/; offline reload of the bare folder URL works (40 requests served offline, chart opens, 2 fonts loaded);
  0 requests outside /lyra-app/ or data:; console empty. No absolute "/..." paths in HTML, CSS, JS or the manifest (grep).
- **Not checked:** the real GitHub Pages host (only a local subpath server).
- **Note:** the builder adds no remote and pushes nothing. KICKOFF_1 says "No remote, no push, no deploy" and the owner's rule is
  "never push without the user's explicit yes", so publishing needs the owner's own yes.
FROZEN 14:14 5f4f6a5

## Polish round (KICKOFF_2_POLISH.md) · 2026-11-15 15:19
Итог: 9 из 10 пунктов сделаны, каждый отдельным коммитом и проверен в браузере на 1440×900 и 390×844 с пустой консолью; пункт 10 (голова) пропущен как рискованный.
- **1 + 2 (`9a4758f`, one commit because both live in the same lines):** Immune & Skin marker moved to the right upper arm, Heart marker
  further onto the anatomical left chest, head markers spread. The radiation marker now stays at the front right of the ring
  whatever the body's turn, and its label sits above the ring. Measured over the idle sway at 1440×900: smallest distance
  between two markers 63–65 px, no marker inside any label box. 2D fallback figure: smallest distance 64 px.
- **3 (`16cde82`):** subtitle under the title and an "About" link in the top bar (opens Sources and limits). Wording deviation:
  written as a sentence, "Astronaut self-assessment health monitor by team Lyra for NASA Space Apps 2026. Fictional demo data.",
  because the "A · B · C" form is on KICKOFF_1's banned list. No overflow at 1440, 1290, 1100, 390.
- **4 (`47494d2`, count tuned in `0cc7324`):** bottom fade with "3 more alerts below" on the alert column and "More below" on the
  zone card; it disappears at the end of the scroll.
- **5 (`8552f00`):** the "R" box was decoration (radiograph side marker), removed.
- **6 (`0cc7324`):** Master Caution is a full-width bar under the seven zone lamps, separated by a rule; Radiation spans the row
  so the grid has no empty cell. Acknowledge checked: armed → "1 critical acknowledged", 0 unacknowledged lamps.
- **7 (`82935fd`):** switching the environment shows a toast, e.g. "Lunar surface base. Earth link: 1.3 s one way. Radiation dose:
  80.8 mSv.", and a 1.2 s flash on the Earth-link and radiation readouts. With reduced motion only the toast appears.
- **8 (`43db08c`):** Open Graph and Twitter tags, docs/og-image.png (1200×630), assets/icon-192.png next to the SVG icon (also in
  the manifest). Deviation: og:image and og:url use the absolute Pages URL, because link scrapers do not resolve relative ones;
  if the repo name changes, these two tags must change too. The page itself still makes 0 requests outside its own folder.
- **9 (`fbcce75`):** README opens with the live link, the main screenshot and five lines on what the app does.
- **10 skipped:** normals are already smoothed (js/body3d.js, mergeVertices + computeVertexNormals); the facets come from the
  low-poly model itself, and a head-only shader change was judged risky.
- **Evidence after all items:** rules tests 13 passed; hover.mjs (click on the moved immune zone opens "Immune system and skin",
  61 fps); verify2.mjs (contrast 0 failures on main, card, check-in, report, about and at 375 px; no overflow; no small targets;
  logs empty); verify.mjs (Station / Moon / Mars values, acknowledge, offline reload with requests only to 127.0.0.1 and data:,
  reduced motion, keyboard order; logs empty); Lighthouse accessibility 100 desktop / 100 mobile.
- **Screenshots:** docs/screenshots/main-1440.png, main-390.png, cue-heart-1440.png, reduced-1440.png (refreshed), docs/og-image.png.
  The other 13 files in docs/screenshots/ were taken before this round (they still show the "R" box and the old Master Caution tile).
- **Not checked:** real phone, Safari, Firefox; a real link preview in a messenger; which commit is on the published page (the
  live link answered 200 at 15:08, published by the lead, not by the builder); the subpath test was not repeated after this round.
- **Known gap:** the right column still cuts "Reset demo data" at 900 px height without a hint (a fade there would cover the
  report button). The time stamps 14:15 and 14:25 in the two blocks above were estimates; the real times were about 14:11 and 14:14.
- **Git:** local commits only, 0 remotes, nothing pushed by the builder.
FROZEN 15:19 551c444

## Round 3 (KICKOFF_3_REAL.md), in progress
- 16:04 Guide page `910e289`; rename to AstraMed `340ead2`; crew files + Data + welcome card `b3e0acb` (F25); sound (F26) in this commit. Each checked at 1440x900 and 390x844 with console 0.
- Next: Tajik signature, docs, regression + offline, FROZEN line by 17:30. Guided tour skipped (lead's call).

## Round 3 result (KICKOFF_3_REAL.md, freeze moved to 17:30 by the lead)
- **1 Guide (`910e289`, F24):** guide.html + css/guide.css, five thumbnails cut from the app (assets/guide/*.jpg, retaken at the end of the round).
- **Rename (`340ead2`):** product AstraMed, team Lyra, demo mission Lyra-1.
- **2 Crew files and data (`b3e0acb`, F25):** welcome card ("Explore the demo mission" / "Start my own crew file"), own crew file with an
  optional pre-flight baseline, day 1 = the day the file is started, several files with a switcher, export of all files to one JSON,
  import checked value by value (one bad value refuses the whole file), delete with a confirmation, reset of the demo mission.
- **3 Sound (`3cfe888`, F26):** js/sound.js, Web Audio only, off by default, speaker button in the top bar, choice remembered, paused when
  the tab is hidden. Six-note motif (D A B G E-flat D), low pad with a pulse at today's resting heart rate, tick on a new zone, tone on a
  zone card, chime on a saved check-in, two-tone annunciator once for a new unacknowledged Critical alert, silenced by Acknowledge.
  Attention alerts are silent.
- **4 Tajik signature (`f52e9f0`, F27):** "made by team Lyra in Dushanbe, Tajikistan" (footer, About, Guide), seven four-point stars in
  an arc that light with the seven zone lamps, ornament line in the Guide and on the report sheet, "Salom, Rahimi." on the welcome card.
- **5 Guided tour:** not built (lead's call).
- **Found and fixed in the closing check (this commit):** at 1440 and 1366 the "Crew health score" label ran 30 px out of its box into
  "About" and the brand text was squeezed into four lines. The top bar now has two rows below 1580 px (brand above, controls below);
  measured at 1081, 1100, 1180, 1280, 1366, 1440, 1580 and 1600: no overlap, no page overflow. Guide button 40 -> 44 px high.
  Two accessibility findings fixed: the crew button is now named by its visible text, the Guide home link has a name on phones.
- **Evidence at the end:** rules tests 13 passed; verify.mjs, verify2.mjs, goff.mjs, hover.mjs exit 0 with empty console logs
  (Station / Moon / Mars values, acknowledge, contrast 0 failures on five screens and at 375 px, keyboard order, reduced motion,
  offline reload of index.html and guide.html, 61 fps); crewui.mjs (real clicks: export of 2 files to astramed-crew-files-2026-11-15.json,
  import replaced 2, a 99 °C value and a non-JSON file refused with "Nothing was imported", switch, delete with confirmation, reset,
  offline reload with sound.js and crew.js); subpath.mjs + sub2.mjs under /lyra-app/ (service worker scope, offline app, Guide, sound,
  crew sheet, 0 requests outside the folder); Lighthouse accessibility 100 for the app (desktop and mobile) and 100 for the Guide
  (desktop and mobile) with no failing audits; sw.js precache 60 files.
- **Screenshots (docs/screenshots/):** main-1440, main-390, welcome-1440, sound-on-1440 retaken after the top bar fix; welcome-390,
  crew-new-1440, crew-data-1440, crew-day1-1440, sound-on-390, report-1440, report-390 are from earlier in the round (the three 1440
  ones show the old one-row top bar behind the sheet). docs/og-image.png retaken.
- **Not checked:** how the sound is heard by a person (only frequencies and output level were measured, headless Chrome was muted);
  Safari, Firefox, a real phone; a real link preview; the published page (the lead publishes).
- **Known gaps:** the ornament is on the report sheet, not inside the PDF file; an own crew file follows the real calendar of the
  device (QUESTIONS_FOR_TEAM #27); the 7-day "building your baseline" counter is a team heuristic (#28); "Salom, Rahimi." greets the
  demo crew member only (#31); the right column still cuts "Reset demo data" at 900 px height without a hint.
- **Git:** local commits only, 0 remotes, nothing pushed by the builder.
- **Кратко по-русски.** Сделано: страница Guide, свои файлы экипажа с экспортом / импортом / удалением / сбросом и переключателем,
  звук (выключен по умолчанию), таджикская подпись (семь звёзд, орнамент, «Dushanbe, Tajikistan», «Salom»), исправлена шапка на 1440.
  Не сделано: тур по интерфейсу (решение lead), орнамент внутри PDF. Не проверено: звук на слух, Safari / Firefox, реальный телефон,
  опубликованная страница.
FROZEN 16:24 0f0b659
