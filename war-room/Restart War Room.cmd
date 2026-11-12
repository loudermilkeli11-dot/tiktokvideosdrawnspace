@echo off
rem Double-click to force-restart the War Room (stops every copy, then starts this one).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\restart.ps1"
pause
