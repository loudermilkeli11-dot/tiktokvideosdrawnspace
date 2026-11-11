# Desktop / Start-menu icon: make sure the server is running, then open the War Room in its own app window.
. "$PSScriptRoot\common.ps1"
$port = Get-WarRoomPort
if (-not (Test-WarRoomUp -Port $port)) {
    Start-Process -WindowStyle Hidden -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" `
        -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSScriptRoot\run.ps1`"")
    for ($i = 0; $i -lt 60; $i++) { if (Test-WarRoomUp -Port $port) { break }; Start-Sleep -Milliseconds 250 }
}
$url = "http://localhost:$port"
$browser = Get-AppBrowser
if ($browser) { Start-Process -FilePath $browser -ArgumentList "--app=$url" } else { Start-Process $url }
