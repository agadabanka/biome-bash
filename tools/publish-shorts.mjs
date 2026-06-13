// Upload the vertical Shorts to YouTube (UNLISTED) and emit ids → out/shorts/links.json.
//   node tools/publish-shorts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out/shorts');
const LIVE = 'https://biome-bash-production.up.railway.app';
const SHORTS = [
  { f: 'short1-clouds.mp4', name: 'Cumulus Courtyard', biome: 'Clouds', who: 'Puff' },
  { f: 'short2-jungle.mp4', name: 'Canopy Clash', biome: 'Jungle', who: 'Mango' },
  { f: 'short3-volcano.mp4', name: 'Caldera Rim', biome: 'Volcano', who: 'Cinder' },
  { f: 'short4-glacier.mp4', name: 'Glacier Shelf', biome: 'Glacier', who: 'Glacia' },
  { f: 'short5-neon-city.mp4', name: 'Neon Rooftops', biome: 'Neon City', who: 'Volt' },
];
const desc = (s) => `${s.name} — ${s.who} brawls in the ${s.biome} biome. Five toony fighters, five wild biomes, last toon standing.

Play Biome Bash free: ${LIVE}
A Smash-style platform brawler built end-to-end by an AI game studio on the game-engine.

#Shorts #IndieGame #Gaming #Platformer #BiomeBash`;
const links = {}; const ids = [];
for (const s of SHORTS) {
  const file = path.join(OUT, s.f);
  if (!fs.existsSync(file)) { console.log(`! missing ${s.f}`); continue; }
  const title = `Biome Bash: ${s.name} (${s.biome}) #Shorts`;
  const out = execFileSync('node', [path.join(ROOT, 'tools/yt-upload.mjs'), file, title, desc(s), 'unlisted'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const m = out.match(/youtu\.be\/([\w-]+)/);
  if (!m) { console.log(`! no id for ${s.f}: ${out.slice(-160)}`); continue; }
  console.log(`  ↑ ${title} → https://youtu.be/${m[1]}`);
  links[s.f.replace(/\.mp4$/, '')] = `https://youtu.be/${m[1]}`; ids.push(m[1]);
}
fs.writeFileSync(path.join(OUT, 'links.json'), JSON.stringify({ links, ids }, null, 2));
console.log('\nIDS:', ids.join(','));
