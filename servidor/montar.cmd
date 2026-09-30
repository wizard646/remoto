@echo off
rem Remoto: arma la instalacion desde las fuentes .txt y abre la app
cd /d "%~dp0"

rem en la primera corrida los archivos llegan con .txt al final,
rem porque el antivirus borra los .ps1. hay que renombrar este
rem primero o este archivo no tendria nada que ejecutar.
if not exist "montar.ps1" if exist "montar.ps1.txt" (
  copy /y "montar.ps1.txt" "montar.ps1" >nul
)

if not exist "montar.ps1" (
  echo No se encontro montar.ps1 ni montar.ps1.txt
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0montar.ps1" %*
pause
