// Drive the LIVE menu until it reaches Play with no errors (verifies a deploy).
import { chromium } from 'playwright';
const URL = process.argv[2] || 'https://biome-bash-production.up.railway.app';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (let attempt = 1; attempt <= 20; attempt++) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 }, ignoreHTTPSErrors: true });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,120)));
  try {
    await p.goto(`${URL}/?mute=1`, { waitUntil: 'load', timeout: 30000 });
    await p.waitForTimeout(1500);
    const sc = () => p.evaluate(() => window.game ? window.game.scene.scenes.filter(s=>s.sys.settings.status===5).map(s=>s.scene.key).join(',') : 'noscene');
    await p.keyboard.press('Space'); await p.waitForTimeout(700);
    await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    await p.keyboard.press('Enter'); await p.waitForTimeout(900);
    const s2 = await sc(); await p.waitForTimeout(3300);
    const xA = await p.evaluate(()=>window.__pX&&window.__pX());
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(900); await p.keyboard.up('ArrowRight');
    const xB = await p.evaluate(()=>window.__pX&&window.__pX());
    const moved = xA!=null && xB!=null && Math.abs(xB-xA)>20;
    if (s2 === 'Play' && moved && errs.length === 0) {
      console.log(`LIVE-PLAYABLE attempt ${attempt}: Play reached, player ${xA}→${xB}, no errors`);
      await b.close(); process.exit(0);
    }
    console.log(`attempt ${attempt}: scene=${s2} moved=${moved} errs=${errs.length}${errs[0]?' '+errs[0]:''} (deploy not live yet)`);
  } catch (e) { console.log(`attempt ${attempt}: ${String(e).split('\n')[0].slice(0,80)}`); }
  await p.close();
  await new Promise(r=>setTimeout(r, 15000));
}
console.log('GAVE UP after 20 attempts'); await b.close(); process.exit(1);
