# One-time setup for Windows: Node.js, dependencies, API key, auto-start at login, desktop + Start-menu icons.
# Run it with "War Room Setup.cmd" (double-click). Safe to run again at any time.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"
Write-Host ''
Write-Host '  INVISIBLE JOURNEYS // WAR ROOM setup' -ForegroundColor Yellow
Write-Host "  Folder: $Root"
Write-Host ''

# 1. Node.js 20+
$node = Get-NodeExe
$major = 0
if ($node) { $major = [int](((& $node -v) -replace '^v', '').Split('.')[0]) }
if ($major -lt 20) {
    Write-Host '[1/5] Installing Node.js LTS with winget...' -ForegroundColor Cyan
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Host 'winget is not available. Install Node.js 20+ from https://nodejs.org, then run setup again.' -ForegroundColor Red
        exit 1
    }
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
    $node = Get-NodeExe
    if (-not $node) { Write-Host 'Node.js was installed but is not on PATH yet. Close this window and run setup again.' -ForegroundColor Red; exit 1 }
} else { Write-Host "[1/5] Node.js $(& $node -v) found." -ForegroundColor Green }

# 1b. Git for Windows: Claude's command tool (used by the Studio agent) runs through Git Bash on Windows
if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
    Write-Host '      Git for Windows not found; installing it with winget (needed for agents that run commands)...' -ForegroundColor Cyan
    if (Get-Command winget -ErrorAction SilentlyContinue) { winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements }
    else { Write-Host '      Install Git from https://git-scm.com/download/win if the Studio agent needs to run commands.' -ForegroundColor Yellow }
}

# 2. Dependencies
Write-Host '[2/5] Installing dependencies (npm install)...' -ForegroundColor Cyan
Push-Location $Root
$npm = Join-Path (Split-Path -Parent $node) 'npm.cmd'
if (-not (Test-Path $npm)) { $npm = 'npm.cmd' }
& $npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host 'npm install failed (see above).' -ForegroundColor Red; exit 1 }
Pop-Location

# 3. Claude Code -> agents run on your Claude plan (no API key, no separate bill)
$envFile = Join-Path $Root '.env'
if (-not (Test-Path $envFile)) { Copy-Item (Join-Path $Root '.env.example') $envFile }
$hasKey = (Get-Content $envFile -Raw) -match '(?m)^\s*ANTHROPIC_API_KEY\s*=\s*\S+'
if ($hasKey) { Write-Host '[3/5] An API key is set in .env: agents bill that key (API mode). Delete the key line to use your Claude plan instead.' -ForegroundColor Yellow }
else {
    Write-Host '[3/5] Claude Code (the agents run through it, on your Claude plan)' -ForegroundColor Cyan
    $localBin = Join-Path $env:USERPROFILE '.local\bin'
    if (-not (Get-Command claude -ErrorAction SilentlyContinue) -and -not (Test-Path (Join-Path $localBin 'claude.exe'))) {
        Write-Host '      Installing Claude Code...'
        Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression
    }
    if ($env:Path -notlike "*$localBin*") { $env:Path = "$localBin;$env:Path" }
    $probe = (& claude -p 'Reply with the single word READY' --max-turns 1 --model claude-haiku-5-5 2>&1 | Out-String)
    if ($probe -match 'READY') { Write-Host '      Signed in. Agents will run on your Claude plan (PLAN mode).' -ForegroundColor Green }
    else {
        Write-Host '      Sign in once: a Claude window opens. Sign in with your Claude account (the same one as the app),' -ForegroundColor Yellow
        Write-Host '      wait for the prompt, type /exit and press Enter. Setup continues after that.' -ForegroundColor Yellow
        Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$Root'; claude" -Wait
        $probe = (& claude -p 'Reply with the single word READY' --max-turns 1 --model claude-haiku-5-5 2>&1 | Out-String)
        if ($probe -match 'READY') { Write-Host '      Signed in. PLAN mode is on.' -ForegroundColor Green }
        else { Write-Host "      Claude Code didn't answer yet; the War Room starts in DEMO mode. Run Setup again after signing in. ($($probe.Trim()))" -ForegroundColor Yellow }
    }
}

# 4. Shortcuts: auto-start at login + desktop + Start menu
Write-Host '[4/5] Creating shortcuts...' -ForegroundColor Cyan
$s = Get-ShortcutPaths
New-WarRoomShortcut -Path $s.Startup -Script (Join-Path $PSScriptRoot 'run.ps1') -Description 'Starts the War Room server at login'
New-WarRoomShortcut -Path $s.Desktop -Script (Join-Path $PSScriptRoot 'open.ps1') -Description 'Open the War Room'
New-WarRoomShortcut -Path $s.Menu -Script (Join-Path $PSScriptRoot 'open.ps1') -Description 'Open the War Room'
& (Join-Path $PSScriptRoot 'register-toast.ps1') | Out-Null   # Windows notifications show as "War Room"
Write-Host '      Auto-start at login, a "War Room" icon on the desktop and in the Start menu.' -ForegroundColor Green

# 5. Restart the server so it picks up the new key, then open the window
Write-Host '[5/5] Starting the War Room...' -ForegroundColor Cyan
& "$PSScriptRoot\stop.ps1" | Out-Null
& "$PSScriptRoot\open.ps1"
Write-Host ''
Write-Host "  Done. The War Room is at http://localhost:$(Get-WarRoomPort) and opens from the desktop icon." -ForegroundColor Yellow
Write-Host '  Stop it:      windows\stop.ps1        Remove it:  windows\uninstall.ps1'
Write-Host ''
