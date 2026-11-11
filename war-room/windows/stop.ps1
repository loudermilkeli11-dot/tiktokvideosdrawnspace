# Stops the background War Room server (until the next login or until you click the icon again).
. "$PSScriptRoot\common.ps1"
$runScript = Join-Path $PSScriptRoot 'run.ps1'
$server = Join-Path $Root 'server.js'
Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($runScript) -and $_.ProcessId -ne $PID } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($server) } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Write-Host 'War Room stopped.'
