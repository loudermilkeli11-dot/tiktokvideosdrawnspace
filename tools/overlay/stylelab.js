// Render caption/counter title packages over a frame: node tools/overlay/stylelab.js frame.png outdir [pack ...]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [bg, out, ...packs] = process.argv.slice(2); const P = packs.length ? packs : ['current', 'trailer', 'documentary', 'punch'];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.error(e.message));
  await p.goto('file://' + path.resolve(__dirname, 'stylelab.html'));
  const url = 'data:image/png;base64,' + fs.readFileSync(bg).toString('base64');
  for (const k of P) { const b64 = await p.evaluate(([u, k]) => window.render(u, k), [url, k]); const f = path.join(out, `style_${k}.png`); fs.writeFileSync(f, Buffer.from(b64, 'base64')); console.log(f); }
  await b.close();
})();
