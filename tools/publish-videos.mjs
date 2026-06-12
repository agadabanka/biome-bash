// Upload the five arena videos + montage to YouTube, then try to build the
// playlist. Emits out/videos/links.json for GAME_META/hub wiring.
//   node tools/publish-videos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VID = path.join(ROOT, 'out/videos');
const LIVE = 'https://biome-bash-production.up.railway.app';
const ARENAS = [
  { n: 1, slug: 'cumulus-courtyard', name: 'Cumulus Courtyard', biome: 'Clouds', who: 'Puff' },
  { n: 2, slug: 'canopy-clash', name: 'Canopy Clash', biome: 'Jungle', who: 'Mango' },
  { n: 3, slug: 'caldera-rim', name: 'Caldera Rim', biome: 'Volcano', who: 'Cinder' },
  { n: 4, slug: 'glacier-shelf', name: 'Glacier Shelf', biome: 'Glacier', who: 'Glacia' },
  { n: 5, slug: 'neon-rooftops', name: 'Neon Rooftops', biome: 'Neon City', who: 'Volt' }
];
const DESC = (extra) => `${extra}

Biome Bash — five toony fighters, five wild biomes, last toon standing.
A Smash-style platform brawler built END-TO-END by an AI studio on the game-engine:
procedural Studio.Toon character rigs (17 animation states), Studio.Brawl knockback
combat, Gemini-painted biome backdrops, a Lyria score per arena — and every arena
gated by a FLAWLESS champion-autopilot victory (0 stocks lost), deterministic and
replayable bit-for-bit.

Play it live: ${LIVE}
Repo: https://github.com/agadabanka/biome-bash`;

function upload(file, title, desc) {
  const out = execFileSync('node', [path.join(ROOT, 'tools/yt-upload.mjs'), file, title, desc, 'public'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const m = out.match(/youtu\.be\/([\w-]+)/);
  if (!m) throw new Error('no video id in: ' + out.slice(-200));
  console.log(`  ↑ ${title} → https://youtu.be/${m[1]}`);
  return m[1];
}

const links = {};
const ids = [];
for (const a of ARENAS) {
  const f = path.join(VID, `arena${a.n}.mp4`);
  if (!fs.existsSync(f)) { console.log(`! missing ${f}, skipping`); continue; }
  const id = upload(f, `Biome Bash — Arena ${a.n}: ${a.name} (${a.biome})`,
    DESC(`Arena ${a.n} of 5 — ${a.name}, home turf of ${a.who}. One full 1v3 match, champion autopilot at the sticks.`));
  links[`biome-bash-level-${a.n}-${a.slug}`] = `https://youtu.be/${id}`;
  ids.push(id);
}
const mont = path.join(VID, 'biome-bash-montage.mp4');
if (fs.existsSync(mont)) {
  const id = upload(mont, 'Biome Bash — five biomes, one champion (montage)',
    DESC('The montage: all five biome arenas in 50 seconds.'));
  links['biome-bash-montage'] = `https://youtu.be/${id}`;
  ids.push(id);
}
fs.writeFileSync(path.join(VID, 'links.json'), JSON.stringify(links, null, 2));
console.log(JSON.stringify(links, null, 2));
try {
  execFileSync('node', [path.join(ROOT, 'tools/yt-playlist.mjs'), 'Biome Bash — five biomes, one champion',
    'Five toony fighters, five wild biomes — last toon standing. Built by an AI studio on the game-engine.', ...ids], { stdio: 'inherit' });
} catch { console.log('(playlist needs broader YouTube scope — videos are up; add them to a playlist from YouTube Studio in one click)'); }
