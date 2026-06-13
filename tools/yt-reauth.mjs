// One-time re-authorization for the broader `youtube` scope (the saved token is
// upload-only, which can't create playlists). Device flow: prints a URL + code,
// you authorize once, then it creates BOTH playlists and saves the new refresh
// token for future use.
//   node tools/yt-reauth.mjs
// Env: YT_CLIENT_ID, YT_CLIENT_SECRET. Reads ids from out/shorts/links.json +
// out/videos/links.json. Writes the code to /tmp/yt-code.json immediately.
import fs from 'node:fs';
const CID = process.env.YT_CLIENT_ID, CSEC = process.env.YT_CLIENT_SECRET;
const CREDS = '/tmp/yt-creds.json', CODEOUT = '/tmp/yt-code.json';
if (!CID || !CSEC) { console.error('set YT_CLIENT_ID + YT_CLIENT_SECRET'); process.exit(2); }
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let token = null, refresh = null;
const overallDeadline = Date.now() + 6 * 3600 * 1000;   // keep a code alive up to 6h
while (!token && Date.now() < overallDeadline) {
  const dc = await (await fetch('https://oauth2.googleapis.com/device/code', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CID, scope: SCOPE }) })).json();
  if (!dc.device_code) { console.error('device code failed:', JSON.stringify(dc)); process.exit(1); }
  const url = dc.verification_url || dc.verification_uri;
  fs.writeFileSync(CODEOUT, JSON.stringify({ user_code: dc.user_code, verification_url: url }, null, 2));
  console.log('\n================ AUTHORIZE (one time) ================');
  console.log('1) Go to:', url);
  console.log('2) Enter code:', dc.user_code, '  (valid ~30 min; auto-refreshes)');
  console.log('=====================================================\n');
  const deadline = Date.now() + (dc.expires_in || 1800) * 1000;
  const interval = (dc.interval || 5) * 1000;
  let expired = false;
  while (Date.now() < deadline && !token && !expired) {
    await sleep(interval);
    const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CID, client_secret: CSEC, device_code: dc.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }) })).json();
    if (t.access_token) { token = t.access_token; refresh = t.refresh_token; }
    else if (t.error === 'expired_token') { expired = true; }      // refresh the code
    else if (t.error && !['authorization_pending', 'slow_down'].includes(t.error)) { console.error('auth error:', t.error); process.exit(1); }
  }
}
if (!token) { console.error('authorization timed out'); process.exit(1); }
if (refresh) fs.writeFileSync(CREDS, JSON.stringify({ refresh_token: refresh, scope: SCOPE }, null, 2));
console.log('✓ authorized (broad scope). refresh token saved to', CREDS);

const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function makePlaylist(title, descr, privacy, ids) {
  const pl = await (await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST', headers: H, body: JSON.stringify({ snippet: { title, description: descr }, status: { privacyStatus: privacy } }) })).json();
  if (!pl.id) { console.error('playlist create failed:', JSON.stringify(pl).slice(0, 200)); return null; }
  for (const v of ids) {
    await (await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
      method: 'POST', headers: H, body: JSON.stringify({ snippet: { playlistId: pl.id, resourceId: { kind: 'youtube#video', videoId: v } } }) })).json();
  }
  const link = `https://www.youtube.com/playlist?list=${pl.id}`;
  console.log(`✅ ${title} (${privacy}): ${link}`);
  return link;
}
const LIVE = 'https://biome-bash-production.up.railway.app';
const shorts = JSON.parse(fs.readFileSync('out/shorts/links.json', 'utf8')).ids;
const main = Object.values(JSON.parse(fs.readFileSync('out/videos/links.json', 'utf8'))).map((u) => /([\w-]{6,})$/.exec(u)[1]);
const shortsPl = await makePlaylist('Biome Bash — Shorts', `Vertical highlight reels from all five biomes. Play free: ${LIVE}`, 'unlisted', shorts);
const mainPl = await makePlaylist('Biome Bash — five biomes, one champion', `Five toony fighters, five wild biomes. Play free: ${LIVE}`, 'public', main);
fs.writeFileSync('out/playlists.json', JSON.stringify({ shorts: shortsPl, main: mainPl }, null, 2));
console.log('\nDONE. playlists →', JSON.stringify({ shorts: shortsPl, main: mainPl }));
