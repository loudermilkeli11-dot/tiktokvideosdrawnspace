// Full-size key frames of a page: node tools/frames.js page.html outdir t1 t2 ... [--scale 1] [--mb n]   (t = shot time, s)
const { launch, fileUrl } = require('./browser.js'); const fs = require('fs'); const path = require('path');
const A = process.argv.slice(2); const arg = (k, d) => { const i = A.indexOf('--' + k); if (i < 0) return d; const v = A[i + 1]; A.splice(i, 2); return v; };
const scale = arg('scale', '1'), mb = arg('mb', ''), q = arg('q', '');   // --q 'k=v&k2=v2': extra page query
const [pg, dir, ...ts] = A.filter((x) => x !== '--gpu'); fs.mkdirSync(dir, { recursive: true });
(async () => {
  const b = await launch();
  const p = await b.newPage(); p.on('pageerror', (e) => console.error('[pageerror]', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  await p.goto(fileUrl(pg) + `?static&scale=${scale}${mb ? '&mb=' + mb : ''}${q ? '&' + q : ''}`, { timeout: 600000 });
  await p.waitForFunction(() => window.ASSETS_READY === true || window.ASSETS_ERROR, null, { timeout: 600000, polling: 250 });
  const err = await p.evaluate(() => window.ASSETS_ERROR); if (err) throw new Error(err);
  for (const t of ts) { const s = Date.now();
    const b64 = await p.evaluate((t) => { window.frame(4 + t); return window.cv.toDataURL('image/png').slice(22); }, +t);
    const f = path.join(dir, `${path.basename(pg, '.html')}${q ? '_' + q.replace(/[^a-z0-9]+/gi, '-') : ''}_t${(+t).toFixed(2)}.png`); fs.writeFileSync(f, Buffer.from(b64, 'base64')); console.log(f, ((Date.now() - s) / 1000).toFixed(1) + 's'); }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
