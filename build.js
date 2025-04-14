const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Compile TypeScript
console.log('Compiling TypeScript...');
exec('npx tsc', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error compiling TypeScript: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`TypeScript compiler errors: ${stderr}`);
    return;
  }
  
  console.log('TypeScript compilation successful.');
  
  // Copy HTML file to dist
  console.log('Copying HTML file to dist...');
  fs.copyFileSync(
    path.join(__dirname, 'src', 'index.html'),
    path.join(__dirname, 'dist', 'index.html')
  );
  
  console.log('Build completed successfully.');
});