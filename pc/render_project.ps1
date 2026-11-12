# Render a whole project on this PC's graphics card: pull, build pages, render every shot + its sound, score,
# captions, assemble, QC.   Usage (PowerShell, in D:\ClaudeStudio):  .\pc\render_project.ps1 gravity-flip
#   -Shots s01_plaza,s07_clouds   only (re)render these shots, then re-assemble
#   -NoPull                       use the files as they are (no git pull)
param([Parameter(Mandatory = $true)][string]$Slug, [string[]]$Shots, [switch]$NoPull)
$ErrorActionPreference = 'Stop'
function Run([scriptblock]$b, $what) { & $b; if ($LASTEXITCODE) { throw "$what failed (exit $LASTEXITCODE)" } }
$root = Split-Path $PSScriptRoot -Parent; Set-Location $root
$py = if (Get-Command py -ErrorAction SilentlyContinue) { 'py' } else { 'python' }
$env:IJ_GPU = '1'; $env:PYTHON = $py
$bash = Join-Path $env:ProgramFiles 'Git\bin\bash.exe'; if (-not (Test-Path $bash)) { $bash = 'bash' }
if (-not $NoPull) { Run { git pull --ff-only } 'git pull' }
$P = "projects/$Slug"; New-Item -ItemType Directory -Force "$P/out", "$P/dist" | Out-Null
$t0 = Get-Date
$list = Get-Content "$P/shots.txt" | ForEach-Object { ($_ -replace '#.*', '').Trim() } | Where-Object { $_ } | ForEach-Object { $a = $_ -split '\s+'; [pscustomobject]@{ Name = $a[0]; N = [int]$a[1] } }
foreach ($s in $list) {
  if ($Shots -and ($Shots -notcontains $s.Name)) { continue }
  Write-Host "`n== $($s.Name): $($s.N) frames" -ForegroundColor Cyan
  Run { & $py tools/build_page.py "$P/src/$($s.Name).js" } 'build'
  Run { node tools/render.js "$P/dist/$($s.Name).html" "$P/out/$($s.Name).mp4" --from 0 --to $s.N } 'render'
  $dur = [math]::Round($s.N / 30 + 0.6, 2)
  Run { node tools/audio.js "$P/dist/$($s.Name)_sound.html" "$P/out/$($s.Name).wav" $dur } 'sound'
}
Write-Host "`n== score, captions, assembly, QC" -ForegroundColor Cyan
Run { & $py tools/score.py $P } 'score'
Run { node tools/overlay/render_ov.js $P } 'captions'
Run { & $bash tools/assemble.sh $P } 'assemble'
& $py tools/check.py "$P/out/final.mp4"
Write-Host ("`nDone in {0:n1} min: $root\$P\out\final.mp4" -f ((Get-Date) - $t0).TotalMinutes) -ForegroundColor Green
