// One command from a built project to the finished, checked film (any OS; on the Commander's PC it uses the GPU).
//   node tools/render_all.js projects/<slug> [--quality draft|standard|max] [--shots a,b] [--no-assemble]
// Steps: build pages -> render every shot (+ its sound) -> score -> captions -> assemble (-14 LUFS) -> QC (check.py).
// Quality: draft = half size, 1 sample (look checks only, no assembly); standard = each shot's own samples;
//          max = 16 motion-blur/anti-alias sub-samples per frame, near-lossless intermediates, a higher-bitrate final.
// Prints "STEP <name>", "PROGRESS <done>/<total>" and finally "RESULT PASS|FAIL <path>" lines (the War Room reads them).
const { spawnSync, spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const A = process.argv.slice(2); const opt = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..'); process.chdir(ROOT);
const P = A[0] && path.normalize(A[0]).replace(/[\\/]+$/, '');
if (!P || !fs.existsSync(path.join(P, 'shots.txt'))) { console.error('usage: node tools/render_all.js projects/<slug> [--quality draft|standard|max] [--shots a,b]'); process.exit(2); }
const Q = opt('quality', 'standard'), only = opt('shots', '') ? opt('shots').split(',') : null, assemble = !A.includes('--no-assemble') && Q !== 'draft';
const PROFILE = { draft: { scale: 0.5, mb: 1, crf: 18 }, standard: { scale: 1, mb: '', crf: 12 }, max: { scale: 1, mb: 16, crf: 8, targetMb: 120, preset: 'slow' } }[Q];
if (!PROFILE) { console.error('quality must be draft, standard or max'); process.exit(2); }
if (process.platform === 'win32' && process.env.IJ_GPU === undefined) process.env.IJ_GPU = '1';   // the PC's graphics card
const which = (c) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [c], { stdio: 'ignore' }).status === 0;
const PY = process.env.PYTHON || [process.platform === 'win32' ? 'python' : 'python3', 'py', 'python', 'python3'].find((c) => which(c) && spawnSync(c, ['-c', 'import numpy'], { stdio: 'ignore' }).status === 0) || 'python3';
process.env.PYTHON = PY;
const BASH = process.platform === 'win32' ? [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'), 'bash'].find((b) => b === 'bash' || fs.existsSync(b)) : 'bash';
function run(cmd, args, what) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
  if (r.status !== 0) { console.log(`RESULT FAIL ${what} failed (exit ${r.status ?? r.error?.message})`); process.exit(1); }
}
const shots = fs.readFileSync(path.join(P, 'shots.txt'), 'utf8').split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).map((l) => { const [name, n] = l.split(/\s+/); return { name, n: +n }; });
const todo = shots.filter((s) => !only || only.includes(s.name));
fs.mkdirSync(path.join(P, 'out'), { recursive: true }); fs.mkdirSync(path.join(P, 'dist'), { recursive: true });
const t0 = Date.now(); const total = todo.reduce((a, s) => a + s.n, 0); let done = 0;
console.log(`render_all: ${P} · quality ${Q} · ${todo.length} shots, ${total} frames · ${process.env.IJ_GPU === '1' ? 'GPU' : 'CPU (SwiftShader)'} · python=${PY}`);
for (const s of todo) {
  console.log(`STEP shot ${s.name} (${s.n} frames)`);
  run(PY, ['tools/build_page.py', `${P}/src/${s.name}.js`], `build ${s.name}`);
  const out = Q === 'draft' ? `${P}/out/draft_${s.name}.mp4` : `${P}/out/${s.name}.mp4`;
  const args = ['tools/render.js', `${P}/dist/${s.name}.html`, out, '--from', '0', '--to', String(s.n), '--scale', String(PROFILE.scale), '--crf', String(PROFILE.crf)];
  if (PROFILE.mb) args.push('--mb', String(PROFILE.mb));
  run('node', args, `render ${s.name}`);
  if (Q !== 'draft') run('node', ['tools/audio.js', `${P}/dist/${s.name}_sound.html`, `${P}/out/${s.name}.wav`, (s.n / 30 + 0.6).toFixed(2)], `sound ${s.name}`);
  done += s.n; console.log(`PROGRESS ${done}/${total} frames · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
if (!assemble) { console.log(`RESULT PASS ${Q === 'draft' ? 'draft shots in ' + P + '/out (draft_*.mp4)' : 'shots rendered (no assembly)'}`); process.exit(0); }
console.log('STEP score'); run(PY, ['tools/score.py', P], 'score');
console.log('STEP captions'); run('node', ['tools/overlay/render_ov.js', P], 'captions');
console.log('STEP assemble'); run(BASH, ['tools/assemble.sh', P, ...(PROFILE.targetMb ? ['--target-mb', String(PROFILE.targetMb)] : []), ...(PROFILE.preset ? ['--preset', PROFILE.preset] : [])], 'assemble');
console.log('STEP check');
const c = spawnSync(PY, ['tools/check.py', `${P}/out/final.mp4`], { encoding: 'utf8', env: process.env });
process.stdout.write(c.stdout || ''); process.stderr.write(c.stderr || '');
const final = path.resolve(P, 'out', 'final.mp4');
console.log(`RESULT ${c.status === 0 ? 'PASS' : 'FAIL'} ${final} · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
process.exit(c.status === 0 ? 0 : 1);
