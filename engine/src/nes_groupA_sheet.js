// no-empty-space group A helper: a contact sheet of PNG frames (side by side, labelled), drawn in headless Chromium.
// node engine/src/nes_groupA_sheet.js <out.jpg> <height px> <img1> <img2> ...   (a Node tool script; not imported by any page)
import path from 'path'; import fs from 'fs'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const { launch } = createRequire(import.meta.url)(path.join(here, '..', '..', 'tools', 'browser.js'));
const [out, hArg, ...imgs] = process.argv.slice(2);
const H = +hArg || 480, b = await launch(), p = await b.newPage();
const data = imgs.map((f) => ({ name: path.basename(f).replace(/\.(png|jpg)$/, ''), src: 'data:image/' + (f.endsWith('.jpg') ? 'jpeg' : 'png') + ';base64,' + fs.readFileSync(f).toString('base64') }));
const jpg = await p.evaluate(async ({ data, H }) => {
  const ims = await Promise.all(data.map((d) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = d.src; })));
  const ws = ims.map((i) => Math.round(i.width * H / i.height)), W = ws.reduce((a, b) => a + b + 4, 0);
  const c = document.createElement('canvas'); c.width = W; c.height = H + 22; const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, W, H + 22);
  let X = 0; ims.forEach((i, k) => { x.drawImage(i, X, 0, ws[k], H); x.fillStyle = '#ddd'; x.font = '13px sans-serif'; x.fillText(data[k].name, X + 3, H + 16); X += ws[k] + 4; });
  return c.toDataURL('image/jpeg', 0.85).slice(23);
}, { data, H });
fs.writeFileSync(out, Buffer.from(jpg, 'base64')); console.log(out); await b.close();
