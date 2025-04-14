import { BpmnLiteParser } from './parser/BpmnLiteParser.js';
import { MermaidTranspiler } from './transpilers/MermaidTranspiler.js';

// Sample DSL
const sampleDSL = `:Order Process

@Customer
  place order
  send: Payment Information
  "Customer waits for confirmation
  receive: Order Confirmation

@System
  receive: Payment Information
  process order
  validate payment
  ?Payment successful
    +yes
    -no
  ship order
  send: Order Confirmation

^Order @Customer.place order -> @System.process order
#OrderData place order`;

// Parse the DSL
const parser = new BpmnLiteParser();
const ast = parser.parse(sampleDSL);

// Print the AST
console.log('AST:');
console.log(JSON.stringify(ast, null, 2));

// Transpile to Mermaid
const transpiler = new MermaidTranspiler();
const mermaidCode = transpiler.transpile(ast);

// Print the Mermaid code
console.log('\nMermaid Code:');
console.log(mermaidCode);

/**
 * This file demonstrates the usage of the BpmnLiteParser and MermaidTranspiler.
 * To run this file:
 * 1. Build the project: npm run build
 * 2. Run the test: node dist/test.js
 */