/*
 * Biome Bash — the roster. Five toony brawlers, one per biome.
 * Each def feeds Studio.Toon (look: palette/shape/accessories) and
 * Studio.Brawl (stats: speed/jump/weight + frame-data + a unique special).
 * Specials use the Brawl onFrame hook so all timing stays in fixed frames
 * (deterministic under the eval stepper).
 */
window.CHARACTERS = [
  {
    key: 'puff', name: 'Puff', biome: 'Clouds', tint: 0x9ecbff,
    color: 0xcfe2ff, belly: 0xffffff, glove: 0xffffff, boot: 0xa9c6f0,
    w: 46, h: 46, shape: 'round', acc: [{ kind: 'tuft' }],
    speed: 245, jumpV: 620, airJumps: 2, weight: 86,
    bio: 'A cloud sprite who never learned what "down" means. Triple jump, zero worries.',
    atk: { jab: { dmg: 4, base: 145, scale: 5.2, range: 50, h: 48, ang: -0.4, startup: 4, active: 6, rec: 9 } },
    special: {
      name: 'Cyclone', cd: 260, ranged: false, range: 96, startup: 4, active: 30, rec: 10,
      onFrame: function (scene, world, f, k) {
        if (k === 4) { f.s.setVelocityY(-220); }
        if (k > 4 && k < 30) { f.s.setVelocityY(Math.max(f.s.body.velocity.y, -160)); f.rig.trunk.rotation = k * 0.55; }
        if (k === 10 || k === 20 || k === 28) {
          var last = k === 28;
          for (var i = 0; i < world.fighters.length; i++) {
            var v = world.fighters[i];
            if (v === f || !v.alive) continue;
            if (Math.abs(v.s.x - f.s.x) < 92 && Math.abs(v.s.y - f.s.y) < 70) {
              f.dir = v.s.x >= f.s.x ? 1 : -1;
              Studio.Brawl.resolve(scene, world, last ? { dmg: 6, base: 300, scale: 6.5, ang: -1.15 } : { dmg: 3, base: 90, scale: 1.5, ang: -0.9 }, f, v, v.s.x, v.s.y);
            }
          }
          Studio.Juice.ring(scene, f.s.x, f.s.y, { tint: 0xdff1ff, r0: 16, r1: last ? 110 : 80, dur: 300 });
          Studio.Audio.sfx('whoosh');
        }
      }
    }
  },
  {
    key: 'mango', name: 'Mango', biome: 'Jungle', tint: 0xffc24d,
    color: 0xc98a3a, belly: 0xf6dcab, glove: 0xf6dcab, boot: 0x8a5a2b,
    w: 44, h: 46, shape: 'round', acc: [{ kind: 'ears' }, { kind: 'tail' }, { kind: 'leaf', color: 0x74c69d }],
    speed: 295, jumpV: 660, airJumps: 1, weight: 92,
    bio: 'Canopy courier, banana enthusiast. Fastest feet in any biome.',
    special: {
      name: 'Banana-Rang', cd: 220, ranged: true, range: 330, startup: 8, active: 4, rec: 12,
      onFrame: function (scene, world, f, k) {
        if (k === 8) {
          Studio.Brawl.shot(scene, world, {
            x: f.s.x + f.dir * 26, y: f.s.y - 6, vx: f.dir * 470, turn: -f.dir * 13, spin: 0.32,
            life: 95, owner: f, dmg: 7, base: 200, scale: 5.5, ang: -0.5, tex: 'banana'
          });
          Studio.Audio.sfx('whoosh');
        }
      }
    }
  },
  {
    key: 'cinder', name: 'Cinder', biome: 'Volcano', tint: 0xff7b54,
    color: 0xe05438, belly: 0xffb085, glove: 0xffd6a5, boot: 0x7a2a1d,
    w: 48, h: 52, shape: 'bean', acc: [{ kind: 'horns', color: 0xfff3b0 }, { kind: 'crest', color: 0xff9e00 }],
    speed: 215, jumpV: 640, airJumps: 1, weight: 118,
    bio: 'A magma imp with anger management goals. Hits like a falling boulder.',
    atk: { heavy: { dmg: 13, base: 285, scale: 9, range: 68, h: 58, ang: -0.55, startup: 16, active: 7, rec: 18 } },
    special: {
      name: 'Magma Slam', cd: 300, ranged: false, range: 120, startup: 6, active: 34, rec: 8,
      onFrame: function (scene, world, f, k) {
        if (k === 6) { f.s.setVelocityY(-580); f.s.setVelocityX(f.dir * 140); }
        if (k >= 14 && k < 40 && !f.atk._slammed) {
          f.s.setVelocityY(Math.max(f.s.body.velocity.y, 880));
          var grounded = f.s.body.blocked.down || f.s.body.touching.down;
          if (grounded || k === 39) {
            f.atk._slammed = true;
            for (var i = 0; i < world.fighters.length; i++) {
              var v = world.fighters[i];
              if (v === f || !v.alive) continue;
              if (Math.abs(v.s.x - f.s.x) < 125 && Math.abs(v.s.y - f.s.y) < 95) {
                f.dir = v.s.x >= f.s.x ? 1 : -1;
                Studio.Brawl.resolve(scene, world, { dmg: 12, base: 350, scale: 7.5, ang: -0.6 }, f, v, v.s.x, v.s.y);
              }
            }
            Studio.Juice.ring(scene, f.s.x, f.s.y + 18, { tint: 0xff9e00, r0: 14, r1: 150, dur: 360 });
            Studio.Juice.spark(scene, f.s.x, f.s.y + 14, 270, { tint: 0xffb703, n: 14, spread: 80 });
            Studio.Juice.shake(scene, 160, 0.012);
            Studio.Audio.sfx('boom');
          }
        }
      }
    }
  },
  {
    key: 'glacia', name: 'Glacia', biome: 'Glacier', tint: 0xa8e8ff,
    color: 0xaad9f0, belly: 0xf0fbff, glove: 0xf0fbff, boot: 0x5f93b8,
    w: 50, h: 50, shape: 'round', acc: [{ kind: 'tuft' }],
    speed: 225, jumpV: 640, airJumps: 1, weight: 108,
    bio: 'A glacier yeti, professionally chill. Her shards stop fights cold.',
    special: {
      name: 'Frost Shard', cd: 250, ranged: true, range: 340, startup: 7, active: 4, rec: 12,
      onFrame: function (scene, world, f, k) {
        if (k === 7) {
          Studio.Brawl.shot(scene, world, {
            x: f.s.x + f.dir * 26, y: f.s.y - 8, vx: f.dir * 540, grav: 60, spin: f.dir * 0.1,
            life: 75, owner: f, dmg: 6, base: 160, scale: 4.5, ang: -0.4, freeze: 80, tex: 'icicle'
          });
          Studio.Audio.sfx('freeze');
        }
      }
    }
  },
  {
    key: 'volt', name: 'Volt', biome: 'Neon City', tint: 0x6ef3ff,
    color: 0x5a64d8, belly: 0x9fa8ff, glove: 0xffd60a, boot: 0x2b2d63,
    w: 44, h: 48, shape: 'square', acc: [{ kind: 'antenna', color: 0xffd60a }, { kind: 'visor', color: 0x4cc9f0 }],
    speed: 260, jumpV: 640, airJumps: 1, weight: 100,
    bio: 'A rooftop courier-bot running on stolen neon. Blink and he is behind you.',
    special: {
      name: 'Zap Dash', cd: 230, ranged: true, range: 250, startup: 5, active: 12, rec: 9,
      onFrame: function (scene, world, f, k) {
        if (k >= 5 && k < 17) {
          f.s.setVelocityX(f.dir * 1450); f.s.setVelocityY(0); f.invuln = Math.max(f.invuln, 2);
          if (k % 2 === 0) Studio.Juice.spark(scene, f.s.x - f.dir * 14, f.s.y, f.dir > 0 ? 180 : 0, { tint: 0x6ef3ff, n: 3, spread: 14, life: 220 });
          for (var i = 0; i < world.fighters.length; i++) {
            var v = world.fighters[i];
            if (v === f || !v.alive || f.atk.hit.indexOf(v) >= 0) continue;
            if (Math.abs(v.s.x - f.s.x) < 46 && Math.abs(v.s.y - f.s.y) < 52) {
              Studio.Brawl.resolve(scene, world, { dmg: 9, base: 270, scale: 7, ang: -0.4 }, f, v, v.s.x, v.s.y);
              f.atk.hit.push(v);
            }
          }
        }
        if (k === 17) f.s.setVelocityX(f.s.body.velocity.x * 0.1);
      }
    }
  }
];

