#!/usr/bin/env python3
"""Print create_session parameters (JSON lines) for the given shots' chunks, from plan.py output.
usage: python3 tools/cloud/launch.py plan.json [--tag v1]  -> one JSON object per chunk: {title, prompt, chunk}"""
import json, sys
plan = json.load(open(sys.argv[1]))
for c in plan: print(json.dumps({'title': f"Render worker: {c['chunk']}", 'chunk': c['chunk']}))
