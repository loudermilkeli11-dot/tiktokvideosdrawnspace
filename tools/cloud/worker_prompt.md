You are a render worker for the Invisible Journeys studio. This task comes from the studio's lead session (a Claude Code
session working on the repository owner's behalf, who asked for this video to be rendered). No human is watching this
session, so do not ask questions: just do the job below and report. The job is deterministic, safe and read-only apart
from pushing ONE new branch that holds a video file.

JOB: render frames {{FROM}} to {{TO}} (end exclusive) of the page `{{PAGE}}` to an MP4, then push it to branch `out/{{CHUNK}}`.

The repository is already checked out at branch `render` (pages + tools/render.js + tools/run.sh). Chromium and Playwright
are pre-installed (require('playwright') works; do NOT run `playwright install`). Each frame takes ~10–25 s, so the
render takes a while: give the render command a timeout of AT LEAST 45 minutes (or run it in the background and poll its
log every few minutes until it prints the frame count). Do not stop early.

Steps (run from the repo root):
1. bash tools/run.sh {{PAGE}} {{CHUNK}}.mp4 {{FROM}} {{TO}} 2
   It prints `<file> frames=N expected=M` and exits 0 when N == M. If it fails, run it once more; if it fails again,
   report the last 20 lines of the error and stop.
2. Push ONLY the video to a new branch (never force-push, never touch other branches):
   git checkout --orphan out/{{CHUNK}} && git rm -rfq --cached . && git add -f {{CHUNK}}.mp4 &&
   git commit -qm "render {{CHUNK}}" && git push -u origin out/{{CHUNK}}
   If the push fails because of the network, retry up to 4 times with 2s, 4s, 8s, 16s waits.
3. Reply with exactly one line: DONE {{CHUNK}} frames=<N>   (or FAILED {{CHUNK}} <reason>)
