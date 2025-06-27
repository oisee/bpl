@echo off
echo Starting BPMN-Lite Editor Setup...

cd "%~dp0"
if not exist "electron-portable" (
  echo First run - downloading necessary components...
  
  REM Create a temporary script to download and extract Electron
  echo $webClient = New-Object System.Net.WebClient > download.ps1
  echo $url = "https://github.com/electron/electron/releases/download/v28.3.3/electron-v28.3.3-win32-x64.zip" >> download.ps1
  echo $output = "$PSScriptRoot\electron.zip" >> download.ps1
  echo $webClient.DownloadFile($url, $output) >> download.ps1
  echo Add-Type -AssemblyName System.IO.Compression.FileSystem >> download.ps1
  echo [System.IO.Compression.ZipFile]::ExtractToDirectory($output, "$PSScriptRoot\electron-portable") >> download.ps1
  echo Remove-Item $output >> download.ps1
  
  REM Run the PowerShell script
  powershell.exe -ExecutionPolicy Bypass -File download.ps1
  del download.ps1
)

if exist "electron-portable\electron.exe" (
  echo Starting BPMN-Lite Editor...
  start "" "electron-portable\electron.exe" "%~dp0app"
) else (
  echo ERROR: Could not set up Electron.
  echo Please try running as administrator or contact support.
  pause
)
