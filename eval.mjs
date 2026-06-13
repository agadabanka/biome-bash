/*
 * Biome Bash eval — proves the brawler is AI-evaluable & shippable.
 * Per renderer (webgl + canvas), per arena (1..5), on FRESH pages:
 *   determinism (two identical 700-step runs) ·
 *   the FUN-GATE (champion autopilot WINS the 1v3 match — falls allowed —
 *   and the match scores Brawl felt-fun >= FUN_MIN) · non-black readback.
 * Writes out/scorecard.json + out/shot-l<N>.png and exits non-zero on failure.
 *   env: ARENAS=1,3 RENDERERS=webgl BUDGET=9000  (iteration filters)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const ARENA_LIST = (process.env.ARENAS || '1,2,3,4,5').split(',').map(Number);
const RENDERERS = (process.env.RENDERERS || 'webgl,canvas').split(',');
const BUDGET = Number(process.env.BUDGET || 10000);
const FUN_MIN = Number(process.env.FUN_MIN || 70);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = path.join(SRC, u);
  if (!f.startsWith(SRC) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function fresh(r, level) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}/?r=${r}&level=${level}&char=${HOME_CHAR[level] || 'puff'}&mute=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
  page._errs = errors;
  return page;
}
const HOME_CHAR = { 1: 'puff', 2: 'mango', 3: 'cinder', 4: 'glacia', 5: 'volt' };
const DET_KEYS = ['x', 'y', 'vx', 'vy', 'frame', 'deaths', 'won', 'coins'];

async function evalArena(r, level) {
  const p1 = await fresh(r, level); const s1 = await p1.evaluate(() => window.__run(700)); await p1.close();
  const p2 = await fresh(r, level); const s2 = await p2.evaluate(() => window.__run(700)); await p2.close();
  const deterministic = DET_KEYS.every(k => s1[k] === s2[k]);

  const pg = await fresh(r, level);
  const gate = await pg.evaluate((maxF) => window.__gate(maxF), BUDGET);
  const fun = await pg.evaluate(() => window.__fun());
  const errs = pg._errs.slice(0, 6);
  // diagnostic shot is best-effort: a slow software-GL readback of a complex
  // final frame must never fail the gate (the gate is det+won+fun).
  if (r === 'webgl') { try { await pg.screenshot({ path: path.join(OUT, `shot-l${level}.png`), timeout: 90000 }); } catch (e) { console.log(`  (shot l${level} skipped: ${String(e).split('\n')[0].slice(0, 60)})`); } }
  await pg.close();
  const pass = !!(deterministic && gate && gate.won && fun.fun >= FUN_MIN);
  console.log(`  [${r}] arena ${level}: det=${deterministic} won=${gate.won} falls=${gate.deaths} kos=${gate.coins} f=${gate.frame} FUN=${fun.fun}${pass ? '  ✓' : '  ✗'}${errs.length ? '  errs:' + errs[0].slice(0, 120) : ''}`);
  return { level, deterministic, det: { s1, s2 }, gate, fun, errors: errs, pass };
}

// Menu smoke-test: a human boots through Title → Select → Play, NOT the
// ?level=N shortcut the gate uses. This catches scene-flow bugs (e.g. Phaser 4
// not binding plain-object config methods) that the gate can't see, and proves
// keyboard movement actually drives the player. Renderer-independent → run once.
async function menuFlow(r) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`${BASE}/?r=${r}&mute=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true || (window.game && window.game.scene), { timeout: 20000 }).catch(() => {});
  const scene = () => page.evaluate(() => window.game.scene.scenes.filter(s => s.sys.settings.status === 5).map(s => s.scene.key).join(','));
  await page.waitForTimeout(900);
  const s0 = await scene();
  await page.keyboard.press('Space'); await page.waitForTimeout(700);      // Title → Select
  const s1 = await scene();
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);      // confirm fighter
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  await page.keyboard.press('Enter'); await page.waitForTimeout(800);      // confirm arena → Play
  const s2 = await scene();
  await page.waitForTimeout(3300); // past the 3s countdown
  const xA = await page.evaluate(() => window.__pX ? window.__pX() : null);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.up('ArrowRight');
  const xB = await page.evaluate(() => window.__pX ? window.__pX() : null);
  await page.close();
  const moved = xA != null && xB != null && Math.abs(xB - xA) > 20;
  const pass = s1 === 'Select' && s2 === 'Play' && moved && errs.length === 0;
  console.log(`  [${r}] menu: Title→${s1}→${s2} · player ${xA}→${xB} (moved=${moved})${pass ? '  ✓' : '  ✗'}${errs.length ? '  ERR:' + errs[0].slice(0, 100) : ''}`);
  return { s0, s1, s2, xA, xB, moved, errors: errs.slice(0, 4), pass };
}

async function readback(r) {
  const ps = await fresh(r, 1);
  await ps.evaluate(() => window.__run(300));
  const rb = await ps.evaluate(() => {
    const c = document.querySelector('canvas'); const off = document.createElement('canvas'); off.width = c.width; off.height = c.height;
    const ctx = off.getContext('2d');
    try {
      ctx.drawImage(c, 0, 0); const d = ctx.getImageData(0, 0, off.width, off.height).data; let nb = 0; const tot = d.length / 4;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 8 || d[i + 1] > 8 || d[i + 2] > 8) nb++; return { nonblackRatio: +(nb / tot).toFixed(4) };
    } catch (e) { return { err: String(e) }; }
  });
  await ps.close();
  return rb;
}

const results = {};
for (const r of RENDERERS) {
  console.log(`renderer ${r}:`);
  try {
    const arenas = [];
    for (const lv of ARENA_LIST) arenas.push(await evalArena(r, lv));
    const menu = await menuFlow(r);
    const rb = await readback(r);
    results[r] = { renderer: r, arenas, menu, readback: rb, pass: arenas.every(a => a.pass) && menu.pass && rb.nonblackRatio > 0.02 };
    console.log(`  [${r}] readback=${rb.nonblackRatio}  → ${results[r].pass ? 'PASS' : 'FAIL'}`);
  } catch (e) { results[r] = { renderer: r, fatal: String(e), pass: false }; console.log(`  [${r}] FATAL ${e}`); }
}
await browser.close(); server.close();
const verdict = Object.fromEntries(RENDERERS.map(r => [r, !!results[r].pass]));
fs.writeFileSync(path.join(OUT, 'scorecard.json'), JSON.stringify({ verdict, budget: BUDGET, results }, null, 2));
console.log('verdict', JSON.stringify(verdict));
process.exit(Object.values(verdict).every(Boolean) ? 0 : 1);
