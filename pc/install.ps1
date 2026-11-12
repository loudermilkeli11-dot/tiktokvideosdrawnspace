# Invisible Journeys: render-PC setup for Windows. Safe to run again: it updates and repairs.
# Installs Git, Node.js, ffmpeg and Python (winget), clones the studio to %USERPROFILE%\InvisibleJourneys,
# (or uses the clone this script sits in), installs the engine and the renderer, then checks that renders run on the graphics card.
$ErrorActionPreference = 'Stop'
function Step($m) { Write-Host "`n== $m" -ForegroundColor Cyan }
function Have($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function RefreshPath { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }
function Run([scriptblock]$b, $what) { & $b; if ($LASTEXITCODE) { throw "$what failed (exit $LASTEXITCODE)" } }

if (-not (Have winget)) { Write-Host 'winget is missing. Install "App Installer" from the Microsoft Store, then run this again.' -ForegroundColor Red; exit 1 }

Step 'Tools: Git, Node.js, ffmpeg, Python'
foreach ($p in @(@('git', 'Git.Git'), @('node', 'OpenJS.NodeJS.LTS'), @('ffmpeg', 'Gyan.FFmpeg'), @('py', 'Python.Python.3.12'))) {
  if (Have $p[0]) { Write-Host "  $($p[0]): already installed" }
  else { winget install --id $p[1] -e --silent --accept-source-agreements --accept-package-agreements; RefreshPath }
}
RefreshPath

Step 'The studio (a browser window may ask you to sign in to GitHub once)'
# the studio folder: IJ_DIR if set; else the repo this script sits in (cloned already); else %USERPROFILE%\InvisibleJourneys
$here = Split-Path $PSScriptRoot -Parent
if ($env:IJ_DIR) { $dir = $env:IJ_DIR } elseif (Test-Path (Join-Path $here '.git')) { $dir = $here } else { $dir = Join-Path $env:USERPROFILE 'InvisibleJourneys' }
if (Test-Path (Join-Path $dir '.git')) { Run { git -C $dir pull --no-edit --autostash } 'git pull' }
else { Run { git clone --single-branch --branch main https://github.com/loudermilkeli11-dot/tiktokvideosdrawnspace $dir } 'git clone' }

Step 'Engine packages'
Push-Location (Join-Path $dir 'engine'); Run { npm ci } 'npm ci'; Pop-Location

Step 'Renderer (Playwright + Chromium)'
Push-Location $dir
Run { npm install --no-save --no-package-lock playwright@1.63.0 } 'playwright install'
Run { npx playwright install chromium } 'chromium download'
Pop-Location

Step 'Python packages for the quality checks'
RefreshPath
$py = if (Have 'py') { 'py' } elseif (Have 'python') { 'python' } else { $null }
if (-not $py) { winget install --id Python.Python.3.12 -e --silent --accept-source-agreements --accept-package-agreements; RefreshPath; $py = if (Have 'py') { 'py' } else { 'python' } }
Run { & $py -m pip install --upgrade --quiet numpy pillow } 'pip'

Step 'GPU check'
Push-Location $dir; $env:IJ_GPU = '1'; node tools/gpu_check.js; Remove-Item Env:IJ_GPU; Pop-Location
Write-Host '  (If it says "software", tell Claude what it printed.)'

Step 'Stay awake'
$a = Read-Host 'Keep this PC awake while it is plugged in, so renders and remote sessions are not cut off? (Y/N)'
if ($a -match '^[Yy]') { powercfg /change standby-timeout-ac 0; powercfg /change hibernate-timeout-ac 0; Write-Host '  Done. The screen can still turn off.' }

Write-Host "`nAll set. Studio folder: $dir" -ForegroundColor Green
Write-Host 'Last step: in the Claude desktop app, open Settings > Claude Code > Remote Control and add that folder.'
