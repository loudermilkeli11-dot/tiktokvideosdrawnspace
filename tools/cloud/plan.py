#!/usr/bin/env python3
"""Plan cloud render chunks for a project: prints a JSON list of {chunk, page, from, to, prompt}.
usage: python3 tools/cloud/plan.py projects/<slug> [--chunk 45] [--shots s01_hook,s02_...]
Pages must already be on the `render` branch (tools/cloud/snapshot.sh). The lead calls create_session for each entry
with source_revision='render', clone_depth=1, model='claude-fable-5-2' and the given prompt."""
import sys, os, json, argparse
ap = argparse.ArgumentParser(); ap.add_argument('proj'); ap.add_argument('--chunk', type=int, default=45); ap.add_argument('--shots'); a = ap.parse_args()
slug = os.path.basename(os.path.normpath(a.proj)); tpl = open(os.path.join(os.path.dirname(__file__), 'worker_prompt.md')).read()
want = set(a.shots.split(',')) if a.shots else None; out = []
for line in open(os.path.join(a.proj, 'shots.txt')):
    line = line.split('#')[0].strip()
    if not line: continue
    name, n = line.split()[0], int(line.split()[1])
    if want and name not in want: continue
    for f0 in range(0, n, a.chunk):
        f1 = min(n, f0 + a.chunk); chunk = f'{slug}-{name}-{f0:04d}'; page = f'pages/{slug}/{name}.html'
        p = tpl.replace('{{FROM}}', str(f0)).replace('{{TO}}', str(f1)).replace('{{PAGE}}', page).replace('{{CHUNK}}', chunk)
        out.append({'chunk': chunk, 'shot': name, 'page': page, 'from': f0, 'to': f1, 'prompt': p})
print(json.dumps(out, indent=1))
