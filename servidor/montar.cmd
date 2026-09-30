@echo off
rem Remoto: arma la instalacion desde las fuentes .txt y abre la app
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0montar.ps1" %*