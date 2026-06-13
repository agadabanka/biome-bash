// Upload every game's recorded shorts to YouTube (UNLISTED), create a per-game
// shorts playlist (unlisted), and emit the data to wire into hub/games.json.
// Reads shorts from <game-engine>/out/shorts/<id>/*.mp4. Requires a broad-scope
// /tmp/yt-creds.json (run tools/yt-reauth.mjs first if needed).
//   node tools/publish-shorts-batch.mjs            (all games with recorded shorts)
//   node tools/publish-shorts-batch.mjs jazz roadwar
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BB = path.resolve(HERE, '..');                 // biome-bash root (has yt-upload.mjs)
const ENGINE = '/home/user/game-engine';
const SHORTS_DIR = path.join(ENGINE, 'out/shorts');
const GAMES = JSON.parse(fs.readFileSync(path.join(ENGINE, 'hub/games.json'), 'utf8'));
const CID = process.env.YT_CLIENT_ID, CSEC = process.env.YT_CLIENT_SECRET, CREDS = '/tmp/yt-creds.json';

async function token() {
  const { refresh_token } = JSON.parse(fs.readFileSync(CREDS, 'utf8'));
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CID, client_secret: CSEC, refresh_token, grant_type: 'refresh_token' }) })).json();
  if (!t.access_token) throw new Error('token refresh failed: ' + JSON.stringify(t).slice(0, 160));
  return t.access_token;
}
function uploadUnlisted(file, title, desc) {
  const out = execFileSync('node', [path.join(BB, 'tools/yt-upload.mjs'), file, title, desc, 'unlisted'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const m = out.match(/youtu\.be\/([\w-]+)/);
  if (!m) throw new Error('no id: ' + out.slice(-160));
  return m[1];
}
async function makePlaylist(tok, title, descr, ids) {
  const H = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };
  const pl = await (await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST', headers: H, body: JSON.stringify({ snippet: { title, description: descr }, status: { privacyStatus: 'unlisted' } }) })).json();
  if (!pl.id) { console.error('  playlist failed:', JSON.stringify(pl).slice(0, 160)); return null; }
  for (const v of ids) await (await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
    method: 'POST', headers: H, body: JSON.stringify({ snippet: { playlistId: pl.id, resourceId: { kind: 'youtube#video', videoId: v } } }) })).json();
  return `https://www.youtube.com/playlist?list=${pl.id}`;
}
const labelFromFile = (g, f) => {
  const lv = Number(/L(\d+)\.mp4$/.exec(f)?.[1] || 0);
  const w = (g.meta && g.meta.worlds) || [];
  if (w[lv - 1]) return { lv, name: w[lv - 1] };
  const vids = (g.meta && g.meta.videos) || {};
  for (const k of Object.keys(vids)) { const m = new RegExp(`level-?${lv}(?:-(.+))?$`, 'i').exec(k); if (m && m[1]) return { lv, name: m[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }; }
  return { lv, name: `Level ${lv}` };
};

const only = process.argv.slice(2);
const tok = await token();
const wired = {};
for (const g of GAMES) {
  if (only.length && !only.includes(g.id)) continue;
  const gdir = path.join(SHORTS_DIR, g.id);
  if (!fs.existsSync(gdir)) continue;
  const files = fs.readdirSync(gdir).filter(f => f.endsWith('.mp4')).sort();
  if (!files.length) continue;
  console.log(`\n${g.name}: ${files.length} shorts`);
  const ids = [], shorts = [];
  for (const f of files) {
    const { lv, name } = labelFromFile(g, f);
    const title = `${g.name}: ${name} #Shorts`;
    const desc = `${g.name} — ${name}. ${g.tagline || ''}\n\nPlay free: ${g.url}\nBuilt by an AI game studio on the game-engine.\n\n#Shorts #IndieGame #Gaming`;
    try {
      const id = uploadUnlisted(path.join(gdir, f), title, desc);
      console.log(`  ↑ ${title} → https://youtu.be/${id}`);
      ids.push(id); shorts.push({ id, title: name, biome: name });
    } catch (e) { console.log(`  ✗ ${f}: ${e.message.slice(0, 80)}`); }
  }
  if (ids.length) {
    const pl = await makePlaylist(tok, `${g.name} — Shorts`, `Vertical highlight reels. Play free: ${g.url}`, ids);
    console.log(`  ✅ playlist: ${pl}`);
    wired[g.id] = { shorts, shortsPlaylist: pl };
  }
}
fs.writeFileSync(path.join(SHORTS_DIR, 'wired.json'), JSON.stringify(wired, null, 2));
console.log('\nDONE. wired →', path.join(SHORTS_DIR, 'wired.json'));
