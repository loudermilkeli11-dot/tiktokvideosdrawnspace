// One command from a built project to the finished, checked film (any OS; on the Commander's PC it uses the GPU).
//   node tools/render_all.js projects/<slug> [--quality draft|standard|max] [--shots a,b] [--no-assemble] [--reuse] [--jobs N]
// Steps: captions first (safe-area check, seconds) -> shots, N at a time (+ their sound) -> score -> assemble (-14 LUFS) -> QC.
// Quality: draft = half size, 1 sample (look checks only, no assembly); standard = each shot's own samples;
//          max = 16 motion-blur/anti-alias sub-samples per frame, near-lossless intermediates, a higher-bitrate final.
// --reuse: skip shots already rendered at this quality whose inputs have not changed since (the shot and its sound, the
//          project's shared modules, story/kit, shots.txt and every engine file). Renders are deterministic, so a reused shot
//          is identical to a fresh one.
// Prints "STEP <name>", "PROGRESS <done>/<total>" and finally "RESULT PASS|FAIL <detail>" lines (the War Room reads them).
const { spawnSync, spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const A = process.argv.slice(2); const opt = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..'); process.chdir(ROOT);
const P = A[0] && path.normalize(A[0]).replace(/[\\/]+$/, '').replace(/\\/g, '/');
if (!P || !fs.existsSync(path.join(P, 'shots.txt'))) { console.error('usage: node tools/render_all.js projects/<slug> [--quality draft|standard|max] [--shots a,b] [--reuse] [--jobs N]'); process.exit(2); }
const Q = opt('quality', 'standard'), only = opt('shots', '') ? opt('shots').split(',').map((x) => x.trim()) : null, assemble = !A.includes('--no-assemble') && Q !== 'draft';
const PROFILE = { draft: { scale: 0.5, mb: 1, crf: 18 }, standard: { scale: 1, mb: '', crf: 12 }, max: { scale: 1, mb: 16, crf: 8, targetMb: 120, preset: 'slow' } }[Q];
if (!PROFILE) { console.error('quality must be draft, standard or max'); process.exit(2); }
if (process.platform === 'win32' && process.env.IJ_GPU === undefined) process.env.IJ_GPU = '1';   // the PC's graphics card
const GPU = process.env.IJ_GPU === '1', JOBS = Math.max(1, +opt('jobs', GPU ? 2 : 1));      // 2 shots at once keep the GPU busy
const which = (c) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [c], { stdio: 'ignore' }).status === 0;
const PY = process.env.PYTHON || [process.platform === 'win32' ? 'python' : 'python3', 'py', 'python', 'python3'].find((c) => which(c) && spawnSync(c, ['-c', 'import numpy'], { stdio: 'ignore' }).status === 0) || 'python3';
process.env.PYTHON = PY;
const BASH = process.platform === 'win32' ? [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'), 'bash'].find((b) => b === 'bash' || fs.existsSync(b)) : 'bash';
const fail = (what) => { console.log(`RESULT FAIL ${what}`); process.exit(1); };
function run(cmd, args, what) { const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env }); if (r.status !== 0) fail(`${what} failed (exit ${r.status ?? r.error?.message})`); }
function runAsync(cmd, args, tag) {   // child output is prefixed with the shot name so parallel logs stay readable
  return new Promise((ok) => {
    const c = spawn(cmd, args, { env: process.env }); let buf = '';
    const out = (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1); if (l.trim()) console.log(`  [${tag}] ${l}`); } };
    c.stdout.on('data', out); c.stderr.on('data', out); c.on('close', (code) => ok(code)); c.on('error', () => ok(-1));
  });
}
const shots = fs.readFileSync(path.join(P, 'shots.txt'), 'utf8').split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).map((l) => { const [name, n] = l.split(/\s+/); return { name, n: +n }; });
fs.mkdirSync(path.join(P, 'out'), { recursive: true }); fs.mkdirSync(path.join(P, 'dist'), { recursive: true });
const t0 = Date.now();

// ---- freshness (for --reuse)
const mtime = (f) => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } };
const newestIn = (dir, keep = () => true) => { let m = 0; try { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); m = Math.max(m, f.isDirectory() ? newestIn(p, keep) : keep(f.name) ? mtime(p) : 0); } } catch {} return m; };
const shotNames = new Set(shots.map((s) => s.name));
const isShotFile = (f) => { const b = f.replace(/\.js$/, '').replace(/_sound$/, ''); return shotNames.has(b); };
const sharedNewest = Math.max(newestIn(path.join(P, 'src'), (f) => f.endsWith('.js') && !isShotFile(f)), newestIn('engine/src'), newestIn('engine/tex'), mtime(path.join(P, 'shots.txt')), mtime('tools/build_page.py'), mtime('tools/render.js'));
const marker = (s) => path.join(P, 'out', `${s.name}.render.json`);
function fresh(s) {
  try { const m = JSON.parse(fs.readFileSync(marker(s), 'utf8')); if (m.quality !== Q || m.frames !== s.n) return false;
    const inputs = Math.max(sharedNewest, mtime(path.join(P, 'src', `${s.name}.js`)), mtime(path.join(P, 'src', `${s.name}_sound.js`)));
    return inputs < m.started && mtime(path.join(P, 'out', `${s.name}.mp4`)) > 0 && mtime(path.join(P, 'out', `${s.name}.wav`)) > 0; } catch { return false; }
}

