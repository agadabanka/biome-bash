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

## The gate, translated for a brawler
The platformers gate on "0 deaths to the goal". A brawler's translation:
**flawless victory** — the champion-iq autopilot must WIN the 1v3 match in
every arena **without losing a single stock**, deterministically, on webgl AND
canvas (`npm run eval`).

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

## Art & music
- **Backdrops**: five Gemini biome paintings (16:9, bottom third kept
  gameplay-clean) + title keyart of the whole roster. Characters deliberately
  stay procedural — the rigs ARE the on-model art, and the HUD portraits are
  *live mini-rigs* that mirror each fighter's mood (hurt/cheer/defeat) in real
  time.
- **Music**: six Lyria-composed loops (title + one per biome), trimmed to
  seamless ~29s mp3s.

## Scorecard
(to be finalized after the full eval + deploy + videos)
