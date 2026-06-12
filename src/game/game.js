/*
 * Biome Bash — a toony Smash-style platform brawler on the Studio SDK.
 * One player, three CPU fighters, five biome arenas, power-ups, and a flawless-
 * victory gate: the champion autopilot must win every arena without losing a
 * stock, deterministically, on both renderers (npm run eval).
 */
(function () {
  'use strict';
  var W = 960, H = 540, GRAV = 1500, COUNTDOWN = 180;
  var qs = new URLSearchParams(location.search);
  var P = {
    level: parseInt(qs.get('level') || '0', 10) || 0, // 1-based; >0 boots straight into Play
    char: qs.get('char') || '',
    seed: parseInt(qs.get('seed') || '0', 10) || 0, // authored-match override (seed scan / tuning)
    mute: qs.get('mute') === '1'
  };
  if (P.level > 100) P.level -= 100; // trailer-tool convention (level=101 → 1)

  var curMusic = null, curMusicUrl = '';
  function playMusic(url) {
    if (P.mute) return;
    if (curMusicUrl === url && curMusic) return;
    try { if (curMusic) curMusic.pause(); } catch (e) {}
    curMusic = Studio.Audio.music(url, 0.4); curMusicUrl = url;
  }
  function charByKey(k) {
    for (var i = 0; i < window.CHARACTERS.length; i++) if (window.CHARACTERS[i].key === k) return window.CHARACTERS[i];
    return window.CHARACTERS[0];
  }
  function rosterFor(playerKey) {
    var r = [charByKey(playerKey)];
    for (var i = 0; i < window.CHARACTERS.length && r.length < 4; i++) {
      if (window.CHARACTERS[i].key !== r[0].key) r.push(window.CHARACTERS[i]);
    }
    return r;
  }
  function dmgColor(d) { return d < 35 ? '#ffffff' : d < 70 ? '#ffd166' : d < 110 ? '#ff8c42' : '#ff4d6d'; }
  function hex(n) { return '#' + ('00000' + n.toString(16)).slice(-6); }
  function rigImages(rig) {
    var out = [];
    Object.keys(rig.parts).forEach(function (k) { if (rig.parts[k] && rig.parts[k].setTintFill) out.push(rig.parts[k]); });
    return out;
  }
  function dress(scene, arena) {
    scene.cameras.main.setBackgroundColor(arena.sky.bottom);
    Studio.Backdrop(scene, { top: arena.sky.top, bottom: arena.sky.bottom, worldWidth: W, layers: arena.layers || [] });
    if (scene.textures.exists('bg_' + arena.key)) {
      scene.add.image(W / 2, H / 2, 'bg_' + arena.key).setDisplaySize(W, H).setDepth(-95).setScrollFactor(0);
    }
    var am = arena.ambient || {};
    Studio.Juice.ambient(scene, W, { tint: am.tint, scale: am.scale || 0.5 });
  }
  function loadArt(scene) {
    window.ARENAS.forEach(function (a) { scene.load.image('bg_' + a.key, 'assets/bg/' + a.key + '.png'); });
    scene.load.image('keyart', 'assets/keyart.png');
    scene.load.on('loaderror', function () {}); // pre-art runs have no PNGs yet
  }

  // ───────────────────────────── Title ─────────────────────────────
  var Title = {
    key: 'Title',
    preload: function () { loadArt(this); },
    create: function () {
      var sc = this;
      window.BAKE_GAME(this);
      dress(this, window.ARENAS[0]);
      if (this.textures.exists('keyart')) {
        this.add.image(W / 2, H / 2, 'keyart').setDisplaySize(W, H).setDepth(-94).setAlpha(0.96);
        this.add.rectangle(W / 2, H - 74, W, 148, 0x0b1021, 0.55).setDepth(4);
      }
      var ty = this.textures.exists('keyart') ? 64 : 150;
      var t1 = this.add.text(W / 2, ty, 'BIOME BASH', {
        fontFamily: 'Arial Black, Arial', fontSize: '64px', fontStyle: 'bold', color: '#ffffff',
        stroke: '#16161e', strokeThickness: 12
      }).setOrigin(0.5).setDepth(5);
      this.add.text(W / 2, ty + 46, 'five toony fighters · five wild biomes · last toon standing', {
        fontFamily: 'Arial', fontSize: '17px', color: '#eaf6ff', stroke: '#16161e', strokeThickness: 4
      }).setOrigin(0.5).setDepth(5);
      this.tweens.add({ targets: t1, scale: 1.04, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
      // toon parade along the bottom
      this.parade = [];
      for (var i = 0; i < window.CHARACTERS.length; i++) {
        var rig = Studio.Toon.rig(this, window.CHARACTERS[i], 120 + i * 180, H - 110);
        rig.root.setDepth(6); rig.root.setScale(0.9);
        Studio.Toon.set(rig, i % 2 ? 'idle' : 'run');
        this.parade.push(rig);
      }
      var go = this.add.text(W / 2, H - 36, 'press SPACE or click to brawl', {
        fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', color: '#ffd166', stroke: '#16161e', strokeThickness: 5
      }).setOrigin(0.5).setDepth(6);
      this.tweens.add({ targets: go, alpha: 0.35, yoyo: true, repeat: -1, duration: 600 });
      this.add.text(W - 10, 10, 'move ←→ · jump ↑/SPACE · attack Z · heavy X · special C · shield V', {
        fontFamily: 'Arial', fontSize: '13px', color: '#cfe9ff', stroke: '#16161e', strokeThickness: 3
      }).setOrigin(1, 0).setDepth(6);
      var start = function () { playMusic('assets/music/title.mp3'); sc.scene.start('Select'); };
      this.input.keyboard.once('keydown', start);
      this.input.once('pointerdown', start);
    },
    update: function (_, dms) {
      for (var i = 0; i < (this.parade || []).length; i++) Studio.Toon.update(this.parade[i], dms);
    }
  };

  // ───────────────────────────── Select ─────────────────────────────
  var Select = {
    key: 'Select',
    create: function () {
      var sc = this;
      window.BAKE_GAME(this);
      this.phase = 'char'; this.ci = 0; this.ai = 0;
      dress(this, window.ARENAS[0]);
      this.add.rectangle(W / 2, H / 2, W, H, 0x0b1021, 0.45).setDepth(0);
      this.hdr = this.add.text(W / 2, 44, 'CHOOSE YOUR FIGHTER', {
        fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#ffffff', stroke: '#16161e', strokeThickness: 8
      }).setOrigin(0.5).setDepth(10);
      // fighter cards
      this.cards = []; this.rigs = [];
      var cw = 168, gap = 14, x0 = (W - (cw * 5 + gap * 4)) / 2;
      for (var i = 0; i < 5; i++) {
        var def = window.CHARACTERS[i], cx = x0 + i * (cw + gap) + cw / 2;
        window.BAKE_CARD(this, 'selcard_' + def.key, cw, 270, def.tint);
        var g = this.add.image(cx, 245, 'selcard_' + def.key).setDepth(5);
        var rig = Studio.Toon.rig(this, def, cx, 222); rig.root.setDepth(6); rig.root.setScale(1.05);
        Studio.Toon.set(rig, 'idle');
        this.add.text(cx, 296, def.name, { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: hex(def.tint), stroke: '#16161e', strokeThickness: 5 }).setOrigin(0.5).setDepth(6);
        this.add.text(cx, 318, def.biome, { fontFamily: 'Arial', fontSize: '13px', color: '#cfe9ff' }).setOrigin(0.5).setDepth(6);
        var st = 'SPD ' + Math.round((def.speed - 200) / 10) + ' · PWR ' + Math.round(def.weight / 12) + ' · AIR ' + (def.airJumps + 1);
        this.add.text(cx, 340, st, { fontFamily: 'Arial', fontSize: '12px', color: '#9fb4d8' }).setOrigin(0.5).setDepth(6);
        this.add.text(cx, 362, def.special.name, { fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: '#ffd166' }).setOrigin(0.5).setDepth(6);
        this.cards.push({ g: g, x: cx, def: def, idx: i });
        this.rigs.push(rig);
        (function (idx) {
          var zone = sc.add.zone(cx, 245, cw, 270).setOrigin(0.5).setInteractive();
          zone.on('pointerdown', function () { if (sc.phase === 'char') { sc.ci = idx; sc.confirm(); } else { sc.ai = idx; sc.confirm(); } });
        })(i);
      }
      this.bio = this.add.text(W / 2, 408, '', { fontFamily: 'Arial', fontSize: '16px', fontStyle: 'italic', color: '#eaf6ff', stroke: '#16161e', strokeThickness: 4 }).setOrigin(0.5).setDepth(10);
      window.BAKE_CARD(this, 'selhl', 178, 280, 0xffd166, true);
      this.sel = this.add.image(this.cards[0].x, 246, 'selhl').setDepth(7);
      this.hint = this.add.text(W / 2, H - 26, '← → choose · ENTER/SPACE confirm', { fontFamily: 'Arial', fontSize: '16px', color: '#ffd166', stroke: '#16161e', strokeThickness: 4 }).setOrigin(0.5).setDepth(10);
      // arena banners (hidden until phase 2)
      this.arenaTexts = [];
      this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,ENTER,SPACE');
      this.keys.LEFT.on('down', function () { sc.move(-1); });
      this.keys.RIGHT.on('down', function () { sc.move(1); });
      var conf = function () { sc.confirm(); };
      this.keys.ENTER.on('down', conf); this.keys.SPACE.on('down', conf);
      this.refresh();
    },
    move: function (d) {
      if (this.phase === 'char') this.ci = (this.ci + d + 5) % 5; else this.ai = (this.ai + d + 5) % 5;
      this.refresh();
    },
    confirm: function () {
      if (this.phase === 'char') {
        this.phase = 'arena';
        this.hdr.setText('CHOOSE YOUR ARENA');
        for (var i = 0; i < 5; i++) {
          var a = window.ARENAS[i];
          this.arenaTexts.push(this.add.text(this.cards[i].x, 130, a.biome.toUpperCase(), { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff', stroke: '#16161e', strokeThickness: 4 }).setOrigin(0.5).setDepth(8));
          this.arenaTexts.push(this.add.text(this.cards[i].x, 385, a.name, { fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#9bf6ff' }).setOrigin(0.5).setDepth(8));
        }
        this.refresh();
      } else {
        this.scene.start('Play', { ci: this.ci, ai: this.ai });
      }
    },
    refresh: function () {
      var idx = this.phase === 'char' ? this.ci : this.ai;
      var c = this.cards[idx];
      this.sel.setPosition(c.x, 246);
      this.bio.setText(this.phase === 'char' ? c.def.bio : window.ARENAS[idx].name + ' — ' + window.ARENAS[idx].biome);
      for (var i = 0; i < 5; i++) Studio.Toon.set(this.rigs[i], i === this.ci && this.phase === 'char' ? 'victory' : 'idle');
    },
    update: function (_, dms) {
      for (var i = 0; i < (this.rigs || []).length; i++) Studio.Toon.update(this.rigs[i], dms);
    }
  };

  // ───────────────────────────── Play ─────────────────────────────
  var scene, world, player, roster, arena, auto = false, manualInput = {}, announceQ = [];
  var hud = null, padImgs = [], started = false;

  function seedFor(arenaSpec, ros) {
    if (P.seed) return (P.seed >>> 0) || 1;
    var s = arenaSpec.seed * 7919;
    for (var i = 0; i < ros.length; i++) for (var j = 0; j < ros[i].key.length; j++) s = (s * 31 + ros[i].key.charCodeAt(j)) >>> 0;
    return s || 1;
  }

  function buildMatch() {
    // tear down any previous match (harness reset() rebuilds in place)
    if (world) {
      world.fighters.forEach(function (f) { f.s.destroy(); f.rig.root.destroy(); });
      world.shots.forEach(function (sh) { sh.im.destroy(); });
      world.items.forEach(function (it) { it.im.destroy(); });
      world.bombs.forEach(function (bo) { bo.im.destroy(); });
      world.plats.clear(true, true);
    }
    padImgs.forEach(function (p) { p.destroy(); }); padImgs = [];
    started = false;

    world = Studio.Brawl.world(scene, arena, seedFor(arena, roster));
    arena.spawns.forEach(function (sp) {
      padImgs.push(scene.add.image(sp.x, sp.y + 28, 'pad').setDepth(2).setAlpha(0.9));
    });
    var riq = qs.get('cpu') === 'hard' ? Studio.Brawl.IQ.bruiser : Studio.Brawl.IQ.scrapper;
    var iqs = [Studio.Brawl.IQ.champion, riq, riq, riq];
    for (var i = 0; i < 4; i++) {
      // rival rumble handicap: you carry 3 stocks, the three rivals carry 2
      var f = Studio.Brawl.fighter(scene, world, roster[i], i, { cpu: i > 0, iq: iqs[i], stocks: i === 0 ? 3 : 2 });
      f.rig.root.setDepth(10 + i);
    }
    player = world.fighters[0];
    wireFx();
    if (hud) hud.reset();
  }

  function flashRig(f, frames) {
    f._flash = frames;
    rigImages(f.rig).forEach(function (im) { im.setTintFill(0xffffff); });
  }
  function tintRig(f, color) { rigImages(f.rig).forEach(function (im) { im.setTint(color); }); }
  function clearRigTint(f) { rigImages(f.rig).forEach(function (im) { im.clearTint(); }); }

  function announce(str, color, size, y) {
    Studio.Juice.pop(scene, W / 2, y || 200, str, { color: color || '#ffffff', size: size || 46, dur: 800, rise: 26, grow: 1.3 });
  }

  function wireFx() {
    world.fx = {
      swing: function (f, name) { if (name === 'heavy') Studio.Audio.sfx('whoosh'); },
      special: function (f) {
        Studio.Juice.ring(scene, f.s.x, f.s.y, { tint: f.def.tint, r0: 10, r1: 60, dur: 240 });
        Studio.Juice.pop(scene, f.s.x, f.s.y - 56, f.def.special.name + '!', { color: hex(f.def.tint), size: 15 });
      },
      hit: function (a, v, dealt, kb, x, y) {
        (window.__mlog = window.__mlog || []).push({ t: 'hit', f: world.frame, a: a.def.key, v: v.def.key, dmg: Math.round(v.dmg), kb: Math.round(kb) });
        var deg = a.dir > 0 ? 0 : 180;
        Studio.Juice.spark(scene, x, y, deg, { tint: a.def.tint, n: kb > 500 ? 12 : 7, spread: 34 });
        if (kb > 420) Studio.Juice.ring(scene, x, y, { tint: 0xffffff, r0: 8, r1: 56, dur: 220 });
        Studio.Juice.pop(scene, v.s.x, v.s.y - 48, String(dealt), { color: dmgColor(v.dmg), size: 16 + Math.min(14, dealt) });
        Studio.Juice.shake(scene, 70 + Math.min(110, kb * 0.08), Math.min(0.012, 0.002 + kb * 0.00001));
        Studio.Audio.sfx(dealt >= 10 ? 'heavy' : 'hit');
        if (kb > 700) Studio.Juice.hitStop(scene, 50);
        flashRig(v, 5);
      },
      block: function (v, x, y) { Studio.Juice.ring(scene, v.s.x, v.s.y, { tint: 0x9bf6ff, r0: 14, r1: 48, dur: 200 }); Studio.Audio.sfx('shield'); },
      shieldPop: function (v) { if (v._fxBubble) { v._fxBubble.destroy(); v._fxBubble = null; } Studio.Juice.ring(scene, v.s.x, v.s.y, { tint: 0x4cc9f0, r0: 20, r1: 70, dur: 260 }); },
      jump: function (f) {},
      djump: function (f) { Studio.Juice.ring(scene, f.s.x, f.s.y + 18, { tint: 0xffffff, r0: 22, r1: 6, dur: 200 }); },
      land: function (f) { Studio.Juice.burst(scene, f.s.x, f.s.y + 22, { n: 5, tint: 0xffffff, life: 240, spMin: 30, spMax: 90, scale: 0.5 }); },
      ko: function (f, killer, x, y) {
        (window.__mlog = window.__mlog || []).push({ t: 'ko', f: world.frame, who: f.def.key, by: killer ? killer.def.key : null, x: Math.round(f.s.x), y: Math.round(f.s.y), stocks: f.stocks });
        Studio.Juice.ring(scene, x, y, { tint: f.def.tint, r0: 20, r1: 170, dur: 420 });
        Studio.Juice.spark(scene, x, y, 270, { tint: f.def.tint, n: 16, spread: 180, spMax: 520 });
        var st = scene.add.image(x, y, 'star').setTint(f.def.tint).setDepth(50);
        var dx = x < W / 2 ? -120 : W + 120;
        scene.tweens.add({ targets: st, x: dx, y: y - 140, angle: 720, scale: 2.2, alpha: 0, duration: 700, ease: 'Cubic.out', onComplete: function () { st.destroy(); } });
        announce('KO!', '#ffd166', 54);
        Studio.Juice.flash(scene, 90, 255, 255, 255);
        Studio.Juice.shake(scene, 200, 0.014);
        Studio.Audio.sfx('ko');
      },
      out: function (f) { announce(f.def.name + ' is OUT!', hex(f.def.tint), 30, 250); },
      respawn: function (f) { Studio.Juice.ring(scene, f.s.x, f.s.y, { tint: 0x9bf6ff, r0: 40, r1: 8, dur: 300 }); },
      itemSpawn: function (x, y, ty) {
        Studio.Juice.ring(scene, x, y, { tint: 0xffd166, r0: 6, r1: 44, dur: 320 });
        Studio.Juice.burst(scene, x, y, { n: 8, tint: 0xffd166, life: 360, scale: 0.5 });
      },
      item: function (f, type, x, y) {
        var names = { heal: 'HEAL!', power: 'POWER UP!', speed: 'SPEED!', shield: 'SHIELD!', bomb: 'BOMB!' };
        var tints = { heal: 0xff5d8f, power: 0xffb703, speed: 0xffd60a, shield: 0x4cc9f0, bomb: 0xff6d00 };
        Studio.Juice.burst(scene, x, y, { n: 12, tint: tints[type], life: 420, scale: 0.7 });
        Studio.Juice.pop(scene, f.s.x, f.s.y - 60, names[type], { color: hex(tints[type]), size: 16 });
        Studio.Audio.sfx('item');
      },
      itemGone: function (it, taken) { if (!taken) Studio.Juice.burst(scene, it.x, it.im.y, { n: 4, tint: 0x9fb4d8, life: 240, scale: 0.4 }); },
      boom: function (x, y) {
        Studio.Juice.ring(scene, x, y, { tint: 0xff6d00, r0: 16, r1: 150, dur: 380 });
        Studio.Juice.burst(scene, x, y, { n: 22, tint: 0xffb703, life: 520, spMax: 420 });
        Studio.Juice.shake(scene, 220, 0.016); Studio.Audio.sfx('boom');
      },
      shot: function (sh) { Studio.Juice.ring(scene, sh.x, sh.y, { tint: 0xffffff, r0: 4, r1: 26, dur: 180 }); },
      shotEnd: function (sh) { Studio.Juice.burst(scene, sh.x, sh.y, { n: 5, tint: 0xdfe7ff, life: 220, scale: 0.45 }); },
      freeze: function (v) { tintRig(v, 0x9bd6ff); Studio.Juice.burst(scene, v.s.x, v.s.y, { n: 10, tint: 0x9bf6ff, life: 380, texture: 'shard' }); Studio.Audio.sfx('freeze'); },
      thaw: function (v) { clearRigTint(v); Studio.Juice.burst(scene, v.s.x, v.s.y, { n: 6, tint: 0xdff6ff, life: 260, texture: 'shard', scale: 0.5 }); },
      sudden: function () { announce('SUDDEN DEATH!', '#ff4d6d', 44); Studio.Juice.flash(scene, 160, 255, 80, 80); Studio.Audio.sfx('go'); },
      gameover: function (winner) {
        if (winner) {
          announce(winner.def.name + ' WINS!', hex(winner.def.tint), 48);
          Studio.Juice.confetti(scene, W / 2, 140, { n: 40 });
          Studio.Audio.sfx('win');
        } else announce('DRAW!', '#ffffff', 48);
      }
    };
  }

  function makeHud() {
    var cards = [];
    var cw = 225, x0 = 12, y0 = H - 56;
    for (var i = 0; i < 4; i++) {
      var f = world.fighters[i], cx = x0 + i * (cw + 9);
      var HP = (qs.get('hudparts') || 'card,mini,text,pips').split(',');
      if (HP.indexOf('card') >= 0) {
        window.BAKE_CARD(scene, 'card_' + f.def.key, cw, 50, f.def.tint);
        scene.add.image(cx + cw / 2, y0 + 25, 'card_' + f.def.key).setDepth(80);
      }
      var mini = null;
      if (HP.indexOf('mini') >= 0) {
        mini = Studio.Toon.rig(scene, f.def, cx + 30, y0 + 26);
        mini.scale = 0.42; mini.root.setScale(0.42); mini.root.setDepth(81);
        Studio.Toon.set(mini, 'idle');
      }
      var name = null, dmg = null;
      if (HP.indexOf('text') >= 0) {
        name = scene.add.text(cx + 58, y0 + 7, f.def.name + (i === 0 ? ' (YOU)' : ' · CPU'), {
          fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: hex(f.def.tint), stroke: '#16161e', strokeThickness: 3
        }).setDepth(81);
        dmg = scene.add.text(cx + cw - 12, y0 + 24, '0%', {
          fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffffff', stroke: '#16161e', strokeThickness: 5
        }).setOrigin(1, 0.5).setDepth(81);
      }
      var pips = [];
      if (HP.indexOf('pips') >= 0) for (var p = 0; p < 3; p++) pips.push(scene.add.image(cx + 64 + p * 18, y0 + 34, 'star').setScale(0.55).setTint(0xffd166).setDepth(81));
      cards.push({ f: f, mini: mini, name: name, dmg: dmg, pips: pips });
    }
    return {
      cards: cards,
      reset: function () {
        for (var i = 0; i < cards.length; i++) { cards[i].f = world.fighters[i]; }
      },
      tick: function (dms) {
        for (var i = 0; i < cards.length; i++) {
          var c = cards[i], f = c.f;
          if (!c.dmg || !c.mini) continue;
          c.dmg.setText(Math.round(f.dmg) + '%').setColor(dmgColor(f.dmg));
          for (var p = 0; p < 3; p++) c.pips[p].setVisible(f.stocks > p).setTint(f.alive || f.stocks > 0 ? 0xffd166 : 0x444455);
          var mood = f.stocks <= 0 ? 'sad' : (f.hitstun > 0 ? 'hurt' : (world.winner === f ? 'cheer' : (f.dmg > 90 ? 'sad' : 'neutral')));
          Studio.Toon.face(c.mini, mood);
          Studio.Toon.set(c.mini, f.stocks <= 0 ? 'defeat' : (world.winner === f ? 'victory' : 'idle'));
          Studio.Toon.update(c.mini, dms);
          c.mini.root.setAlpha(f.stocks <= 0 ? 0.35 : 1);
        }
      }
    };
  }

  function readKeys(k, cur) {
    return {
      left: k.LEFT.isDown || k.A.isDown,
      right: k.RIGHT.isDown || k.D.isDown,
      down: k.DOWN.isDown || k.S.isDown,
      jump: k.UP.isDown || k.W.isDown || k.SPACE.isDown,
      att: k.Z.isDown || k.J.isDown,
      heavy: k.X.isDown || k.K.isDown,
      spec: k.C.isDown || k.L.isDown,
      shield: k.V.isDown || k.SHIFT.isDown
    };
  }

  var Play = {
    key: 'Play',
    preload: function () { loadArt(this); },
    create: function (data) {
      scene = this;
      var ai = (data && data.ai != null) ? data.ai : (P.level ? P.level - 1 : 0);
      var ci = (data && data.ci != null) ? data.ci : -1;
      arena = window.ARENAS[Math.max(0, Math.min(4, ai))];
      var pdef = ci >= 0 ? window.CHARACTERS[ci] : charByKey(P.char || 'puff');
      roster = rosterFor(pdef.key);
      window.BAKE_GAME(this);
      dress(this, arena);
      this.add.text(W - 10, 8, arena.name + ' · ' + arena.biome, {
        fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold', color: '#ffffff', stroke: '#16161e', strokeThickness: 4
      }).setOrigin(1, 0).setDepth(80).setAlpha(0.9);
      buildMatch();
      hud = makeHud();
      this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,Z,X,C,V,J,K,L,SPACE,SHIFT,R,M');
      this.keys.R.on('down', function () { if (world.over) buildMatch(); });
      this.keys.M.on('down', function () { if (world.over) scene.scene.start('Title'); });
      playMusic('assets/music/' + arena.key + '.mp3');
      this._endT = 0;

      // NOTE: no camera filters here — this Phaser 4 build's filter pass
      // null-crashes when Containers are in the display list (engine finding).
      if (qs.get('vig') === '1') Studio.Juice.vignette(this, 0.35);
      Studio.harness.install(window.game, {
        snapshot: function () {
          var s = player.s;
          var living = world.fighters.filter(function (f) { return f.stocks > 0; }).length;
          return {
            x: Math.round(s.x), y: Math.round(s.y),
            vx: Math.round(s.body.velocity.x), vy: Math.round(s.body.velocity.y),
            onGround: !!(s.body.blocked.down || s.body.touching.down),
            deaths: player.falls, dead: player.stocks <= 0,
            won: !!(world.over && world.winner === player),
            frame: world.frame, coins: player.kos, dmg: Math.round(player.dmg),
            alive: living, over: world.over
          };
        },
        setInput: function (o) { manualInput = o || {}; },
        autopilot: function (on) { auto = !!on; },
        reset: function () { buildMatch(); }
      });
      window.__game.showcase = function (on) { auto = !!on; };
      window.__game.collect = function () {};
    },
    update: function (_, dms) {
      if (!world) return;
      var k = this.keys;
      // countdown announcements on the deterministic frame clock
      if (!started) {
        if (world.frame === 8) { announce('3', '#ffffff', 64); Studio.Audio.sfx('count'); }
        if (world.frame === 66) { announce('2', '#ffffff', 64); Studio.Audio.sfx('count'); }
        if (world.frame === 124) { announce('1', '#ffffff', 64); Studio.Audio.sfx('count'); }
        if (world.frame === COUNTDOWN) { announce('GO!', '#ffd166', 72); Studio.Audio.sfx('go'); started = true; }
      }
      Studio.Brawl.tick(this, world, function (f, i) {
        if (world.frame < COUNTDOWN) return {};
        if (i === 0 && !f.cpu) {
          if (auto) return Studio.Brawl.cpu(scene, world, f);
          var inp = readKeys(k);
          // merge any harness-driven input (trailer/manual bridge)
          ['left', 'right', 'down', 'jump', 'att', 'heavy', 'spec', 'shield'].forEach(function (key) { if (manualInput[key]) inp[key] = true; });
          return inp;
        }
        return Studio.Brawl.cpu(scene, world, f);
      });
      // buff visuals upkeep
      for (var i = 0; i < world.fighters.length; i++) {
        var f = world.fighters[i];
        if (f._flash > 0 && --f._flash === 0) { if (f.frozen > 0) tintRig(f, 0x9bd6ff); else clearRigTint(f); }
        if (f.buffs.power > 0 && !f._fxPower) f._fxPower = Studio.Juice.trail(scene, f.rig.root, { tint: 0xff9e00, scale: 1.1, every: 36 });
        if (f.buffs.power <= 0 && f._fxPower) { f._fxPower.destroy(); f._fxPower = null; }
        if (f.buffs.speed > 0 && !f._fxSpeed) f._fxSpeed = Studio.Juice.trail(scene, f.rig.root, { tint: 0x6ef3ff, scale: 0.8, every: 24 });
        if (f.buffs.speed <= 0 && f._fxSpeed) { f._fxSpeed.destroy(); f._fxSpeed = null; }
        if (f.shieldUp && !f._fxBubble) f._fxBubble = scene.add.image(f.s.x, f.s.y, 'bubble').setDepth(30);
        if (!f.shieldUp && f._fxBubble) { f._fxBubble.destroy(); f._fxBubble = null; }
        if (f._fxBubble) f._fxBubble.setPosition(f.s.x, f.s.y).setAlpha(0.8 + Math.sin(world.frame * 0.2) * 0.2);
        if (!f.alive && f._fxPower) { f._fxPower.destroy(); f._fxPower = null; }
        if (!f.alive && f._fxSpeed) { f._fxSpeed.destroy(); f._fxSpeed = null; }
      }
      hud.tick(dms);
      // flight recorder (autopilot only): last 110 player frames, dumped per KO
      if (auto && player) {
        var tp = (window.__tape = window.__tape || []);
        tp.push({ f: world.frame, x: Math.round(player.s.x), y: Math.round(player.s.y), vx: Math.round(player.s.body.velocity.x), vy: Math.round(player.s.body.velocity.y), j: player.jumps, fz: player.frozen, hs: player.hitstun, atk: player.atk ? player.atk.name : 0, al: player.alive ? 1 : 0 });
        if (tp.length > 110) tp.shift();
        if (!player.alive && !window.__tapedAt || (window.__tapedAt !== player.falls && !player.alive)) {
          if (player.falls !== window.__tapedAt) { (window.__mlog = window.__mlog || []).push({ t: 'autopsy', fall: player.falls, tape: tp.slice(-100) }); window.__tapedAt = player.falls; }
        }
      }
      // match end → victory lap, then results
      if (world.over) {
        this._endT++;
        if (world.winner && world.winner.alive) {
          Studio.Toon.set(world.winner.rig, 'victory');
          Studio.Toon.face(world.winner.rig, 'cheer');
          if (this._endT % 46 === 1) Studio.Juice.confetti(scene, world.winner.s.x, world.winner.s.y - 80, { n: 14 });
        }
        if (this._endT === 170 && !auto) {
          var pl = world.fighters.slice().sort(function (a, b) { return (b.stocks - a.stocks) || (a.dmg - b.dmg); });
          this.scene.start('Results', { order: pl.map(function (f) { return { key: f.def.key, name: f.def.name, tint: f.def.tint, stocks: f.stocks, kos: f.kos, falls: f.falls, you: f === player }; }), arenaName: arena.name, ai: window.ARENAS.indexOf(arena), ci: window.CHARACTERS.indexOf(roster[0]) });
        }
      } else this._endT = 0;
    }
  };

  // ───────────────────────────── Results ─────────────────────────────
  var Results = {
    key: 'Results',
    create: function (data) {
      var sc = this;
      window.BAKE_GAME(this);
      dress(this, window.ARENAS[data && data.ai != null ? data.ai : 0]);
      this.add.rectangle(W / 2, H / 2, W, H, 0x0b1021, 0.55);
      var win = data.order[0];
      this.add.text(W / 2, 60, win.you ? 'VICTORY!' : 'GAME!', {
        fontFamily: 'Arial Black, Arial', fontSize: '54px', color: win.you ? '#ffd166' : '#ffffff', stroke: '#16161e', strokeThickness: 10
      }).setOrigin(0.5).setDepth(10);
      this.add.text(W / 2, 104, win.name + ' wins on ' + data.arenaName, {
        fontFamily: 'Arial', fontSize: '20px', color: hex(win.tint), stroke: '#16161e', strokeThickness: 4
      }).setOrigin(0.5).setDepth(10);
      this.winRig = Studio.Toon.rig(this, charByKey(win.key), W / 2, 230);
      this.winRig.root.setScale(1.5).setDepth(10);
      Studio.Toon.set(this.winRig, 'victory'); Studio.Toon.face(this.winRig, 'cheer');
      this.others = [];
      for (var i = 1; i < data.order.length; i++) {
        var o = data.order[i];
        var r = Studio.Toon.rig(this, charByKey(o.key), 240 + (i - 1) * 240, 360);
        r.root.setScale(0.85).setDepth(9); r.root.setAlpha(0.85);
        Studio.Toon.set(r, 'defeat'); Studio.Toon.face(r, 'sad');
        this.others.push(r);
        this.add.text(240 + (i - 1) * 240, 408, '#' + (i + 1) + ' ' + o.name + (o.you ? ' (you)' : ''), { fontFamily: 'Arial', fontSize: '15px', fontStyle: 'bold', color: hex(o.tint), stroke: '#16161e', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
        this.add.text(240 + (i - 1) * 240, 428, o.kos + ' KOs · ' + o.falls + ' falls', { fontFamily: 'Arial', fontSize: '12px', color: '#9fb4d8' }).setOrigin(0.5).setDepth(10);
      }
      this.add.text(W / 2, 300, win.kos + ' KOs · ' + win.falls + ' falls', { fontFamily: 'Arial', fontSize: '14px', color: '#eaf6ff', stroke: '#16161e', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
      this.add.text(W / 2, H - 40, 'R rematch · M menu', { fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#ffd166', stroke: '#16161e', strokeThickness: 4 }).setOrigin(0.5).setDepth(10);
      this._conf = 0;
      var keys = this.input.keyboard.addKeys('R,M');
      keys.R.on('down', function () { sc.scene.start('Play', { ci: data.ci, ai: data.ai }); });
      keys.M.on('down', function () { sc.scene.start('Title'); });
      this.input.on('pointerdown', function () { sc.scene.start('Title'); });
    },
    update: function (_, dms) {
      Studio.Toon.update(this.winRig, dms);
      for (var i = 0; i < this.others.length; i++) Studio.Toon.update(this.others[i], dms);
      if (++this._conf % 52 === 1) Studio.Juice.confetti(this, 160 + ((this._conf * 7919) % 640), 60, { n: 12 });
    }
  };

  var config = {
    type: Phaser.AUTO, width: W, height: H, backgroundColor: '#0b1021', seed: ['biome-bash'],
    render: { preserveDrawingBuffer: true, pixelArt: false, antialias: true },
    physics: { default: 'arcade', arcade: { gravity: { y: GRAV }, debug: false } },
    scene: P.level > 0 ? [Play, Results, Title, Select] : [Title, Select, Play, Results]
  };
  var r = qs.get('r');
  if (r === 'canvas') config.type = Phaser.CANVAS; else if (r === 'webgl') config.type = Phaser.WEBGL;
  window.game = new Phaser.Game(config);
})();
