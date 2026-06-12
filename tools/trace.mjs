// Match tracer: run one arena under the champion autopilot, dump the KO
// timeline + per-fighter end stats + periodic player telemetry.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const LEVEL = process.env.LEVEL || '1';
const FRAMES = Number(process.env.FRAMES || 9000);
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => { let u = req.url.split('?')[0]; if (u === '/') u = '/index.html'; const f = path.join(SRC, u); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 160)));
await p.goto(`${BASE}/?r=webgl&level=${LEVEL}&mute=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__ready === true, { timeout: 20000 });
const out = await p.evaluate((maxF) => {
  window.__game.reset(); window.__game.autopilot(true); window.__rec.begin();
  const tel = [];
  let s = window.__game.snapshot();
  while (!s.won && !s.dead && s.frame < maxF && !s.over) {
    window.__rec.step(30);
    s = window.__game.snapshot();
    tel.push({ f: s.frame, x: s.x, y: s.y, dmg: s.dmg, deaths: s.deaths, kos: s.coins, alive: s.alive });
  }
  return { final: s, log: window.__mlog || [], tel: tel.filter((_, i) => i % 10 === 0) };
}, FRAMES);
console.log('FINAL', JSON.stringify(out.final));
console.log('KO TIMELINE:');
out.log.filter(e => e.t === 'ko').forEach(e => console.log(` f${e.f} ${e.who} KOd by ${e.by || 'self/fall'} at (${e.x},${e.y}) stocksLeft=${e.stocks}`));
const hits = out.log.filter(e => e.t === 'hit');
const agg = {};
hits.forEach(h => { agg[h.a] = (agg[h.a] || 0) + 1; });
console.log('HITS LANDED BY:', JSON.stringify(agg), 'total', hits.length);
console.log('PLAYER TELEMETRY (every ~300f):');
out.tel.forEach(t => console.log(` f${t.f} pos(${t.x},${t.y}) dmg=${t.dmg} falls=${t.deaths} kos=${t.kos} alive=${t.alive}`));
await b.close(); server.close();
