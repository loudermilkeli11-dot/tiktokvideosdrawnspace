# Brute-force restart: stops EVERY War Room server on this PC (from any folder), frees the port, points the login
# auto-start and the icons at THIS copy, starts it and opens the window. Safe to run any time.
. "$PSScriptRoot\common.ps1"
$port = Get-WarRoomPort
Write-Host "Restarting the War Room from $Root (port $port)..." -ForegroundColor Cyan

# 1. stop the keep-alive loops first (or they start the server again), then every War Room server
$procs = Get-CimInstance Win32_Process | Where-Object {
    $_.ProcessId -ne $PID -and $_.CommandLine -and (
        ($_.Name -match '^(powershell|pwsh)\.exe$' -and $_.CommandLine -match 'war-room\\windows\\run\.ps1') -or
        ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'war-room\\server\.js'))
}
foreach ($p in ($procs | Sort-Object { if ($_.Name -eq 'node.exe') { 1 } else { 0 } })) {
    Write-Host "  stopping $($p.Name) (pid $($p.ProcessId))"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
# 1b. leftover render processes from a crashed or cancelled render (they lock files in projects\<slug>\out)
Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and (
    ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'tools[\\/](render_all|render|audio|frames)\.js') -or
    ($_.Name -eq 'ffmpeg.exe' -and $_.CommandLine -match 'projects[\\/]')) } |
    ForEach-Object { Write-Host "  stopping leftover $($_.Name) (pid $($_.ProcessId))"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
# 2. anything still holding the port
Start-Sleep -Milliseconds 800
try {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | ForEach-Object {
        Write-Host "  freeing port $port (pid $($_.OwningProcess))"; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
} catch {}
Start-Sleep -Milliseconds 800
if (Test-WarRoomUp -Port $port) { Write-Host "Port $port is still in use by something else. Restart Windows, then run this again." -ForegroundColor Red; exit 1 }

# 3. shortcuts and login auto-start point at this copy (an older install elsewhere would otherwise come back)
$s = Get-ShortcutPaths
New-WarRoomShortcut -Path $s.Startup -Script (Join-Path $PSScriptRoot 'run.ps1') -Description 'Starts the War Room server at login'
New-WarRoomShortcut -Path $s.Desktop -Script (Join-Path $PSScriptRoot 'open.ps1') -Description 'Open the War Room'
New-WarRoomShortcut -Path $s.Menu -Script (Join-Path $PSScriptRoot 'open.ps1') -Description 'Open the War Room'

& (Join-Path $PSScriptRoot 'register-toast.ps1') | Out-Null   # Windows notifications show as "War Room"
# 4. start + open, then report what is running
& (Join-Path $PSScriptRoot 'open.ps1')
for ($i = 0; $i -lt 40; $i++) { if (Test-WarRoomUp -Port $port) { break }; Start-Sleep -Milliseconds 250 }
try {
    $st = Invoke-RestMethod "http://127.0.0.1:$port/api/state"
    Write-Host ("Running. Mode: {0}. Queue: {1}. Workspace: {2}" -f $st.mode.ToUpper(), $(if ($st.usage.paused) { "PAUSED ($($st.usage.paused))" } else { 'open' }), $st.workspace) -ForegroundColor Green
} catch { Write-Host "The server did not answer. Last errors:" -ForegroundColor Red; Get-Content (Join-Path $Root 'data\server.err.log') -Tail 20 -ErrorAction SilentlyContinue }
Write-Host 'If the window still looks old, click in it and press Ctrl+Shift+R.'
