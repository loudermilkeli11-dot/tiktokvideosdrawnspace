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

# 3. API key -> .env
$envFile = Join-Path $Root '.env'
$hasKey = (Test-Path $envFile) -and ((Get-Content $envFile -Raw) -match '(?m)^\s*ANTHROPIC_API_KEY\s*=\s*\S+')
if ($hasKey) { Write-Host '[3/5] API key already set in .env.' -ForegroundColor Green }
else {
    Write-Host '[3/5] Anthropic API key' -ForegroundColor Cyan
    Write-Host '      Create one at https://console.anthropic.com/settings/keys (usage is billed to that account).'
    Write-Host '      Press Enter without a key to start in free DEMO mode (simulated agents). You can add it later in war-room\.env'
    $sec = Read-Host -AsSecureString '      Paste key (hidden)'
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
    if (-not (Test-Path $envFile)) { Copy-Item (Join-Path $Root '.env.example') $envFile }
    if ($key) {
        $lines = Get-Content $envFile | ForEach-Object { if ($_ -match '^\s*ANTHROPIC_API_KEY\s*=') { "ANTHROPIC_API_KEY=$($key.Trim())" } else { $_ } }
        Set-Content -Path $envFile -Value $lines -Encoding ASCII
        Write-Host '      Saved. Real agents are on (LIVE mode).' -ForegroundColor Green
    } else { Write-Host '      No key: DEMO mode.' -ForegroundColor Yellow }
}

# 4. Shortcuts: auto-start at login + desktop + Start menu
Write-Host '[4/5] Creating shortcuts...' -ForegroundColor Cyan
$s = Get-ShortcutPaths
New-WarRoomShortcut -Path $s.Startup -Script (Join-Path $PSScriptRoot 'run.ps1') -Description 'Starts the War Room server at login'
New-WarRoomShortcut -Path $s.Desktop -Script (Join-Path $PSScriptRoot 'open.ps1') -Description 'Open the War Room'
New-WarRoomShortcut -Path $s.Menu -Script (Join-Path $PSScriptRoot 'open.ps1') -Description 'Open the War Room'
Write-Host '      Auto-start at login, a "War Room" icon on the desktop and in the Start menu.' -ForegroundColor Green

# 5. Restart the server so it picks up the new key, then open the window
Write-Host '[5/5] Starting the War Room...' -ForegroundColor Cyan
& "$PSScriptRoot\stop.ps1" | Out-Null
& "$PSScriptRoot\open.ps1"
Write-Host ''
Write-Host "  Done. The War Room is at http://localhost:$(Get-WarRoomPort) and opens from the desktop icon." -ForegroundColor Yellow
Write-Host '  Stop it:      windows\stop.ps1        Remove it:  windows\uninstall.ps1'
Write-Host ''
