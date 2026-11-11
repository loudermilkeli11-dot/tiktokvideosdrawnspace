#!/usr/bin/env python3
"""shot.js -> ONE self-contained HTML (esbuild IIFE + data-URI textures) + a sound-only page.
Usage: build_page.py projects/<slug>/src/<shot>.js [-o projects/<slug>/dist/<shot>.html]
  Sound: if <shot>_sound.js exists next to it, it's appended as <script id="sound" type="text/plain"> (audio core + shot sound),
  and <shot>_sound.html (sound only, tiny) is written next to the page for tools/audio.js.
"""
import sys, os, re, base64, subprocess, argparse
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEX = os.path.join(ROOT, 'engine', 'tex')
MIME = {'.jpg': 'image/jpeg', '.png': 'image/png', '.hdr': 'application/octet-stream'}
ap = argparse.ArgumentParser(); ap.add_argument('shot'); ap.add_argument('-o'); ap.add_argument('--min', action='store_true'); a = ap.parse_args()
shot = os.path.abspath(a.shot); name = os.path.splitext(os.path.basename(shot))[0]
out = os.path.abspath(a.o or os.path.join(os.path.dirname(os.path.dirname(shot)), 'dist', name + '.html'))
os.makedirs(os.path.dirname(out), exist_ok=True)
js = subprocess.run(['node', os.path.join(ROOT, 'engine', 'build.mjs'), shot] + (['--min'] if a.min else []), capture_output=True, text=True)
if js.returncode: sys.exit(js.stderr)
code = js.stdout
used = sorted(f for f in os.listdir(TEX) if re.search(r'["\'`]' + re.escape(f) + r'["\'`]', code))
tex = ',\n'.join(f'"{f}":"data:{MIME[os.path.splitext(f)[1]]};base64,{base64.b64encode(open(os.path.join(TEX, f), "rb").read()).decode()}"' for f in used)
snd_src = os.path.join(os.path.dirname(shot), name + '_sound.js')
sound = ''
if os.path.exists(snd_src):
    core = open(os.path.join(ROOT, 'engine', 'src', 'audio_core.js')).read()
    sound = core + '\n' + open(snd_src).read()
    snd_html = out[:-5] + '_sound.html'
    open(snd_html, 'w').write(f'<!doctype html><meta charset=utf-8><title>{name} sound</title><script id="sound">\n{sound}\n</script>\n')
code = code.replace('</script', '<\\/script')
html = f'''<!doctype html><html><head><meta charset="utf-8"><title>{name}</title></head><body>
<script>window.TEX={{{tex}}};</script>
<script>{code}</script>
<script id="sound" type="text/plain">{sound.replace("</script", "<\\/script")}</script>
</body></html>'''
open(out, 'w').write(html)
print(f'{out}  {os.path.getsize(out)/1e6:.1f} MB  textures: {", ".join(used) or "-"}{"  +sound" if sound else ""}')
