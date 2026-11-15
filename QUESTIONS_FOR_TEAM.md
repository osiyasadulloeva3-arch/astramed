# QUESTIONS FOR TEAM LYRA

Things the concept does not fix, or numbers that could not be verified. For each one the app uses the simplest
reading (written below) so the build is not blocked. Change the answer → change one line in `data/thresholds.json`.

## Thresholds
1. **Blood pressure, Attention tier.** TEAM_CONCEPT §9 says "from about 140/90". AHA calls 130–139 / 80–89
   "Stage 1 hypertension". *Used now:* Attention from ≥ 140 or ≥ 90 (the team's number); the AHA category name is
   shown next to the value. Should Stage 1 already be Attention?
2. **"Hypertensive crisis" wording.** The AHA page now says "Severe hypertension" (no symptoms) and "Hypertensive
   emergency" (with symptoms) for > 180 and/or > 120. *Used now:* the current AHA wording.
3. **Sleep in flight "~6.5 h".** Not confirmed. The NASA-funded study (Barger 2014, Lancet Neurology) reports
   6.09 h on ISS and 5.96 h on shuttle missions. *Used now:* 6.09 h / 5.96 h with the citation.
4. **Chronic sleep shortfall = red.** No sourced number. *Used now:* shown as "placeholder — not verified";
   rule = 7-day average under 6 h → Critical. Confirm or give a number.
5. **AASM sleep recommendation.** The AASM site blocks automated access, so the sentence was not read directly.
   CDC gives the same "7 or more hours" and is the cited source. Someone can open
   https://jcsm.aasm.org/doi/10.5664/jcsm.4758 by hand to confirm.
6. **Radiation Attention level.** NASA-STD-3001 gives only the 600 mSv career limit. *Used now:* Attention when
   cumulative dose passes 50 % of the limit — labelled "placeholder — not verified". Confirm or change.
7. **Glucose, high side.** No verified single "critical high" value for a fasting reading. *Used now:* ≥ 100 mg/dL
   = Attention (never Critical); < 54 mg/dL = Critical.
8. **Resting heart rate.** No verified critical value. *Used now:* outside 60–100 bpm = Attention only.
9. **Temperature 37.3–37.9 °C and SpO2 90–94 %.** Sources give only the normal range and the fever / low cut-off.
   *Used now:* the gap between them = Attention (team mapping).

## Facts
10. **Mars communication delay in minutes.** docs/RULES_AND_FACTS.md says "~20–22 min one way". The NASA HRP
    hazards page (https://www.nasa.gov/hrp/hazards/, read 2026-11-15) has no minutes figure, only "Mars is, on
    average, 140 million miles from Earth". *Used now:* 12.5 min one way, calculated from that distance and the
    speed of light (752 s) and labelled "calculated from a sourced distance". "Up to 20–22 min" stays unverified —
    please give an exact NASA link if you want that number shown.
11. **Moon delay.** *Used now:* 1.28 s one way, calculated from 384,400 km (NASA Moon Facts). Station = "near
    real-time" (team assumption, no figure cited).

## Product decisions (concept is silent)
12. **Trend alert length.** *Used now:* 7 days drifting the same way and at least a set distance from the personal
    baseline (team heuristic).
13. **Combined behavioral rule numbers.** *Used now:* 3-day averages: sleep < 7 h and mood ≤ 2.5 and team climate
    ≤ 2.5 (team heuristic).
14. **Crew health score formula.** *Used now:* 100 minus penalties per zone (Attention −8, Critical −20), floor 0
    (team heuristic, shown as such).
15. **Vision check.** *Used now:* a simple on-screen grid + near-text self-check, marked "screening only".
16. **Fictional astronaut name / mission.** *Used now:* "A. Rahimi, Mission Lyra-1" — clearly fictional. Rename freely.
17. **Mood / team-climate "sustained low".** *Used now:* 3-day average of 2.5 or lower = Attention (team
    heuristic). When the combined rule (item 13) fires, the separate mood and team-climate alerts are folded into
    the one "Combined risk" alert so the crew member is not warned three times for the same thing.
18. **Blood pressure "Elevated" (120–129).** *Used now:* shown as the AHA category name and as a shaded band on
    the chart, but it is not a status by itself; the demo reading 128/79 is Attention because of the 7-day trend.
19. **Immune zone is Critical in the demo.** The demo story needs one red zone; a fever of 38.1 °C plus a reported
    skin rash was chosen. Change the demo story freely (`data/demo.js`).
20. **Stress level (concept lists it next to mood).** Not a separate input: mood, sleep quality and team climate
    are asked. Add a 1–5 stress question?
21. **SpO2 and standing heart rate.** SpO2 sits in the Heart zone. Standing heart rate is recorded and charted but
    has no status (no sourced range).
22. **Exercise.** *Used now:* no exercise logged for 3 days = Attention in the Bones zone (team heuristic), with a
    "Log now" button.
23. **Daily schedule times** (measure, exercise, check-in, sleep) are team placeholders, not a mission timeline.
24. **Mission day** is fixed at day 60 of a fictional mission; "today" does not follow the real calendar.
25. **Vision self-check.** Amsler-style grid plus rows of letters, each eye, two answers ("no change" /
    "worse than reference"). A "worse" answer gives Attention, never Critical. Screening only.
26. **Product name.** The team named the product **AstraMed** (message from the lead, round 3). The team stays "Lyra";
    the fictional demo mission stays "Lyra-1". Live address expected at `https://osiyasadulloeva3-arch.github.io/astramed/`
    (Open Graph tags and README point there; the builder does not publish).
27. **Own crew file and the calendar.** A crew file made on the device starts on mission day 1 on the day it is
    created, and each real day adds one empty record. A day without a check-in stays empty (no invented values).
    Simple reading used: the device clock is the mission clock. The team may want a manual "mission day" field.
28. **Baseline is optional.** A new crew file may leave pre-flight values empty; then only the sourced reference
    ranges are used, and the personal-baseline and trend rules stay silent. Until seven days are logged the app
    says "Building your baseline: N of 7 days". Seven is a team-heuristic number chosen by the builder to match
    the seven-day trend window; please confirm.
29. **Sound.** Browsers allow audio only after a click or a key press, so with sound remembered as "on" the motif
    plays on the first interaction, not during the power-up animation. The motif and the tones were chosen by
    the builder; nobody on the team has listened to them yet. The two-tone Critical signal plays once when a new
    unacknowledged Critical alert appears (not on every page load).
30. **Guided tour** (optional item 5 of round 3) was not built: the lead dropped it to meet the earlier freeze.
31. **Welcome greeting.** The welcome card says "Salom, Rahimi." as asked. It greets the demo crew member, not
    the visitor; after a visitor starts an own file the confirmation says "Salom, <their name>".
