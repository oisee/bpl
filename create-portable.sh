#!/bin/bash
# Create a portable package for Windows

echo "Building BPMN-Lite Editor Portable Package"
echo "=======================================\n"

# Build the application
echo "Step 1: Building application..."
ELECTRON_BUILD=true npm run build

# Create portable package
echo -e "\nStep 2: Creating portable package..."
node scripts/create-portable-package.js

echo -e "\nPortable package created!"
echo "You can find it in the BPMN-Lite-Editor-Portable directory"
echo "To use it on Windows, simply copy the entire directory and run Launch-BPMN-Lite-Editor.bat"