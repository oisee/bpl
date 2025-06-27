#!/bin/bash
# Script to build Windows version using Docker

echo "Building Windows executable using Docker..."
echo "Requires Docker to be installed and running."

# Run Docker container with electron-builder
docker run --rm -ti \
  --env ELECTRON_CACHE="/root/.cache/electron" \
  --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
  -v ${PWD}:/project \
  -v ${PWD##*/}-node-modules:/project/node_modules \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine /bin/bash -c "cd /project && npm install && ELECTRON_BUILD=true npm run build && npm run dist:win"

echo "Build complete! Check the dist/ directory for the Windows executable."