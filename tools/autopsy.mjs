import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const LEVEL = process.env.LEVEL || '2';
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => { let u = req.url.split('?')[0]; if (u === '/') u = '/index.html'; const f = path.join(SRC, u); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(`${BASE}/?r=webgl&level=${LEVEL}&mute=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__ready === true, { timeout: 20000 });
const out = await p.evaluate(() => { const s = window.__gate(12000); return { s, log: (window.__mlog || []).filter(e => e.t === 'autopsy') }; });
console.log('FINAL', JSON.stringify(out.s));
for (const a of out.log) {
  console.log(`--- AUTOPSY fall #${a.fall}`);
  const t = a.tape;
  for (let i = 0; i < t.length; i += 6) console.log('   ', JSON.stringify(t[i]));
  console.log('   ', JSON.stringify(t[t.length - 1]));
}
await b.close(); server.close();
