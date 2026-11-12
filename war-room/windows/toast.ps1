# Shows one Windows notification (toast) for the War Room. Called by the server with a JSON file:
#   { title, body, attribution, hero (png path), logo (png path), buttons: [{ text, url }], scenario: "default"|"reminder", aumid }
# Buttons open a URL (the War Room on this PC). "reminder" toasts stay on screen until dismissed (used for approvals).
param([Parameter(Mandatory = $true)][string]$Json)
$ErrorActionPreference = 'Stop'
$n = Get-Content -Raw -Encoding UTF8 $Json | ConvertFrom-Json
Remove-Item $Json -Force -ErrorAction SilentlyContinue
function X([string]$s) { [System.Security.SecurityElement]::Escape([string]$s) }
$img = ''
if ($n.hero -and (Test-Path $n.hero)) { $img += "<image placement='hero' src='$(X ([Uri]$n.hero).AbsoluteUri)'/>" }
if ($n.logo -and (Test-Path $n.logo)) { $img += "<image placement='appLogoOverride' hint-crop='circle' src='$(X ([Uri]$n.logo).AbsoluteUri)'/>" }
$acts = ''
foreach ($b in @($n.buttons)) { if ($b) { $acts += "<action content='$(X $b.text)' activationType='protocol' arguments='$(X $b.url)'/>" } }
if ($acts) { $acts = "<actions>$acts</actions>" }
$scenario = if ($n.scenario -eq 'reminder' -and $acts) { " scenario='reminder'" } else { '' }
$open = if ($n.open) { " activationType='protocol' launch='$(X $n.open)'" } else { '' }
$xml = @"
<toast$scenario$open>
  <visual><binding template='ToastGeneric'>
    <text>$(X $n.title)</text>
    <text>$(X $n.body)</text>
    <text placement='attribution'>$(X $n.attribution)</text>
    $img
  </binding></visual>
  <audio src='ms-winsoundevent:Notification.$(if ($n.scenario -eq 'reminder') { 'Reminder' } else { 'Default' })'/>
  $acts
</toast>
"@
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$doc = New-Object Windows.Data.Xml.Dom.XmlDocument; $doc.LoadXml($xml)
$aumid = if ($n.aumid) { $n.aumid } else { '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe' }
try { [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($aumid).Show([Windows.UI.Notifications.ToastNotification]::new($doc)) }
catch { [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new($doc)) }