// ---- 1. captions first: a text problem fails in seconds, before any picture is rendered
if (assemble && !only) {
  console.log('STEP captions'); run('node', ['tools/overlay/render_ov.js', P], 'captions');
  const sc = spawnSync(PY, ['tools/check.py', '--safe', `${P}/out/overlay.mov`], { encoding: 'utf8', env: process.env });
  process.stdout.write(sc.stdout || '');
  if (sc.status !== 0) fail('captions outside the TikTok safe area (see the lines above): fix overlay.js before rendering');
}

// ---- 2. shots, JOBS at a time
let todo = shots.filter((s) => !only || only.includes(s.name));
const reused = A.includes('--reuse') && Q !== 'draft' ? todo.filter(fresh) : [];
if (reused.length) console.log(`reusing ${reused.length} unchanged shot(s): ${reused.map((s) => s.name).join(', ')}`);
todo = todo.filter((s) => !reused.includes(s));
const total = todo.reduce((a, s) => a + s.n, 0); let done = 0;
console.log(`render_all: ${P} · quality ${Q} · ${todo.length} shots, ${total} frames · ${GPU ? 'GPU' : 'CPU (SwiftShader)'} · ${JOBS} at a time · python=${PY}`);
async function renderShot(s) {
  console.log(`STEP shot ${s.name} (${s.n} frames)`); const started = Date.now();
  if (await runAsync(PY, ['tools/build_page.py', `${P}/src/${s.name}.js`], s.name)) fail(`build ${s.name} failed`);
  const out = Q === 'draft' ? `${P}/out/draft_${s.name}.mp4` : `${P}/out/${s.name}.mp4`;
  const args = ['tools/render.js', `${P}/dist/${s.name}.html`, out, '--from', '0', '--to', String(s.n), '--scale', String(PROFILE.scale), '--crf', String(PROFILE.crf)];
  if (PROFILE.mb) args.push('--mb', String(PROFILE.mb));
  const jobs = [runAsync('node', args, s.name)];
  if (Q !== 'draft') jobs.push(runAsync('node', ['tools/audio.js', `${P}/dist/${s.name}_sound.html`, `${P}/out/${s.name}.wav`, (s.n / 30 + 0.6).toFixed(2)], `${s.name} sound`));
  const codes = await Promise.all(jobs); if (codes.some(Boolean)) fail(`render ${s.name} failed`);
  if (Q !== 'draft') fs.writeFileSync(marker(s), JSON.stringify({ quality: Q, frames: s.n, started }));
  done += s.n; console.log(`PROGRESS ${done}/${total} frames · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
(async () => {
  const queue = [...todo];
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { while (queue.length) await renderShot(queue.shift()); }));
  if (!assemble) { console.log(`RESULT PASS ${Q === 'draft' ? 'draft shots in ' + P + '/out (draft_*.mp4)' : 'shots rendered (no assembly)'}`); process.exit(0); }
  const missing = shots.filter((s) => !fs.existsSync(path.join(P, 'out', `${s.name}.mp4`)));
  if (missing.length) fail(`missing shot renders: ${missing.map((s) => s.name).join(', ')}`);
  console.log('STEP score'); run(PY, ['tools/score.py', P], 'score');
  if (only) { console.log('STEP captions'); run('node', ['tools/overlay/render_ov.js', P], 'captions'); }
  console.log('STEP assemble'); run(BASH, ['tools/assemble.sh', P, ...(PROFILE.targetMb ? ['--target-mb', String(PROFILE.targetMb)] : []), ...(PROFILE.preset ? ['--preset', PROFILE.preset] : [])], 'assemble');
  console.log('STEP check');
  const c = spawnSync(PY, ['tools/check.py', `${P}/out/final.mp4`], { encoding: 'utf8', env: process.env });
  process.stdout.write(c.stdout || ''); process.stderr.write(c.stderr || '');
  const final = path.resolve(P, 'out', 'final.mp4');
  console.log(`RESULT ${c.status === 0 ? 'PASS' : 'FAIL'} ${final} · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  process.exit(c.status === 0 ? 0 : 1);
})();
