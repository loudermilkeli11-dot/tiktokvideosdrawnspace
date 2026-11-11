# Removes the War Room shortcuts and stops the server. Your data (war-room\data) and .env are kept.
. "$PSScriptRoot\common.ps1"
& "$PSScriptRoot\stop.ps1"
$s = Get-ShortcutPaths
foreach ($p in @($s.Startup, $s.Desktop, $s.Menu)) { if (Test-Path $p) { Remove-Item -Force $p; Write-Host "Removed $p" } }
Write-Host 'Uninstalled. Delete the war-room folder too if you want everything gone.'
