@echo off
echo Starting BPMN-Lite Editor...
cd "%~dp0app"

REM Check for various Electron locations
set ELECTRON_FOUND=0

if exist "node_modules\.bin\electron.cmd" (
  set ELECTRON_FOUND=1
  node_modules\.bin\electron.cmd .
  goto :end
)

if exist "node_modules\electron\dist\electron.exe" (
  set ELECTRON_FOUND=1
  node_modules\electron\dist\electron.exe .
  goto :end
)

if %ELECTRON_FOUND%==0 (
  echo ERROR: Could not find Electron executable.
  echo Installing required dependencies...
  npm install --no-save electron@latest
  
  if exist "node_modules\electron\dist\electron.exe" (
    echo Starting application...
    node_modules\electron\dist\electron.exe .
  ) else (
    echo Installation failed. Please ensure you have Node.js installed.
    pause
  )
)

:end
