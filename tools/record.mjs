// Biome Bash recorder — renders one full champion-autopilot match per arena to
// MP4 via the deterministic stepper (frame-exact, no realtime), then muxes the
// arena's Lyria loop under it. Run: node tools/record.mjs [arena 1-5] [outdir]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const FF = (await import('ffmpeg-static')).default;
const ARENAS = process.argv[2] ? [Number(process.argv[2])] : [1, 2, 3, 4, 5];
const OUTDIR = path.resolve(process.argv[3] || path.join(ROOT, 'out/videos'));
const HOME_CHAR = { 1: 'puff', 2: 'mango', 3: 'cinder', 4: 'glacia', 5: 'volt' };
const FPS = 60, MAXF = 10000, TAIL = 200, SKIP = 0;
fs.mkdirSync(OUTDIR, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = path.join(SRC, u);
  if (!f.startsWith(SRC) || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--force-color-profile=srgb'] });

for (const N of ARENAS) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/?r=webgl&level=${N}&char=${HOME_CHAR[N]}&mute=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
  await page.evaluate(() => { window.__game.reset(); window.__game.autopilot(true); window.__rec.begin(); });
  const fdir = path.join(OUTDIR, `_frames${N}`);
  fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir, { recursive: true });
  let n = 0, over = 0, frame = 0;
  process.stdout.write(`● arena ${N} (${HOME_CHAR[N]}) recording `);
  while (frame < MAXF && over < TAIL) {
    const r = await page.evaluate(() => {
      window.__rec.step(1);
      const s = window.__game.snapshot();
      const c = document.querySelector('canvas');
      return { s, d: c ? c.toDataURL('image/jpeg', 0.9) : null };
    });
    frame = r.s.frame;
    if (r.s.over) over++;
    if (r.d) fs.writeFileSync(path.join(fdir, `f${String(n++).padStart(5, '0')}.jpg`), Buffer.from(r.d.split(',')[1], 'base64'));
    if (n % 1200 === 0) process.stdout.write('·');
  }
  await page.close();
  const raw = path.join(OUTDIR, `arena${N}_raw.mp4`);
  const out = path.join(OUTDIR, `arena${N}.mp4`);
  execFileSync(FF, ['-y', '-framerate', String(FPS), '-i', path.join(fdir, 'f%05d.jpg'), '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', raw], { stdio: 'pipe' });
  const music = path.join(SRC, 'assets/music', `${{ 1: 'clouds', 2: 'jungle', 3: 'volcano', 4: 'glacier', 5: 'neon' }[N]}.mp3`);
  if (fs.existsSync(music)) {
    execFileSync(FF, ['-y', '-i', raw, '-stream_loop', '-1', '-i', music, '-shortest', '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-af', `volume=0.85,afade=t=out:st=${(n / FPS - 1.8).toFixed(1)}:d=1.6`, '-movflags', '+faststart', out], { stdio: 'pipe' });
    fs.rmSync(raw);
  } else fs.renameSync(raw, out);
  fs.rmSync(fdir, { recursive: true, force: true });
  console.log(` → ${path.basename(out)} (${n} frames, ${(n / FPS).toFixed(0)}s, ${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);
}
await browser.close(); server.close();
console.log('✓ recordings complete →', OUTDIR);
