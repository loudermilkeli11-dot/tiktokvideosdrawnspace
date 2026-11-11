# Keeps the War Room server running in the background (started at login by the Startup shortcut).
# Restarts it if it crashes. Logs: war-room\data\run.log, server.out.log, server.err.log
. "$PSScriptRoot\common.ps1"
$port = Get-WarRoomPort
if (Test-WarRoomUp -Port $port) { exit 0 }   # already running

$data = Join-Path $Root 'data'
New-Item -ItemType Directory -Force -Path $data | Out-Null
$log = Join-Path $data 'run.log'
if ((Test-Path $log) -and ((Get-Item $log).Length -gt 2MB)) { Move-Item -Force $log "$log.old" }
function Write-RunLog([string]$msg) { "[$(Get-Date -Format s)] $msg" | Out-File -Append -Encoding utf8 $log }

$node = Get-NodeExe
if (-not $node) { Write-RunLog "Node.js not found. Run 'War Room Setup.cmd' again."; exit 1 }
$server = Join-Path $Root 'server.js'
while ($true) {
    if (Test-WarRoomUp -Port $port) { Start-Sleep -Seconds 30; continue }   # someone else is serving the port
    Write-RunLog "starting War Room on port $port"
    $p = Start-Process -FilePath $node -ArgumentList "`"$server`"" -WorkingDirectory $Root -WindowStyle Hidden -PassThru -Wait `
        -RedirectStandardOutput (Join-Path $data 'server.out.log') -RedirectStandardError (Join-Path $data 'server.err.log')
    Write-RunLog "server exited (code $($p.ExitCode)); restarting in 5 s"
    Start-Sleep -Seconds 5
}
