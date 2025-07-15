#!/usr/bin/env node

/**
 * Test File Inventory
 * 
 * This script scans for all test files in the project and provides
 * a comprehensive inventory of available tests.
 */

const fs = require('fs');
const path = require('path');

// Color codes for output
const colors = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  RESET: '\x1b[0m'
};

class TestInventory {
  constructor() {
    this.testFiles = [];
    this.projectRoot = path.resolve(__dirname, '..');
    this.parentDir = path.resolve(__dirname, '../..');
  }

  scanForTests() {
    console.log(`${colors.CYAN}=== BPL Test File Inventory ===${colors.RESET}\n`);
    
    // Scan current directory
    this.scanDirectory(this.projectRoot, 'VSCode Extension Directory');
    
    // Scan parent directory
    this.scanDirectory(this.parentDir, 'Parent Directory');
    
    this.printSummary();
  }

  scanDirectory(dir, label) {
    console.log(`${colors.BLUE}--- ${label} ---${colors.RESET}`);
    
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isFile() && this.isTestFile(item.name)) {
          this.analyzeTestFile(fullPath, label);
        } else if (item.isDirectory() && item.name === 'test') {
          this.scanTestDirectory(fullPath, label);
        }
      }
    } catch (error) {
      console.log(`${colors.RED}Error scanning ${dir}: ${error.message}${colors.RESET}`);
    }
    
    console.log();
  }

  scanTestDirectory(testDir, parentLabel) {
    console.log(`${colors.MAGENTA}  Test Directory: ${testDir}${colors.RESET}`);
    
    try {
      const items = fs.readdirSync(testDir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isFile()) {
          const fullPath = path.join(testDir, item.name);
          this.analyzeTestFile(fullPath, `${parentLabel}/test`);
        }
      }
    } catch (error) {
      console.log(`${colors.RED}  Error scanning test directory: ${error.message}${colors.RESET}`);
    }
  }

  isTestFile(filename) {
    const testPatterns = [
      /^test.*\.(js|html|bpl)$/i,
      /.*test.*\.(js|html|bpl)$/i,
      /.*spec.*\.(js|html|bpl)$/i
    ];
    
    return testPatterns.some(pattern => pattern.test(filename));
  }

  analyzeTestFile(filePath, category) {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath);
    const relativePath = path.relative(this.projectRoot, filePath);
    
    let fileType = 'Unknown';
    let description = '';
    let testCount = 0;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Determine file type and analyze content
      if (ext === '.js') {
        fileType = 'JavaScript';
        testCount = this.countJavaScriptTests(content);
        description = this.extractJavaScriptDescription(content);
      } else if (ext === '.html') {
        fileType = 'HTML';
        description = this.extractHTMLDescription(content);
      } else if (ext === '.bpl') {
        fileType = 'BPL';
        description = 'BPL test data file';
      }
    } catch (error) {
      description = `Error reading file: ${error.message}`;
    }
    
    this.testFiles.push({
      filename,
      filePath,
      relativePath,
      category,
      fileType,
      description,
      testCount
    });
    
    // Print file info
    const testCountStr = testCount > 0 ? `${colors.GREEN}(${testCount} tests)${colors.RESET}` : '';
    console.log(`  ${colors.YELLOW}${filename}${colors.RESET} ${testCountStr}`);
    console.log(`    Type: ${fileType}`);
    console.log(`    Path: ${relativePath}`);
    if (description) {
      console.log(`    Description: ${description}`);
    }
    console.log();
  }

  countJavaScriptTests(content) {
    // Count test functions, describe blocks, etc.
    const testPatterns = [
      /runner\.addTest\(/g,
      /function\s+test/g,
      /const\s+test\d+/g,
      /describe\(/g,
      /it\(/g
    ];
    
    let count = 0;
    for (const pattern of testPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }

  extractJavaScriptDescription(content) {
    // Look for description in comments
    const descriptionPatterns = [
      /\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/,
      /\/\*\s*(.+?)\s*\*\//,
      /\/\/\s*(.+)/
    ];
    
    for (const pattern of descriptionPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Look for test names
    const testMatch = content.match(/Testing:\s*(.+)/);
    if (testMatch) {
      return testMatch[1].trim();
    }
    
    return '';
  }

  extractHTMLDescription(content) {
    // Look for title or description in HTML
    const titleMatch = content.match(/<title>(.+?)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    const h1Match = content.match(/<h1>(.+?)<\/h1>/i);
    if (h1Match) {
      return h1Match[1].trim();
    }
    
    return 'HTML test file';
  }

  printSummary() {
    console.log(`${colors.CYAN}=== Summary ===${colors.RESET}`);
    console.log(`Total test files found: ${this.testFiles.length}`);
    
    // Group by category
    const categories = {};
    for (const file of this.testFiles) {
      if (!categories[file.category]) {
        categories[file.category] = [];
      }
      categories[file.category].push(file);
    }
    
    console.log(`\n${colors.BLUE}By Category:${colors.RESET}`);
    for (const [category, files] of Object.entries(categories)) {
      console.log(`  ${category}: ${files.length} files`);
    }
    
    // Group by file type
    const types = {};
    for (const file of this.testFiles) {
      if (!types[file.fileType]) {
        types[file.fileType] = [];
      }
      types[file.fileType].push(file);
    }
    
    console.log(`\n${colors.BLUE}By File Type:${colors.RESET}`);
    for (const [type, files] of Object.entries(types)) {
      console.log(`  ${type}: ${files.length} files`);
    }
    
    // Count total tests
    const totalTests = this.testFiles.reduce((sum, file) => sum + file.testCount, 0);
    console.log(`\n${colors.GREEN}Total tests: ${totalTests}${colors.RESET}`);
    
    // Recommendations
    console.log(`\n${colors.YELLOW}Recommendations:${colors.RESET}`);
    
    const jsFiles = this.testFiles.filter(f => f.fileType === 'JavaScript');
    const htmlFiles = this.testFiles.filter(f => f.fileType === 'HTML');
    const bplFiles = this.testFiles.filter(f => f.fileType === 'BPL');
    
    if (jsFiles.length > 3) {
      console.log(`  • Consider consolidating ${jsFiles.length} JavaScript test files`);
    }
    
    if (htmlFiles.length > 0) {
      console.log(`  • Convert ${htmlFiles.length} HTML test files to automated tests`);
    }
    
    if (bplFiles.length > 0) {
      console.log(`  • Use ${bplFiles.length} BPL files as test data in automated tests`);
    }
    
    console.log(`  • Main test suite: test/test-suite.js (${this.testFiles.find(f => f.filename === 'test-suite.js')?.testCount || 0} tests)`);
  }
}

// Run the inventory
const inventory = new TestInventory();
inventory.scanForTests();