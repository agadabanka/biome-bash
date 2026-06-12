// Biome Bash music pass — one Lyria-composed loop per arena + the title theme,
// rendered via Vertex AI (lyria-002), converted to seamless mp3 loops.
// Run: node tools/music.mjs [title|clouds|...]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { GoogleAuth } from 'google-auth-library';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/assets/music');
fs.mkdirSync(OUT, { recursive: true });
const FF = (await import('ffmpeg-static')).default;

const SA = JSON.parse(process.env.GEMINI_SA_JSON || '{}');
const PROJECT = SA.project_id;
if (!PROJECT) { console.error('GEMINI_SA_JSON with project_id required'); process.exit(2); }
const auth = new GoogleAuth({ credentials: SA, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

const TRACKS = {
  title: 'Joyful cartoon fighting game title theme, bouncy orchestral pop with brass hits and glockenspiel, playful and heroic, 120 bpm, loopable',
  clouds: 'Light airy cartoon battle theme in the clouds, pizzicato strings, flutes, soft choir aahs, whimsical and bouncy, 124 bpm, loopable',
  jungle: 'Upbeat jungle cartoon brawl theme, tribal drums, marimba, animal-call brass stabs, cheeky and energetic, 128 bpm, loopable',
  volcano: 'Intense playful volcano arena theme, taiko drums, driving low brass, crackling percussion, heroic cartoon danger, 132 bpm, loopable',
  glacier: 'Glittering icy arena battle theme, celesta, sleigh bells, staccato strings, cool synth pads, brisk and crisp, 126 bpm, loopable',
  neon: 'Neon city rooftop fight theme, retro synthwave with funky bass, arcade leads, electro drums, nocturnal and fun, 128 bpm, loopable'
};

const client = await auth.getClient();
const only = process.argv[2];
for (const [key, prompt] of Object.entries(TRACKS)) {
  if (only && only !== key) continue;
  process.stdout.write(`♪ ${key} … `);
  const { token } = await client.getAccessToken();
  const res = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/us-central1/publishers/google/models/lyria-002:predict`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt, negative_prompt: 'vocals, singing, lyrics' }], parameters: { sample_count: 1 } })
  });
  if (!res.ok) { console.error(`\n  lyria ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1); }
  const j = await res.json();
  const b64 = j.predictions?.[0]?.bytesBase64Encoded || j.predictions?.[0]?.audioContent;
  if (!b64) { console.error('\n  no audio in response:', JSON.stringify(j).slice(0, 300)); process.exit(1); }
  const wav = path.join(OUT, `${key}.wav`);
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  // trim the tail breath + gentle fade so the loop seam doesn't click
  execFileSync(FF, ['-y', '-i', wav, '-af', 'afade=t=out:st=28.6:d=0.9', '-t', '29.5', '-b:a', '160k', path.join(OUT, `${key}.mp3`)], { stdio: 'pipe' });
  fs.rmSync(wav);
  console.log(`${(fs.statSync(path.join(OUT, key + '.mp3')).size / 1024).toFixed(0)} KB`);
}
console.log('✓ music pass complete');
