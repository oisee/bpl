const { exec } = require('child_process');

// Build the project first
console.log('Building the project...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error building the project: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Build errors: ${stderr}`);
  }
  
  console.log(stdout);
  
  // Run the test file
  console.log('Running the test...');
  exec('node --experimental-modules dist/test.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running the test: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.error(`Test errors: ${stderr}`);
    }
    
    console.log(stdout);
    console.log('Test completed successfully.');
  });
});