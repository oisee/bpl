const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copy HTML file to dist
console.log('Copying HTML file to dist...');
fs.copyFileSync(
  path.join(__dirname, 'src', 'index.html'),
  path.join(__dirname, 'dist', 'index.html')
);

console.log('Build completed successfully.');