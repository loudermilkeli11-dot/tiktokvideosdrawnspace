#!/usr/bin/env bash
# Snapshot built pages to the `render` branch (pages + the renderer only; never MP4s), replacing its previous content.
# usage: bash tools/cloud/snapshot.sh projects/<slug>/dist/<shot>.html [more pages...]
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel); cd "$ROOT"
WT=$(mktemp -d /tmp/render-wt.XXXX)
git worktree add --detach "$WT" HEAD >/dev/null
( cd "$WT" && git checkout --orphan render-snap >/dev/null 2>&1 && git rm -rfq . && rm -rf ./* )
mkdir -p "$WT/tools" "$WT/pages"
cp tools/render.js tools/run.sh "$WT/tools/"
for p in "$@"; do slug=$(basename "$(dirname "$(dirname "$p")")"); mkdir -p "$WT/pages/$slug"; cp "$p" "$WT/pages/$slug/"; done
printf '# render snapshot\nPages to render (see tools/cloud/worker_prompt.md on main). Built %s from %s.\n' "$(date -u +%FT%TZ)" "$(git rev-parse --short HEAD)" > "$WT/README.md"
( cd "$WT" && git add -A && git commit -qm "render snapshot $(date -u +%FT%TZ)" && git push -q -f origin render-snap:render )
git worktree remove --force "$WT"; git branch -D render-snap >/dev/null 2>&1 || true
echo "render branch updated: $(git ls-remote origin refs/heads/render | cut -c1-12)  pages: $*"
