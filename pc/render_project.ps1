# Render a whole project on this PC's graphics card: pull, build pages, render every shot + its sound, score,
# captions, assemble, QC.   Usage (PowerShell, in D:\ClaudeStudio):  .\pc\render_project.ps1 gravity-flip [-Quality max]
#   -Quality draft|standard|max   max = 16 sub-samples per frame (smoothest motion, cleanest edges), higher-bitrate final
#   -Shots s01_plaza,s07_clouds   only (re)render these shots, then re-assemble
#   -NoPull                       use the files as they are (no git pull)
# The War Room's Studio tab runs the same pipeline (tools/render_all.js) automatically after an approved build.
param([Parameter(Mandatory = $true)][string]$Slug, [ValidateSet('draft', 'standard', 'max')][string]$Quality = 'max', [string[]]$Shots, [switch]$NoPull)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent; Set-Location $root
$env:IJ_GPU = '1'
if (-not $NoPull) { git pull --no-edit --autostash; if ($LASTEXITCODE) { throw 'git pull failed' } }
$args2 = @("tools/render_all.js", "projects/$Slug", '--quality', $Quality)
if ($Shots) { $args2 += @('--shots', ($Shots -join ',')) }
node @args2
exit $LASTEXITCODE
