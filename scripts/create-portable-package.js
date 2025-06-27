/**
 * This script creates a simple portable package that works on Windows
 * It's an alternative to electron-builder for cross-platform builds
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define paths
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const outputDir = path.join(rootDir, 'BPMN-Lite-Editor-Portable');
const appDir = path.join(outputDir, 'app');

console.log('Creating portable package...');

// Create output directory structure
if (fs.existsSync(outputDir)) {
  console.log('Cleaning previous build...');
  fs.rmSync(outputDir, { recursive: true, force: true });
}

fs.mkdirSync(outputDir);
fs.mkdirSync(appDir);

// Copy required files
console.log('Copying application files...');

// Copy dist folder
fs.cpSync(distDir, path.join(appDir, 'dist'), { recursive: true });

// Copy main files
const filesToCopy = [
  'main.js',
  'preload.js',
  'package.json'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(path.join(rootDir, file))) {
    fs.copyFileSync(
      path.join(rootDir, file),
      path.join(appDir, file)
    );
  }
});

// Copy resources 
if (fs.existsSync(path.join(rootDir, 'resources'))) {
  fs.cpSync(
    path.join(rootDir, 'resources'),
    path.join(appDir, 'resources'),
    { recursive: true }
  );
}

// Create launcher scripts
console.log('Creating launcher scripts...');

// Windows batch file
const batchScript = `@echo off
echo Starting BPMN-Lite Editor...
cd "%~dp0app"

REM Check for various Electron locations
set ELECTRON_FOUND=0

if exist "node_modules\\.bin\\electron.cmd" (
  set ELECTRON_FOUND=1
  node_modules\\.bin\\electron.cmd .
  goto :end
)

if exist "node_modules\\electron\\dist\\electron.exe" (
  set ELECTRON_FOUND=1
  node_modules\\electron\\dist\\electron.exe .
  goto :end
)

if %ELECTRON_FOUND%==0 (
  echo ERROR: Could not find Electron executable.
  echo Installing required dependencies...
  npm install --no-save electron@latest
  
  if exist "node_modules\\electron\\dist\\electron.exe" (
    echo Starting application...
    node_modules\\electron\\dist\\electron.exe .
  ) else (
    echo Installation failed. Please ensure you have Node.js installed.
    pause
  )
)

:end
`;

fs.writeFileSync(path.join(outputDir, 'Launch-BPMN-Lite-Editor.bat'), batchScript);

// Create a simplified no-dependencies batch file
const simpleBatchScript = `@echo off
echo Starting BPMN-Lite Editor Setup...

cd "%~dp0"
if not exist "electron-portable" (
  echo First run - downloading necessary components...
  
  REM Create a temporary script to download and extract Electron
  echo $webClient = New-Object System.Net.WebClient > download.ps1
  echo $url = "https://github.com/electron/electron/releases/download/v28.3.3/electron-v28.3.3-win32-x64.zip" >> download.ps1
  echo $output = "$PSScriptRoot\\electron.zip" >> download.ps1
  echo $webClient.DownloadFile($url, $output) >> download.ps1
  echo Add-Type -AssemblyName System.IO.Compression.FileSystem >> download.ps1
  echo [System.IO.Compression.ZipFile]::ExtractToDirectory($output, "$PSScriptRoot\\electron-portable") >> download.ps1
  echo Remove-Item $output >> download.ps1
  
  REM Run the PowerShell script
  powershell.exe -ExecutionPolicy Bypass -File download.ps1
  del download.ps1
)

if exist "electron-portable\\electron.exe" (
  echo Starting BPMN-Lite Editor...
  start "" "electron-portable\\electron.exe" "%~dp0app"
) else (
  echo ERROR: Could not set up Electron.
  echo Please try running as administrator or contact support.
  pause
)
`;

fs.writeFileSync(path.join(outputDir, 'Simple-Start.bat'), simpleBatchScript);

// Create README
console.log('Creating README...');
const readmeContent = `# BPMN-Lite Editor - Portable Edition

## How to Use

### Windows
1. Option 1 (Recommended): Double-click the "Simple-Start.bat" file
   - This will download Electron the first time it runs
   - Requires internet connection on first run only
   - Works on all Windows computers without dependencies

2. Option 2: Double-click the "Launch-BPMN-Lite-Editor.bat" file
   - Uses Node.js and npm if installed
   - May require administrator privileges

## About
BPMN-Lite Editor is a simple tool for creating business process diagrams using a lightweight syntax.

For more information, see the included documentation.
`;

fs.writeFileSync(path.join(outputDir, 'README.txt'), readmeContent);

// Create an info file
const infoContent = `BPMN-Lite Editor
Version: ${require(path.join(rootDir, 'package.json')).version}
Created: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(outputDir, 'version.txt'), infoContent);

// Install minimal dependencies for portable version
console.log('Installing minimal dependencies...');
process.chdir(appDir);

try {
  // Only install electron for the portable package
  console.log('Installing Electron...');
  execSync('npm install --no-save electron@latest', { stdio: 'inherit' });
  
  // Verify electron installation
  console.log('Verifying Electron installation...');
  const electronPath = path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe');
  const electronCmdPath = path.join(appDir, 'node_modules', '.bin', 'electron.cmd');
  
  if (fs.existsSync(electronPath)) {
    console.log(`Found Electron at: ${electronPath}`);
  } else if (fs.existsSync(electronCmdPath)) {
    console.log(`Found Electron command at: ${electronCmdPath}`);
  } else {
    console.warn('Warning: Could not find Electron executable. The package may not work correctly.');
    console.warn('Users will need to use the Simple-Start.bat which will download Electron automatically.');
  }
} catch (error) {
  console.error('Failed to install dependencies:', error);
  console.log('Users will need to use the Simple-Start.bat which will download Electron automatically.');
}

console.log('Portable package created successfully!');
console.log(`Output: ${outputDir}`);
console.log('');
console.log('IMPORTANT: For most reliable results, users should run Simple-Start.bat');
console.log('This will download Electron on first run and does not require Node.js to be installed.');