# Packaging Guide for BPMN-lite Editor

This guide explains how to package the BPMN-lite Editor as a standalone desktop application for non-technical users.

## Prerequisites

- Node.js 14.x or later
- npm 6.x or later
- Python 3.6 or later (for Visio export functionality)

## Building the Electron Application

The application uses Electron to create standalone desktop executables that can be distributed to users without requiring them to install Node.js or other dependencies.

### Development Setup

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd bpl
npm install
```

2. Build the web application first:

```bash
npm run build
```

3. Start the Electron application in development mode:

```bash
npm start
```

### Creating Distributable Packages

To create distributable installers for your current platform:

1. Build the application with Electron support:

```bash
ELECTRON_BUILD=true npm run build
```

2. Package the application:

```bash
# Create an unpacked directory (for testing)
npm run pack

# Create installers for your current platform
npm run dist
```

3. The generated installers will be placed in the `dist` directory.

### Cross-Platform Building

#### Building from Linux or WSL

When building from Linux or WSL (Windows Subsystem for Linux), you can create:
- Linux AppImage: `npm run dist:linux` (works well on Linux)
- Simple Portable Package (works on all platforms): `./create-portable.sh`

#### Simple Portable Package (Recommended)

The easiest way to create a Windows-compatible package from any environment is to use our portable package script:

1. Make the script executable if needed:
   ```bash
   chmod +x create-portable.sh
   ```

2. Run the script:
   ```bash
   ./create-portable.sh
   ```

3. The portable package will be created in the `BPMN-Lite-Editor-Portable` directory

4. To use the portable package on Windows:
   - Copy the entire `BPMN-Lite-Editor-Portable` folder to the Windows machine
   - Double-click the `Launch-BPMN-Lite-Editor.bat` file to start the application

This approach:
- Works on all platforms
- Doesn't require Docker or Wine
- Creates a simple, portable package that works on Windows without installation
- Is less error-prone than cross-compiling installers

#### Docker Approach (Alternative)

For building official Windows installers, you can use Docker:

1. Install Docker on your Linux machine
2. Run the following command:

```bash
docker run --rm -ti \
 --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS_TAG|TRAVIS|TRAVIS_REPO_|TRAVIS_BUILD_|TRAVIS_BRANCH|TRAVIS_PULL_REQUEST_|APPVEYOR_|CSC_|GH_|GITHUB_|BT_|AWS_|STRIP|BUILD_') \
 --env ELECTRON_CACHE="/root/.cache/electron" \
 --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
 -v ${PWD}:/project \
 -v ${PWD##*/}-node-modules:/project/node_modules \
 -v ~/.cache/electron:/root/.cache/electron \
 -v ~/.cache/electron-builder:/root/.cache/electron-builder \
 electronuserland/builder:wine
```

3. Inside the Docker container, run:

```bash
yarn
ELECTRON_BUILD=true npm run build
npm run dist:win
```

## Distribution Options

### Windows (.exe installer)

- Installer will be created in `dist/BPMN-Lite Editor Setup x.x.x.exe`
- Users can double-click this file to install the application
- Installation creates shortcuts in the Start Menu and desktop

### macOS (.dmg disk image)

- Disk image will be created in `dist/BPMN-Lite Editor-x.x.x.dmg`
- Users can mount the disk image and drag the application to their Applications folder
- The application is signed with your developer identity (if configured)

### Linux (AppImage)

- AppImage will be created in `dist/BPMN-Lite Editor-x.x.x.AppImage`
- Users can make the file executable and run it directly
- AppImage contains all dependencies and works across many Linux distributions

## Customizing the Package

You can customize the build configuration in `package.json` under the `build` section:

```json
"build": {
  "appId": "com.bpmnlite.editor",
  "productName": "BPMN-Lite Editor",
  "files": [
    "dist/**/*",
    "main.js",
    "!node_modules/**/*"
  ],
  "directories": {
    "buildResources": "resources"
  },
  ...
}
```

### Customizing the Application Icon

Replace the icon files in the `resources` directory:
- `icon.svg` - Vector version of the icon (recommended for best compatibility)
- For platform-specific formats, you may need additional icon files based on your target platforms

### Additional Configuration Options

For more configuration options, refer to the [electron-builder documentation](https://www.electron.build/).

## Python Dependency

The application requires Python for the Visio export functionality. There are two options for handling this:

1. **Require users to install Python separately**:
   - Provide clear instructions for installing Python
   - Application will display an error message if Python is not found

2. **Bundle Python with the application**:
   - More complex setup but provides better user experience
   - Increases the installer size significantly
   - Requires additional configuration in electron-builder

## Troubleshooting Common Issues

### "Python not found" error

- Ensure Python is installed and available in the PATH
- The application will try both `python3` and `python` commands

### Missing dependencies

- Run `npm install` to ensure all Node.js dependencies are installed
- Run `pip install -r tools/requirements.txt` to install Python dependencies

### Build fails

- Ensure you have write permissions to the `dist` directory
- Check that all required files exist in the project
- Verify that the application works in development mode before packaging