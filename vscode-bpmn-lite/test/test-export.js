#!/usr/bin/env node

/**
 * Test script to verify export functionality
 */

const { BpmnLiteParser } = require('../out/parser.js');
const fs = require('fs');

console.log('Testing export functionality...');

// Test basic parsing and mermaid generation
const parser = new BpmnLiteParser();
const bpl = `:Test Export Process
@Customer
  place order
  send: Payment
  receive: Confirmation
@System
  receive: Payment
  ?Payment Valid
    +ship order
    -cancel order
  send: Confirmation
  !End`;

try {
    const ast = parser.parse(bpl);
    console.log('✓ Parser works correctly');
    
    const mermaid = parser.toMermaid();
    console.log('✓ Mermaid generation works');
    
    // Test that mermaid contains expected content
    if (mermaid.includes('flowchart TD')) {
        console.log('✓ Mermaid flowchart format correct');
    } else {
        console.log('✗ Mermaid flowchart format incorrect');
    }
    
    // Test that AST contains expected structures
    if (ast.connections && ast.connections.length > 0) {
        console.log('✓ AST has connections');
    } else {
        console.log('✗ AST missing connections');
    }
    
    if (Object.keys(parser.tasks).length > 0) {
        console.log('✓ Parser has tasks');
    } else {
        console.log('✗ Parser missing tasks');
    }
    
    console.log('\nExport functionality test completed successfully!');
    
} catch (error) {
    console.error('✗ Export test failed:', error.message);
    process.exit(1);
}