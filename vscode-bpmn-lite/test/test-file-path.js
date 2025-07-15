#!/usr/bin/env node

/**
 * Test script to verify file path logic for export functionality
 */

// Mock the file path helper logic
function getDefaultExportPath(bplPath, extension) {
    if (bplPath && bplPath.endsWith('.bpl')) {
        const baseName = bplPath.replace(/\.bpl$/, '');
        return `${baseName}.${extension}`;
    }
    return `diagram.${extension}`;
}

console.log('Testing file path logic...');

// Test cases
const testCases = [
    { input: '/home/user/project/myfile.bpl', ext: 'png', expected: '/home/user/project/myfile.png' },
    { input: '/home/user/project/myfile.bpl', ext: 'svg', expected: '/home/user/project/myfile.svg' },
    { input: '/home/user/project/myfile.bpl', ext: 'mmd', expected: '/home/user/project/myfile.mmd' },
    { input: 'test.bpl', ext: 'png', expected: 'test.png' },
    { input: '', ext: 'png', expected: 'diagram.png' },
    { input: undefined, ext: 'png', expected: 'diagram.png' },
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    const result = getDefaultExportPath(testCase.input, testCase.ext);
    if (result === testCase.expected) {
        console.log(`✓ Test ${index + 1}: ${testCase.input} -> ${result}`);
        passed++;
    } else {
        console.log(`✗ Test ${index + 1}: ${testCase.input} -> ${result} (expected: ${testCase.expected})`);
        failed++;
    }
});

console.log(`\nFile path tests: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log('✓ All file path tests passed!');
} else {
    console.log('✗ Some file path tests failed');
    process.exit(1);
}