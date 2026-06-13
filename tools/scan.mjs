// Seed scanner — the authored-match search. Deterministic sim means a seed that
// produces a flawless champion win reproduces forever; scan candidates per arena
// and report the clean ones.  env: ARENA=2 SEEDS=1-24 PAR=6
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const ARENA = process.env.ARENA || '1';
const [S0, S1] = (process.env.SEEDS || '1-24').split('-').map(Number);
const PAR = Number(process.env.PAR || 6);
const HOME_CHAR = { 1: 'puff', 2: 'mango', 3: 'cinder', 4: 'glacia', 5: 'volt' };
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => { let u = req.url.split('?')[0]; if (u === '/') u = '/index.html'; const f = path.join(SRC, u); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const seeds = []; for (let s = S0; s <= S1; s++) seeds.push(s);
const results = [];
async function run(seed) {
  const p = await browser.newPage({ viewport: { width: 960, height: 540 } });
  try {
    await p.goto(`${BASE}/?r=${process.env.R || 'headless'}&level=${ARENA}&seed=${seed}&char=${HOME_CHAR[ARENA]}&mute=1`, { waitUntil: 'load', timeout: 45000 });
    await p.waitForFunction(() => window.__ready === true, { timeout: 20000 });
    const s = await p.evaluate(() => window.__gate(10000));
    const fun = await p.evaluate(() => window.__fun());
    results.push({ seed, won: s.won, deaths: s.deaths, kos: s.coins, frame: s.frame, fun: fun.fun, parts: fun.parts });
    console.log(`  seed ${seed}: won=${s.won} falls=${s.deaths} kos=${s.coins} f=${s.frame} FUN=${fun.fun} ${JSON.stringify(fun.parts)}${s.won && fun.fun >= 70 ? '  ★' : ''}`);
  } catch (e) { results.push({ seed, err: String(e).slice(0, 80) }); console.log(`  seed ${seed}: ERR`); }
  await p.close();
}
for (let i = 0; i < seeds.length; i += PAR) await Promise.all(seeds.slice(i, i + PAR).map(run));
await browser.close(); server.close();
const winners = results.filter(r => r.won && r.deaths < 3).sort((a, b) => b.fun - a.fun);
console.log(`ARENA ${ARENA}: best by FUN → ${winners.slice(0, 3).map(r => `seed ${r.seed} FUN=${r.fun} falls=${r.deaths} f=${r.frame}`).join(' | ') || 'none won'}`);
