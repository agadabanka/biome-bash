// ── SHORTS builder ───────────────────────────────────────────────────────────
// Turn the horizontal arena recordings into vertical YouTube Shorts (1080x1920,
// <=60s): a blurred biome backdrop, the sharp gameplay centered, a bold title
// banner up top and a Play CTA at the bottom, keeping the arena's music. The
// slice is a late-match highlight window (action clusters near the KOs).
//   node tools/shorts.mjs            (all arenas)
//   node tools/shorts.mjs 3          (just arena 3)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VID = path.join(ROOT, 'out/videos');
const OUT = path.join(ROOT, 'out/shorts');
const WORK = path.join(OUT, '_work');
const FF = (await import('ffmpeg-static')).default;
const ff = (args) => execFileSync(FF, ['-y', ...args], { stdio: 'pipe' });
const LIVE = 'https://biome-bash-production.up.railway.app';
fs.mkdirSync(WORK, { recursive: true });

// per-arena: home fighter, match length (s), and a late highlight start (s)
const ARENAS = [
  { n: 1, name: 'Cumulus Courtyard', biome: 'CLOUDS', who: 'Puff', tint: '#9ecbff', dur: 113, start: 40 },
  { n: 2, name: 'Canopy Clash', biome: 'JUNGLE', who: 'Mango', tint: '#ffc24d', dur: 129, start: 52 },
  { n: 3, name: 'Caldera Rim', biome: 'VOLCANO', who: 'Cinder', tint: '#ff7b54', dur: 58, start: 14 },
  { n: 4, name: 'Glacier Shelf', biome: 'GLACIER', who: 'Glacia', tint: '#a8e8ff', dur: 118, start: 44 },
  { n: 5, name: 'Neon Rooftops', biome: 'NEON CITY', who: 'Volt', tint: '#6ef3ff', dur: 93, start: 30 },
];
const SHORT = 33; // seconds
const W = 1080, H = 1920, GW = 1080, GH = Math.round(1080 * 540 / 960); // 1080x608 gameplay

const only = process.argv[2] ? Number(process.argv[2]) : null;

// ── render the title + CTA overlays via headless chromium (crisp typography) ──
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const pg = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const FONT = `'Arial Black','Helvetica Neue',Arial,sans-serif`;
async function overlayPNG(file, a) {
  const html = `<!doctype html><html><body style="margin:0;width:${W}px;height:${H}px;font-family:${FONT};overflow:hidden">
    <!-- top title banner -->
    <div style="position:absolute;top:70px;left:0;right:0;text-align:center;padding:0 40px">
      <div style="display:inline-block;background:linear-gradient(180deg,rgba(8,11,20,.86),rgba(8,11,20,.66));border:3px solid ${a.tint};border-radius:26px;padding:22px 38px;box-shadow:0 10px 40px rgba(0,0,0,.6)">
        <div style="font-size:74px;font-weight:900;color:#fff;letter-spacing:2px;line-height:1;text-shadow:0 4px 18px rgba(0,0,0,.8)">BIOME BASH</div>
        <div style="margin-top:14px;font-size:40px;font-weight:900;color:${a.tint};letter-spacing:1px">${a.name}</div>
        <div style="margin-top:6px;font-size:27px;font-weight:700;color:#dfeaff;letter-spacing:5px">${a.biome} · ${a.who.toUpperCase()}</div>
      </div>
    </div>
    <!-- bottom CTA -->
    <div style="position:absolute;bottom:120px;left:0;right:0;text-align:center;padding:0 40px">
      <div style="display:inline-block;background:${a.tint};color:#0a0f1c;font-size:54px;font-weight:900;letter-spacing:2px;padding:22px 56px;border-radius:50px;box-shadow:0 10px 36px rgba(0,0,0,.55)">▶ PLAY FREE</div>
      <div style="margin-top:22px;font-size:32px;font-weight:800;color:#fff;letter-spacing:1px;text-shadow:0 3px 14px rgba(0,0,0,.9)">biome-bash-production.up.railway.app</div>
      <div style="margin-top:10px;font-size:26px;font-weight:800;color:#ffd166;letter-spacing:3px">#Shorts · #IndieGame</div>
    </div>
  </body></html>`;
  await pg.setContent(html); await pg.waitForTimeout(60);
  await pg.screenshot({ path: file, omitBackground: true });
}

const made = [];
for (const a of ARENAS) {
  if (only && a.n !== only) continue;
  const src = path.join(VID, `arena${a.n}.mp4`);
  if (!fs.existsSync(src)) { console.log(`! missing ${src}`); continue; }
  const ov = path.join(WORK, `ov${a.n}.png`);
  await overlayPNG(ov, a);
  const out = path.join(OUT, `short${a.n}-${a.biome.toLowerCase().replace(/\s+/g, '-')}.mp4`);
  // blurred bg (fill 1080x1920) + sharp gameplay centered + overlay banner/cta + keep audio
  const fc = [
    `[0:v]split=2[bg][fg]`,
    `[bg]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=28:2,eq=brightness=-0.18:saturation=1.1[bgb]`,
    `[fg]scale=${GW}:${GH}[fgs]`,
    `[bgb][fgs]overlay=0:(H-${GH})/2[base]`,
    `[base][1:v]overlay=0:0,format=yuv420p[v]`,
  ].join(';');
  ff([
    '-ss', String(a.start), '-t', String(SHORT), '-i', src,
    '-i', ov,
    '-filter_complex', fc,
    '-map', '[v]', '-map', '0:a?',
    '-af', `afade=t=out:st=${SHORT - 1.2}:d=1.2,volume=1.0`,
    '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '60',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out,
  ]);
  const mb = (fs.statSync(out).size / 1048576).toFixed(1);
  console.log(`✓ arena ${a.n} → ${path.basename(out)} (${SHORT}s, ${W}x${H}, ${mb} MB)`);
  made.push(out);
}
await browser.close();
console.log(`\n✅ ${made.length} shorts → ${OUT}`);
