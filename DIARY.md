# Biome Bash — build diary

> Five toony fighters, five wild biomes — last toon standing.
> A Smash-style platform brawler: you pick one fighter, the engine's CPU brains
> run the other three, and every arena is a different biome.

### Day one — scaffolded from the engine (2026-06-12)
- Created with `new-game --local` off `engine/game-template`: the Phaser 4 +
  Studio SDK base, already wired to the whole stack (server/store · eval
  stepper · notes → diary → issues).
- Concept locked: **brawler** archetype (the engine's 6th genre), theme
  **variety** — Clouds · Jungle · Volcano · Glacier · Neon City, one home
  fighter per biome: **Puff, Mango, Cinder, Glacia, Volt**.

## Three engine investments this game funded
**`Studio.Toon`** — procedural toony character rigs: a chibi body baked from a
palette def (shape + accessories: ears/horns/antenna/crest/tail/tuft/visor/leaf),
floating Rayman hands and feet, a full face (eyes/pupils/brows/five mouths,
deterministic blink), and a **17-state animation machine** (idle/run/jump/fall/
flip/land/jab/airjab/heavy/special/hit/tumble/shield/frozen/taunt/victory/defeat)
driven by accumulated fixed-step time — sprite-sheet-free, replay-identical, and
every future game inherits it.

**`Studio.Brawl`** — the brawler archetype: damage % + knockback scaling with
weight, frame-data attacks (startup/active/recover) with per-fighter overrides,
specials on an `onFrame` hook (projectiles/dashes/slams stay in fixed frames),
stocks + blast-zone KOs with respawn invulnerability, one-way floating
platforms, deterministic power-up drops (heal/power/speed/shield/bomb), soft
air-DI in hitstun, sudden-death anti-stall — and **one CPU brain, tiered by iq
presets** (scrapper/bruiser/champion) that is BOTH the rival AI and the gate
autopilot.

**`Studio.RNG` + Juice surfaces** — seeded xorshift32 (gameplay randomness is
never `Math.random`, so whole matches replay bit-identically), plus new Juice:
expanding shockwave **rings**, directional **sparks**, floating combat **pop**
text, **confetti**, attachable **trails**, and a brawl SFX set.

## The gate, translated for a brawler — twice
First translation: **flawless victory** — the champion autopilot must win every
arena 1v3 without losing a stock. It worked (seed-scanning found flawless
authored matches), but the owner called it mid-build: *"it's ok to lose a few
times — use a better gate to maximize fun."* He was right — a 3-stock sweep is
sterile; a comeback is a story.

Second translation, the one that shipped: the **Brawl felt-fun gate**
(`Studio.Brawl.fun`, the felt-fun heritage landing in a second genre). A match
is scored 0–100 from its deterministic event log:
- **action** — hits per second of fight time,
- **flow** — no dead air between beats (KOs + heavy launches),
- **arc** — the final KO lands late (the climax),
- **closeness** — an earned win beats a sweep; surviving past 90% damage counts
  as a comeback (falls are *good* now — the gate prefers a 1-stock-left win),
- **variety** — specials flew, items mattered, KOs were shared around,
- needing sudden death costs 15% (the match wasn't flowing).

`npm run eval` passes an arena when the champion **wins** (falls allowed), the
match scores **FUN ≥ 70**, two fresh 700-step runs are bit-identical, and the
headless readback is non-black — on BOTH renderers. Arena seeds are then
*authored matches*: the seed scanner replays candidates and bakes the
highest-FUN winner into the level data, where determinism makes it permanent.

## Phaser 4 gotchas the engine now knows
- **Persistent `Graphics` objects and camera GPU filters crash the WebGL
  renderer when Containers are in the display list** (`null.resolution` deep in
  the render pass). Fix: bake all panels/strokes to textures (`BAKE_CARD`), skip
  filters in container-heavy scenes.
- **Re-baking a texture a live rig is using crashes the renderer** — Phaser
  keeps no refcount. `Studio.Toon.bake` is now idempotent per character key.

## Teaching the CPU not to die (the autopsy loop)
A flight recorder (`window.__tape`, last 110 player frames, dumped per KO) +
`trace.mjs`/`autopsy.mjs` turned every champion death into a diagnosis:
- **Jump latch** — CPUs held the jump key forever, so air jumps never
  re-triggered. Fix: pulse the key (latch needs releases).
- **Edge strolls** — spacing back-offs walked fighters off the stage. Fix:
  grounded edge clamp (launches are the only exit).
- **Under-slab trap** — recovery steered to the slab CENTRE, wedging fighters
  underneath. Fix: ledge-style recovery (climb beside the face).
- **Face oscillation** — "hold just outside the face" jittered around the hold
  point and sank. Fix: steer flush INTO the face; the wall pins you while jumps
  rise you, and the same steering pops you over the lip.
- **Power-star murders** — a 1.95× knockback rival one-shot the champion at
  16%. Fix: champion-tier read — flee any power-buffed rival within 260px.
- **Frozen over the void** — an 80-frame air freeze was a guaranteed KO;
  air freezes now run at 35%.
- Plus: ledge-mercy (one bonus recovery jump per airtime when spent), rival
  stocks 2 vs your 3 (the classic 1-v-many handicap), endgame aggression
  (no 1v1 zoning stalls), sudden death at 2:00.

## The headless unlock (engine investment)
Scanning for authored max-FUN matches meant simulating whole 110-second matches
over and over — and under software GL each one rendered ~7,000 frames at a crawl
(~100s each). A full 5-arena seed scan was a **6-hour** job.

The fix landed in the SDK: a **sim-only headless mode**. `?r=headless` boots
Phaser HEADLESS, and two engine changes make the procedural-art game survive
having no renderer — `Studio.Textures.bake` skips `generateTexture` when
`Studio._headless` is set (Phaser falls back to a placeholder texture; pixels are
never shown anyway), and `Studio.harness` stubs a no-op renderer so `game.step()`
runs the update loop (physics + brawl logic + the event log) without a render
pass. The deterministic sim is **byte-identical** to a rendered run — arena 1
seed 7 returns the same won/falls/frame/KOs and the same FUN 100 either way — but
runs in **1.5s instead of ~100s (~70x)**. The 6-hour scan became ~2 minutes.
Every future rng-driven game inherits headless seed-scanning.

## The "unplayable" bug — what the gate couldn't see
The owner tried the live build and it was **unplayable** — and he was right. The
character-select screen threw `this.confirm is not a function` the instant you
chose a fighter, so you could never start a match. Root cause: **Phaser 4 only
binds a scene's lifecycle hooks** (`create`/`update`/…) from a plain-object
config — arbitrary methods (`confirm`/`refresh`/`move`) are NOT attached to the
scene instance, so `this.confirm()` was undefined. Fix: the menu logic now lives
as scene-bound closures inside `create()`.

The deeper lesson: **the gate boots `?level=N` straight into gameplay, so it
never touched the menu** — every arena passed while the front door was broken.
The eval now carries a **menu smoke-test**: a simulated human presses through
Title → Select → Play and the gate asserts the player actually *moves* under
keyboard input (x changes both directions), with zero page errors. A human-only
path is now part of the ship bar, on both renderers.

## Art & music
- **Backdrops**: five Gemini biome paintings (16:9, bottom third kept
  gameplay-clean) + title keyart of the whole roster. Characters deliberately
  stay procedural — the rigs ARE the on-model art, and the HUD portraits are
  *live mini-rigs* that mirror each fighter's mood (hurt/cheer/defeat) in real
  time.
- **Music**: six Lyria-composed loops (title + one per biome), trimmed to
  seamless ~29s mp3s.

## The campaign (authored max-FUN matches)
The seed scanner ran all five arenas headless; the highest-FUN winning seed per
arena was baked in. Every winner is a **contested** win — the champion drops at
least one stock and claws it back, which is exactly what the fun-gate rewards
over a sweep.

| # | Arena | Biome | You play | Authored match | FUN |
|---|-------|-------|----------|----------------|-----|
| 1 | Cumulus Courtyard | Clouds | Puff | seed 7 — 1 fall, 4 KOs, ~113s | **100** |
| 2 | Canopy Clash | Jungle | Mango | seed 2 — 2 falls, 2 KOs, ~129s | **85** |
| 3 | Caldera Rim | Volcano | Cinder | seed 5 — 1 fall, 3 KOs, ~58s | **97** |
| 4 | Glacier Shelf | Glacier | Glacia | seed 11 — 1 fall, 3 KOs, ~118s | **95.3** |
| 5 | Neon Rooftops | Neon City | Volt | seed 10 — 1 fall, 4 KOs, ~93s | **100** |

**Campaign mean FUN ≈ 95.5**, every arena a win, every win a comeback. The
campaign also exercises all five fighters as the player (one per biome), so the
gate covers the whole roster.

## Scorecard
- **Gate:** the Brawl fun-gate — deterministic + champion WINS + match FUN ≥ 70,
  on **webgl + canvas**. All five arenas pass (FUN 85–100).
- **Determinism:** two fresh 700-step runs are bit-identical per arena/renderer.
- **Art:** five Gemini biome backdrops + roster keyart; characters are procedural
  Studio.Toon rigs (17 animation states) with live mood-mirroring HUD portraits.
- **Music:** six Lyria loops (title + one per biome).
- **Engine funded:** Studio.Toon, Studio.Brawl, Studio.Brawl.fun, Studio.RNG, new
  Juice surfaces, and sim-only headless mode (~70x faster scan/gate).
