# Shared helpers for the War Room Windows scripts (Windows PowerShell 5.1 and PowerShell 7).
$Root = Split-Path -Parent $PSScriptRoot
$AppName = 'Invisible Journeys War Room'

function Get-WarRoomPort {
    $port = 4747
    $envFile = Join-Path $Root '.env'
    if (Test-Path $envFile) {
        foreach ($line in Get-Content $envFile) {
            if ($line -match '^\s*WARROOM_PORT\s*=\s*(\d+)') { $port = [int]$Matches[1] }
        }
    }
    return $port
}

function Test-WarRoomUp {
    param([int]$Port = (Get-WarRoomPort))
    try {
        $c = New-Object System.Net.Sockets.TcpClient
        $iar = $c.BeginConnect('127.0.0.1', $Port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne(400) -and $c.Connected
        $c.Close()
        return $ok
    } catch { return $false }
}

function Get-AppBrowser {
    # Edge ships with Windows; Chrome is the fallback. Both support --app=URL (a window with no tabs or address bar).
    foreach ($exe in @('msedge.exe', 'chrome.exe')) {
        foreach ($hive in @('HKLM:', 'HKCU:')) {
            $key = "$hive\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$exe"
            if (Test-Path $key) {
                $p = (Get-ItemProperty $key).'(default)'
                if ($p -and (Test-Path $p)) { return $p }
            }
        }
    }
    $candidates = @(
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    foreach ($p in $candidates) { if ($p -and (Test-Path $p)) { return $p } }
    return $null
}

function Get-NodeExe {
    $cmd = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in @("$env:ProgramFiles\nodejs\node.exe", "${env:ProgramFiles(x86)}\nodejs\node.exe")) { if (Test-Path $p) { return $p } }
    return $null
}

function New-WarRoomShortcut {
    param([string]$Path, [string]$Script, [string]$Description)
    $ws = New-Object -ComObject WScript.Shell
    $lnk = $ws.CreateShortcut($Path)
    $lnk.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $lnk.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Script`""
    $lnk.WorkingDirectory = $Root
    $lnk.WindowStyle = 7   # minimized: no console window flashing up
    $lnk.IconLocation = (Join-Path $Root 'public\icon.ico')
    $lnk.Description = $Description
    $lnk.Save()
}

function Get-ShortcutPaths {
    return @{
        Startup = Join-Path ([Environment]::GetFolderPath('Startup')) "$AppName.lnk"
        Desktop = Join-Path ([Environment]::GetFolderPath('Desktop')) 'War Room.lnk'
        Menu    = Join-Path ([Environment]::GetFolderPath('Programs')) 'War Room.lnk'
    }
}
