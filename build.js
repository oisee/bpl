const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building BPMN-lite Editor for distribution...');
const isElectronBuild = process.env.ELECTRON_BUILD === 'true';

if (isElectronBuild) {
  console.log('Building for Electron packaging...');
}

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Create tools directory in dist
if (!fs.existsSync(path.join('dist', 'tools'))) {
  fs.mkdirSync(path.join('dist', 'tools'));
}

// Create samples directory in dist
if (!fs.existsSync(path.join('dist', 'samples'))) {
  fs.mkdirSync(path.join('dist', 'samples'));
}

// Copy HTML file to dist
console.log('Copying HTML file to dist...');
fs.copyFileSync(
  path.join(__dirname, 'src', 'index.html'),
  path.join(__dirname, 'dist', 'index.html')
);

// Copy Python tool and related files
console.log('Copying Python tools and samples...');
fs.copyFileSync(
  path.join(__dirname, 'tools', 'ast_to_visio.py'),
  path.join(__dirname, 'dist', 'tools', 'ast_to_visio.py')
);

fs.copyFileSync(
  path.join(__dirname, 'tools', 'requirements.txt'),
  path.join(__dirname, 'dist', 'tools', 'requirements.txt')
);

fs.copyFileSync(
  path.join(__dirname, 'tools', 'README.md'),
  path.join(__dirname, 'dist', 'tools', 'README.md')
);

// Copy sample files
if (fs.existsSync(path.join(__dirname, 'samples', 'order_process.bpl'))) {
  fs.copyFileSync(
    path.join(__dirname, 'samples', 'order_process.bpl'),
    path.join(__dirname, 'dist', 'samples', 'order_process.bpl')
  );
}

if (fs.existsSync(path.join(__dirname, 'samples', 'order_process-ast.json'))) {
  fs.copyFileSync(
    path.join(__dirname, 'samples', 'order_process-ast.json'),
    path.join(__dirname, 'dist', 'samples', 'order_process-ast.json')
  );
}

if (fs.existsSync(path.join(__dirname, 'samples', 'order_process.xlsx'))) {
  fs.copyFileSync(
    path.join(__dirname, 'samples', 'order_process.xlsx'),
    path.join(__dirname, 'dist', 'samples', 'order_process.xlsx')
  );
}

// Copy additional files for Electron build
if (isElectronBuild) {
  console.log('Copying Electron-specific files...');
  
  // Ensure resources directory exists in the dist folder
  if (!fs.existsSync(path.join('dist', 'resources'))) {
    fs.mkdirSync(path.join('dist', 'resources'));
  }
  
  // Copy icons
  if (fs.existsSync(path.join(__dirname, 'resources', 'icon.svg'))) {
    fs.copyFileSync(
      path.join(__dirname, 'resources', 'icon.svg'),
      path.join(__dirname, 'dist', 'resources', 'icon.svg')
    );
  }

  if (fs.existsSync(path.join(__dirname, 'resources', 'icon.ico'))) {
    fs.copyFileSync(
      path.join(__dirname, 'resources', 'icon.ico'),
      path.join(__dirname, 'dist', 'resources', 'icon.ico')
    );
  }
  
  // Create a dummy icon.ico if it doesn't exist (for Windows builds)
  if (!fs.existsSync(path.join(__dirname, 'resources', 'icon.ico'))) {
    console.log('Creating dummy icon.ico for Windows builds');
    // Create a minimal empty file
    fs.writeFileSync(path.join(__dirname, 'resources', 'icon.ico'), '');
  }
}

// Create a server-side helper script
const serverHelper = `
// This script helps with server-side operations for the BPL editor
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Converts AST JSON to Visio Excel format
function convertAstToVisio(inputJsonPath, outputXlsxPath) {
  try {
    // Check if Python is available
    try {
      execSync('python3 --version');
    } catch (err) {
      try {
        execSync('python --version');
      } catch (err2) {
        console.error('Python is not available. Please install Python 3 to use this feature.');
        return false;
      }
    }
    
    // Run the conversion script
    const scriptPath = path.join(__dirname, 'tools', 'ast_to_visio.py');
    
    // Try python3 first, then python if that fails
    try {
      execSync(\`python3 "\${scriptPath}" "\${inputJsonPath}" "\${outputXlsxPath}"\`);
    } catch (err) {
      execSync(\`python "\${scriptPath}" "\${inputJsonPath}" "\${outputXlsxPath}"\`);
    }
    
    console.log(\`Successfully converted \${inputJsonPath} to \${outputXlsxPath}\`);
    return true;
  } catch (error) {
    console.error('Error converting AST to Visio format:', error.message);
    return false;
  }
}

module.exports = {
  convertAstToVisio
};
`;

fs.writeFileSync(
  path.join(__dirname, 'dist', 'server-helper.js'),
  serverHelper
);

console.log('Build completed successfully.');

// For Electron builds, provide some helpful instructions
if (isElectronBuild) {
  console.log('\nTo package the application as an Electron app:');
  console.log('1. Run: npm run pack   (creates unpacked directory)');
  console.log('2. Run: npm run dist   (creates installers)');
  console.log('\nInstaller will be created in the dist/ directory.');
}