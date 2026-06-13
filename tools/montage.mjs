// Biome Bash montage — title card + the best slice of each arena video + outro,
// xfade-chained with a Lyria music bed. Inputs are tools/record.mjs outputs.
//   node tools/montage.mjs [outfile]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VID = path.join(ROOT, 'out/videos');
const WORK = path.join(ROOT, 'out/montage');
const OUT = path.resolve(process.argv[2] || path.join(VID, 'biome-bash-montage.mp4'));
const FF = (await import('ffmpeg-static')).default;
const ff = (args) => execFileSync(FF, ['-y', ...args], { stdio: 'pipe' });
const W = 960, H = 540, FPS = 60, XF = 0.5;
fs.mkdirSync(WORK, { recursive: true });

const ARENAS = [
  { n: 1, name: 'Cumulus Courtyard', biome: 'CLOUDS', who: 'Puff' },
  { n: 2, name: 'Canopy Clash', biome: 'JUNGLE', who: 'Mango' },
  { n: 3, name: 'Caldera Rim', biome: 'VOLCANO', who: 'Cinder' },
  { n: 4, name: 'Glacier Shelf', biome: 'GLACIER', who: 'Glacia' },
  { n: 5, name: 'Neon Rooftops', biome: 'NEON CITY', who: 'Volt' }
];

// ── text cards + lower thirds via headless chromium (no drawtext in this ffmpeg)
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const pg = await browser.newPage({ viewport: { width: W, height: H } });
const FONT = `'Arial Black','Helvetica Neue',Arial,sans-serif`;
async function png(file, inner, transparent) {
  await pg.setContent(`<!doctype html><body style="margin:0;width:${W}px;height:${H}px;font-family:${FONT};overflow:hidden">${inner}</body>`);
  await pg.waitForTimeout(50);
  await pg.screenshot({ path: file, omitBackground: !!transparent });
}
const card = (title, sub, big) => `
  <div style="position:absolute;inset:0;background:#0b1021"></div>
  <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:820px;height:820px;border-radius:50%;background:radial-gradient(circle,#ffd16622,transparent 60%)"></div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
    <div style="font-size:${big || 84}px;font-weight:900;color:#fff;letter-spacing:2px;line-height:1.05;text-shadow:0 6px 40px rgba(0,0,0,.7)">${title}</div>
    <div style="margin-top:22px;height:5px;width:130px;background:#ffd166;border-radius:3px"></div>
    <div style="margin-top:20px;font-size:28px;color:#cfe9ff;letter-spacing:5px;text-transform:uppercase">${sub || ''}</div>
  </div>`;
const cap = (name, feat) => `
  <div style="position:absolute;left:0;right:0;bottom:0;height:240px;background:linear-gradient(to top,rgba(6,9,18,.85),transparent)"></div>
  <div style="position:absolute;left:52px;bottom:56px">
    <div style="font-size:52px;font-weight:900;color:#fff;text-shadow:0 4px 22px rgba(0,0,0,.95)">${name}</div>
    <div style="margin-top:9px;height:5px;width:110px;background:#ffd166;border-radius:3px"></div>
    <div style="margin-top:12px;font-size:26px;font-weight:700;color:#eaf6ff;text-shadow:0 2px 14px #000">${feat || ''}</div>
  </div>`;

const segs = [];
async function cardSeg(tag, title, sub, dur, big) {
  const p = path.join(WORK, `card${tag}.png`), out = path.join(WORK, `seg${tag}.mp4`);
  await png(p, card(title, sub, big), false);
  ff(['-loop', '1', '-t', String(dur), '-i', p, '-filter_complex',
    `[0:v]fps=${FPS},scale=${W}:${H},setsar=1,format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=${(dur - 0.4).toFixed(2)}:d=0.4[v]`,
    '-map', '[v]', '-t', String(dur), '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', out]);
  segs.push({ f: out, dur });
}
async function clipSeg(tag, src, start, dur, name, feat) {
  const out = path.join(WORK, `seg${tag}.mp4`);
  const capf = path.join(WORK, `cap${tag}.png`);
  await png(capf, cap(name, feat), true);
  ff(['-ss', String(start), '-t', String(dur + 0.5), '-i', src, '-loop', '1', '-t', String(dur), '-i', capf,
    '-filter_complex',
    // re-assert fps AFTER overlay: the caption PNG-loop drags the overlay output
    // to 25fps otherwise, and xfade rejects mismatched framerates (-22).
    `[0:v]scale=${W}:${H},fps=${FPS},setsar=1,setpts=PTS-STARTPTS[g];[1:v]format=rgba,fade=t=in:st=0.25:d=0.4:alpha=1,fade=t=out:st=${(dur - 0.7).toFixed(2)}:d=0.4:alpha=1[c];[g][c]overlay=0:0,fps=${FPS},format=yuv420p[v]`,
    '-map', '[v]', '-t', String(dur), '-an', '-r', String(FPS), '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', out]);
  segs.push({ f: out, dur });
}