// rounded UI card baked to a texture (persistent Graphics break this Phaser
// build's WebGL renderer; strokes inside generateTexture are safe)
window.BAKE_CARD = function (scene, key, w, h, tint, hollow) {
  Studio.Textures.bake(scene, key, w + 8, h + 8, function (g) {
    if (!hollow) g.fillStyle(0x0d1020, 0.84).fillRoundedRect(4, 4, w, h, 11);
    g.lineStyle(hollow ? 5 : 3, tint, 1).strokeRoundedRect(4, 4, w, h, hollow ? 15 : 11);
  });
};

// game-wide texture bakes beyond the SDK kit (items + projectiles + deco)
window.BAKE_GAME = function (scene) {
  var B = Studio.Textures, line = 0x1d1d28;
  Studio.Textures.kit(scene, { tile: 40 });
  B.bake(scene, 'banana', 22, 22, function (g) {
    g.lineStyle(7, line, 1); g.beginPath(); g.arc(11, 7, 8, 0.3, Math.PI - 0.3); g.strokePath();
    g.lineStyle(4, 0xffd166, 1); g.beginPath(); g.arc(11, 7, 8, 0.3, Math.PI - 0.3); g.strokePath();
  });
  B.bake(scene, 'icicle', 16, 16, function (g) {
    g.fillStyle(line, 1).fillTriangle(8, 0, 16, 14, 0, 14);
    g.fillStyle(0xbde0fe, 1).fillTriangle(8, 3, 13, 12, 3, 12);
    g.fillStyle(0xffffff, 0.7).fillTriangle(8, 4, 10, 10, 6, 10);
  });
  B.bake(scene, 'item_heal', 26, 26, function (g) {
    g.fillStyle(line, 1).fillCircle(8, 9, 8).fillCircle(18, 9, 8).fillTriangle(1, 13, 25, 13, 13, 25);
    g.fillStyle(0xff5d8f, 1).fillCircle(8, 9, 5.5).fillCircle(18, 9, 5.5).fillTriangle(4, 12, 22, 12, 13, 22);
    g.fillStyle(0xffffff, 0.7).fillCircle(8, 8, 2);
  });
  B.bake(scene, 'item_power', 28, 28, function (g) {
    g.fillStyle(line, 1); g.beginPath();
    for (var i = 0; i < 10; i++) { var r = i % 2 ? 6.5 : 14, a = -Math.PI / 2 + i * Math.PI / 5; var px = 14 + Math.cos(a) * r, py = 14 + Math.sin(a) * r; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath(); g.fillPath();
    g.fillStyle(0xffb703, 1); g.beginPath();
    for (var j = 0; j < 10; j++) { var r2 = j % 2 ? 4.5 : 11, a2 = -Math.PI / 2 + j * Math.PI / 5; var qx = 14 + Math.cos(a2) * r2, qy = 14 + Math.sin(a2) * r2; if (j) g.lineTo(qx, qy); else g.moveTo(qx, qy); }
    g.closePath(); g.fillPath();
  });
  B.bake(scene, 'item_speed', 24, 28, function (g) {
    g.fillStyle(line, 1).fillTriangle(14, 0, 2, 16, 11, 16).fillTriangle(11, 12, 22, 12, 9, 28);
    g.fillStyle(0xffd60a, 1).fillTriangle(13, 3, 5, 14, 12, 14).fillTriangle(12, 13, 18, 13, 10, 24);
  });
  B.bake(scene, 'item_shield', 28, 28, function (g) {
    g.lineStyle(4, line, 1).strokeCircle(14, 14, 11);
    g.fillStyle(0x4cc9f0, 0.5).fillCircle(14, 14, 9);
    g.fillStyle(0xffffff, 0.8).fillEllipse(10, 9, 6, 4);
  });
  B.bake(scene, 'item_bomb', 26, 30, function (g) {
    g.fillStyle(line, 1).fillCircle(13, 17, 11);
    g.fillStyle(0x3a3a4a, 1).fillCircle(13, 17, 8.5);
    g.fillStyle(0xffffff, 0.35).fillCircle(10, 14, 3);
    g.lineStyle(3, 0x8a5a2b, 1).lineBetween(13, 7, 17, 2);
    g.fillStyle(0xffb703, 1).fillCircle(18, 2, 2.5);
  });
  B.bake(scene, 'bubble', 70, 70, function (g) {
    g.lineStyle(3, 0x9bf6ff, 0.9).strokeCircle(35, 35, 32);
    g.fillStyle(0x4cc9f0, 0.16).fillCircle(35, 35, 31);
    g.fillStyle(0xffffff, 0.5).fillEllipse(24, 20, 14, 8);
  });
  B.bake(scene, 'pad', 64, 14, function (g) {
    g.fillStyle(line, 1).fillRoundedRect(0, 0, 64, 14, 6);
    g.fillStyle(0x9bf6ff, 1).fillRoundedRect(2, 2, 60, 10, 5);
  });
};
