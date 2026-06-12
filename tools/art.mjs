// Biome Bash art pass — Gemini backdrops for the five biome arenas + title key
// art. Characters stay procedural (Studio.Toon rigs ARE the on-model art); the
// backdrops set each biome's mood. Run: node tools/art.mjs [clouds|jungle|...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImage } from './gemini.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BG = path.join(ROOT, 'src/assets/bg');
fs.mkdirSync(BG, { recursive: true });

const STYLE = 'Saturday-morning cartoon background art, bold shapes, clean soft painterly shading, vivid toy-like colors, NO characters, NO text, NO logos. The bottom third must stay simple and uncluttered (gameplay platforms overlay it). Wide establishing shot.';

const SHOTS = {
  clouds: `Dreamy sky kingdom of puffy cumulus clouds at golden hour, floating cloud islands, distant rainbows and soft sun rays, pastel blue sky. ${STYLE}`,
  jungle: `Lush cartoon jungle canopy seen from inside the treetops, giant leaves, hanging vines, shafts of green-gold light, distant misty trees. ${STYLE}`,
  volcano: `Cartoon volcano caldera at night, glowing orange lava far below, drifting embers, dark basalt crags, dramatic red-orange sky with smoke clouds. ${STYLE}`,
  glacier: `Sparkling cartoon glacier shelf, turquoise ice cliffs, snowy peaks, aurora borealis ribbons in a deep blue twilight sky, falling snow. ${STYLE}`,
  neon: `Cartoon cyberpunk city rooftops at night, neon pink and cyan signs, glowing windows, purple sky, silhouetted skyline, light rain glow. ${STYLE}`
};

const only = process.argv[2];
for (const [key, prompt] of Object.entries(SHOTS)) {
  if (only && only !== key) continue;
  const out = path.join(BG, `${key}.png`);
  process.stdout.write(`• ${key} … `);
  const img = await generateImage(prompt, { aspectRatio: '16:9' });
  fs.writeFileSync(out, Buffer.from(img.base64, 'base64'));
  console.log(`${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}
if (!only || only === 'keyart') {
  process.stdout.write('• keyart … ');
  const img = await generateImage(
    `Video-game key art, joyful cartoon brawl: five chibi toy-like fighters mid-leap toward the camera on a floating cloud arena — a round white-blue cloud sprite, a brown monkey with a leaf sprout, a red magma imp with tiny horns, a pale-blue fluffy yeti, and an indigo robot with one antenna and a cyan visor. All with bold dark outlines, big glossy eyes, floating round hands (no arms). Behind them a split sky: clouds, jungle, volcano, glacier and neon city wedges. Confetti and stars. NO text, NO logos. ${'' /* style baked in prompt */}`,
    { aspectRatio: '16:9' }
  );
  fs.writeFileSync(path.join(ROOT, 'src/assets/keyart.png'), Buffer.from(img.base64, 'base64'));
  console.log('done');
}
console.log('✓ art pass complete');
