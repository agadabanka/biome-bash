// Create a YouTube playlist and add uploaded videos to it.
//   node tools/yt-playlist.mjs "<title>" "<desc>" <videoId> [videoId...]
import fs from 'node:fs';
const CID = process.env.YT_CLIENT_ID, CSEC = process.env.YT_CLIENT_SECRET;
const CREDS = '/tmp/yt-creds.json';
const [TITLE, DESC, ...IDS] = process.argv.slice(2);
if (!CID || !CSEC || !TITLE || !IDS.length) { console.error('usage: yt-playlist.mjs <title> <desc> <videoId...> (env YT_CLIENT_ID/SECRET + creds)'); process.exit(2); }
if (!fs.existsSync(CREDS) && process.env.YT_REFRESH_TOKEN) fs.writeFileSync(CREDS, JSON.stringify({ refresh_token: process.env.YT_REFRESH_TOKEN }, null, 2));
const { refresh_token } = JSON.parse(fs.readFileSync(CREDS, 'utf8'));
const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: CID, client_secret: CSEC, refresh_token, grant_type: 'refresh_token' }) })).json();
if (!tok.access_token) { console.error('auth failed:', JSON.stringify(tok).slice(0, 200)); process.exit(1); }
const H = { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' };
const pl = await (await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
  method: 'POST', headers: H, body: JSON.stringify({ snippet: { title: TITLE, description: DESC }, status: { privacyStatus: 'public' } }) })).json();
if (!pl.id) { console.error('playlist create failed:', JSON.stringify(pl).slice(0, 300)); process.exit(1); }
for (const v of IDS) {
  const r = await (await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
    method: 'POST', headers: H, body: JSON.stringify({ snippet: { playlistId: pl.id, resourceId: { kind: 'youtube#video', videoId: v } } }) })).json();
  console.log(r.id ? `  + ${v}` : `  ! ${v}: ${JSON.stringify(r).slice(0, 160)}`);
}
console.log(`✅ PLAYLIST https://www.youtube.com/playlist?list=${pl.id}`);
