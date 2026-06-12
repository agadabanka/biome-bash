/*
 * Biome Bash — the five arenas (the variety theme: one biome each).
 * An arena is data for Studio.Brawl.world: a main stage slab, one-way floating
 * platforms, four spawn pads, power-up drop points, and a per-biome dressing
 * spec (sky gradient, parallax silhouettes, ambient particles, music key).
 * All arenas fit the fixed 960x540 camera; blast zones sit beyond the edges.
 */
window.ARENAS = [
  {
    name: 'Cumulus Courtyard', biome: 'Clouds', key: 'clouds', seed: 11,
    width: 960, height: 540,
    sky: { top: 0x7fb8ff, bottom: 0xdff1ff },
    layers: [
      { color: 0xbcd9ff, alpha: 0.8, y: 400, amp: 60, step: 120 },
      { color: 0xe6f2ff, alpha: 0.9, y: 470, amp: 40, step: 90 }
    ],
    ambient: { tint: 0xffffff, scale: 0.5 },
    stage: { x: 205, y: 432, w: 550, h: 76, mat: 'cloud' },
    plats: [
      { x: 235, y: 312, w: 150, mat: 'cloud' },
      { x: 575, y: 312, w: 150, mat: 'cloud' },
      { x: 400, y: 212, w: 160, mat: 'cloud' }
    ],
    spawns: [{ x: 285, y: 380 }, { x: 675, y: 380 }, { x: 310, y: 260 }, { x: 650, y: 260 }],
    items: [{ x: 480, y: 392 }, { x: 310, y: 272 }, { x: 650, y: 272 }, { x: 480, y: 172 }]
  },
  {
    name: 'Canopy Clash', biome: 'Jungle', key: 'jungle', seed: 22,
    width: 960, height: 540,
    sky: { top: 0x14452f, bottom: 0x5da271 },
    layers: [
      { color: 0x0f3326, alpha: 0.9, y: 360, amp: 90, step: 110 },
      { color: 0x1d5c3f, alpha: 0.85, y: 450, amp: 55, step: 80 }
    ],
    ambient: { tint: 0x9ef7b1, scale: 0.45 },
    stage: { x: 180, y: 440, w: 600, h: 70, mat: 'vine' },
    plats: [
      { x: 215, y: 338, w: 135, mat: 'vine' },
      { x: 590, y: 300, w: 155, mat: 'vine' },
      { x: 375, y: 224, w: 150, mat: 'vine' }
    ],
    spawns: [{ x: 260, y: 388 }, { x: 700, y: 388 }, { x: 285, y: 286 }, { x: 665, y: 248 }],
    items: [{ x: 480, y: 400 }, { x: 282, y: 296 }, { x: 668, y: 258 }, { x: 450, y: 182 }]
  },
  {
    name: 'Caldera Rim', biome: 'Volcano', key: 'volcano', seed: 33,
    width: 960, height: 540,
    sky: { top: 0x2b0a0e, bottom: 0x8c2f1b },
    layers: [
      { color: 0x1c060a, alpha: 0.95, y: 350, amp: 110, step: 130 },
      { color: 0x4a1410, alpha: 0.9, y: 460, amp: 60, step: 95 }
    ],
    ambient: { tint: 0xffb703, scale: 0.55, rise: true },
    stage: { x: 150, y: 430, w: 290, h: 78, mat: 'basalt' },
    stage2: { x: 520, y: 430, w: 290, h: 78, mat: 'basalt' },
    plats: [
      { x: 410, y: 300, w: 140, mat: 'basalt' },
      { x: 225, y: 240, w: 130, mat: 'basalt' },
      { x: 605, y: 240, w: 130, mat: 'basalt' }
    ],
    spawns: [{ x: 240, y: 378 }, { x: 720, y: 378 }, { x: 290, y: 188 }, { x: 670, y: 188 }],
    items: [{ x: 295, y: 390 }, { x: 665, y: 390 }, { x: 480, y: 260 }, { x: 480, y: 160 }]
  },
  {
    name: 'Glacier Shelf', biome: 'Glacier', key: 'glacier', seed: 44,
    width: 960, height: 540,
    sky: { top: 0x16324f, bottom: 0x8ecae6 },
    layers: [
      { color: 0x274e6d, alpha: 0.85, y: 380, amp: 100, step: 150 },
      { color: 0x5b8db8, alpha: 0.8, y: 460, amp: 50, step: 100 }
    ],
    ambient: { tint: 0xeffaff, scale: 0.6 },
    stage: { x: 170, y: 438, w: 620, h: 72, mat: 'snow' },
    plats: [
      { x: 245, y: 330, w: 150, mat: 'snow' },
      { x: 565, y: 330, w: 150, mat: 'snow' },
      { x: 400, y: 222, w: 160, mat: 'snow' }
    ],
    spawns: [{ x: 260, y: 386 }, { x: 700, y: 386 }, { x: 320, y: 278 }, { x: 640, y: 278 }],
    items: [{ x: 480, y: 398 }, { x: 320, y: 290 }, { x: 640, y: 290 }, { x: 480, y: 182 }]
  },
  {
    name: 'Neon Rooftops', biome: 'Neon City', key: 'neon', seed: 55,
    width: 960, height: 540,
    sky: { top: 0x10002b, bottom: 0x3c096c },
    layers: [
      { color: 0x14213d, alpha: 0.95, y: 340, amp: 120, step: 70 },
      { color: 0x1f2a52, alpha: 0.9, y: 440, amp: 70, step: 55 }
    ],
    ambient: { tint: 0x6ef3ff, scale: 0.4 },
    stage: { x: 215, y: 425, w: 530, h: 82, mat: 'neon' },
    plats: [
      { x: 160, y: 318, w: 120, mat: 'neon' },
      { x: 680, y: 318, w: 120, mat: 'neon' },
      { x: 405, y: 240, w: 150, mat: 'neon' }
    ],
    spawns: [{ x: 290, y: 372 }, { x: 670, y: 372 }, { x: 220, y: 266 }, { x: 740, y: 266 }],
    items: [{ x: 480, y: 384 }, { x: 220, y: 278 }, { x: 740, y: 278 }, { x: 480, y: 200 }]
  }
];
window.LEVELS = window.ARENAS; // tooling alias
