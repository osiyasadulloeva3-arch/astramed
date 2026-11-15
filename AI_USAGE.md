# AI usage — AstraMed

**Idea, concept and feature list: team Lyra** (`docs/TEAM_CONCEPT.md`). The AI did not invent the solution or
add major features; where the concept was silent, the simplest reading was used and written down in
`QUESTIONS_FOR_TEAM.md` for the team to decide.

**Built with Claude Code (Anthropic).** The AI assistant was used for:

- writing the application code (HTML, CSS, JavaScript), the rules engine and its tests;
- the visual design direction (`DESIGN.md`) and the coded SVG drawings and icons;
- reading the public source pages for each threshold and copying the exact quotes into `SOURCES.md` and
  `data/thresholds.json` (checked on 2026-11-15); numbers that could not be confirmed are marked
  "placeholder — not verified" or "team heuristic" in the app;
- writing the fictional demo data and the project documents (`README.md`, `SOURCES.md`, this file);
- testing in a browser with screenshots.

**Not AI-generated:** the 3D body model ("Animated Human" by Quaternius, CC0), the typefaces (Archivo, Literata,
OFL 1.1) and the libraries (three.js, GSAP, Apache ECharts, jsPDF). There are no AI-generated images, audio
recordings or video in the app. No NASA logos or branding are used.

The team should review every number and text before presenting; medical content here is decision support for a
prototype, not medical advice.

## Round 3 (Guide, own crew files, sound, signature)

The ideas for this round came from a team member: a Guide page, real local-first crew files with data controls,
synthesised sound, and a Tajik signature. The AI assistant (Claude Code) wrote the code and the texts for them.

- **Sound.** There are no audio files and no AI audio generator was used. Every tone is produced at runtime by
  the Web Audio API from the code in `js/sound.js`, which the AI assistant wrote. The six-note motif
  (D, A, B, G, E-flat, D: a mode on D with a lowered second and a raised sixth) was chosen by the AI assistant
  as "Shashmaqam-inspired"; it is not a quote from any existing melody. The team should listen and decide
  whether it sounds right to them.
- **Seven-star arc and ornament line.** Drawn in code as SVG by the AI assistant. The arc is an abstract mark;
  it does not copy the state emblem or the flag. The ornament is a simple stepped-diamond and rosette pattern
  inspired by adras and suzani, not a copy of a specific textile.
- **Guide thumbnails** are screenshots of the app itself.

## Round 4 (light theme, declutter, EN | RU)

- **Light theme, simpler layout.** Colours, the Light/Dark toggle and the reduced main screen were made by the AI
  assistant from the team member's request ("everything is black", "remove everything extra").
- **Russian translation.** All Russian text (about 950 dictionary entries in `data/i18n/ru.json`, including the
  alert wording, rule explanations, zone cards and the Guide) was written by the AI assistant. Nobody on the
  team has proofread it yet; the medical wording in particular should be read by a Russian-speaking person
  before it is relied on. Source quotes were not translated.