await cardSeg('00', 'BIOME&nbsp;BASH', 'five toony fighters · five wild biomes', 3.2, 96);
let i = 1;
for (const a of ARENAS) {
  const src = path.join(VID, `arena${a.n}.mp4`);
  if (!fs.existsSync(src)) { console.log(`! missing ${src}`); continue; }
  // start a beat after GO (countdown is 3s), grab the mid-match action
  await clipSeg(String(i).padStart(2, '0'), src, a.n === 1 ? 4 : 12, 7.2, a.name, `${a.biome} · home turf of ${a.who}`);
  i++;
}
await cardSeg('98', 'EVERY ARENA<br>AI-PLAYTESTED', 'a flawless victory, by construction', 3.4, 64);
await cardSeg('99', 'BIOME&nbsp;BASH', 'built on the game-engine · Gemini art · Lyria music', 4.0, 84);
await browser.close();

// ── xfade chain
const ins = []; segs.forEach(s => ins.push('-i', s.f));
let fc = '', prev = '[0:v]', acc = segs[0].dur;
for (let k = 1; k < segs.length; k++) {
  const lbl = k === segs.length - 1 ? '[vout]' : `[x${k}]`;
  fc += `${prev}[${k}:v]xfade=transition=fade:duration=${XF}:offset=${(acc - XF).toFixed(3)}${lbl};`;
  prev = lbl; acc += segs[k].dur - XF;
}
fc = fc.replace(/;$/, '');
ff([...ins, '-filter_complex', fc, '-map', '[vout]', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', path.join(WORK, '_video.mp4')]);
const TOTAL = acc;

// ── music bed: title + volcano + neon, crossfaded thirds
const M = path.join(ROOT, 'src/assets/music');
const tracks = ['title.mp3', 'volcano.mp3', 'neon.mp3'].map(t => path.join(M, t)).filter(f => fs.existsSync(f));
if (tracks.length) {
  const per = TOTAL / tracks.length + 1.5;
  const tin = []; tracks.forEach(t => tin.push('-i', t));
  let af = '', p = '';
  tracks.forEach((_, ti) => { af += `[${ti}:a]atrim=0:${per.toFixed(2)}${ti === 0 ? ',afade=t=in:st=0:d=1.0' : ''}[t${ti}];`; });
  p = '[t0]';
  for (let ti = 1; ti < tracks.length; ti++) { af += `${p}[t${ti}]acrossfade=d=0.9[a${ti}];`; p = `[a${ti}]`; }
  af += `${p}atrim=0:${TOTAL.toFixed(2)},afade=t=out:st=${(TOTAL - 1.6).toFixed(2)}:d=1.6,volume=0.9[aout]`;
  ff([...tin, '-filter_complex', af, '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', path.join(WORK, '_music.m4a')]);
  ff(['-i', path.join(WORK, '_video.mp4'), '-i', path.join(WORK, '_music.m4a'),
    '-filter_complex', `[0:v]fade=t=in:st=0:d=0.5,fade=t=out:st=${(TOTAL - 0.8).toFixed(2)}:d=0.8[v]`,
    '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT]);
} else {
  fs.copyFileSync(path.join(WORK, '_video.mp4'), OUT);
}
console.log(`✅ MONTAGE → ${OUT} (${TOTAL.toFixed(1)}s, ${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB)`);
