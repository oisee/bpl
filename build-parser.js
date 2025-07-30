#!/usr/bin/env node

/**
 * Build script to extract parser from src/index.html and generate TypeScript version
 * This ensures the parser stays in sync across all uses
 */

const fs = require('fs');
const path = require('path');

console.log('Extracting parser from src/index.html...');

// Read source HTML
const htmlPath = path.join(__dirname, 'src', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract parser class with better regex
const lines = html.split('\n');
let inClass = false;
let braceCount = 0;
let classLines = [];
let startIndex = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('class BpmnLiteParser {')) {
    inClass = true;
    startIndex = i;
    braceCount = 0;
  }
  
  if (inClass) {
    classLines.push(line);
    
    // Count braces
    for (const char of line) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
    
    // Check if class is complete
    if (braceCount === 0 && classLines.length > 1) {
      break;
    }
  }
}

if (startIndex === -1) {
  console.error('ERROR: Could not find BpmnLiteParser class in src/index.html');
  process.exit(1);
}

const parserCode = classLines.join('\n');

// Create shared directory if it doesn't exist
const sharedDir = path.join(__dirname, 'shared');
if (!fs.existsSync(sharedDir)) {
  fs.mkdirSync(sharedDir);
}

// Save original JavaScript version
fs.writeFileSync(path.join(sharedDir, 'parser-original.js'), parserCode);
console.log('✓ Saved original parser to shared/parser-original.js');

// Generate TypeScript version
console.log('\nGenerating TypeScript version...');

// Remove leading spaces and convert to TypeScript
let tsCode = parserCode.replace(/^    /gm, '');

// Add property type declarations
const propertyTypes = {
  'processes = []': 'private processes: string[] = []',
  'lanes = {}': 'private lanes: Record<string, { process: string | null; tasks: string[] }> = {}',
  'tasks = {}': 'private tasks: Record<string, any> = {}',
  'connections = []': 'private connections: any[] = []',
  'dataObjects = []': 'private dataObjects: any[] = []',
  'messages = []': 'private messages: any[] = []',
  'events = []': 'private events: string[] = []',
  'currentProcess = null': 'private currentProcess: string | null = null',
  'currentLane = null': 'private currentLane: string | null = null',
  'lastTask = null': 'private lastTask: string | null = null',
  'taskScope = {}': 'private taskScope: Record<string, string> = {}',
  'gatewayStack = []': 'private gatewayStack: string[] = []',
  'connectionBreaks = []': 'private connectionBreaks: number[] = []',
  'taskLineNumbers = {}': 'private taskLineNumbers: Record<string, number> = {}',
  'originalText = text': 'private originalText: string = ""',
  'currentLineIndex = 0': 'private currentLineIndex: number = 0'
};

// Extract constructor body and create property declarations
const constructorMatch = tsCode.match(/constructor\(\) \{([\s\S]*?)\n  \}/);
if (constructorMatch) {
  const constructorBody = constructorMatch[1];
  const propertyDeclarations = [];
  
  // Extract properties from constructor
  const propertyLines = constructorBody.split('\n').filter(line => line.includes('this.'));
  propertyLines.forEach(line => {
    const match = line.match(/this\.(\w+) = (.+);/);
    if (match) {
      const [, name, value] = match;
      let type = 'any';
      if (value === '[]') type = 'any[]';
      else if (value === '{}') type = 'Record<string, any>';
      else if (value === 'null') type = 'string | null';
      else if (value === "''") type = 'string';
      else if (value === '0') type = 'number';
      else if (value === 'text') type = 'string';
      
      // Special cases
      if (name === 'processes') type = 'string[]';
      if (name === 'lanes') type = 'Record<string, { process: string | null; tasks: string[] }>';
      if (name === 'taskScope') type = 'Record<string, string>';
      if (name === 'taskLineNumbers') type = 'Record<string, number>';
      if (name === 'gatewayStack') type = 'string[]';
      if (name === 'connectionBreaks') type = 'number[]';
      if (name === 'events') type = 'string[]';
      
      propertyDeclarations.push(`  private ${name}: ${type} = ${value === 'text' ? '""' : value};`);
    }
  });
  
  // Replace constructor
  tsCode = tsCode.replace(/constructor\(\) \{[\s\S]*?\n  \}/, 'constructor() {}');
  
  // Add property declarations before constructor
  tsCode = tsCode.replace('class BpmnLiteParser {', 
    'class BpmnLiteParser {\n' + propertyDeclarations.join('\n') + '\n');
}

// Add method type signatures
const methodSignatures = {
  'parse(text)': 'parse(text: string): any',
  'connectTasks()': 'private connectTasks(): void',
  'buildGlobalTaskOrder()': 'private buildGlobalTaskOrder(): any[]',
  'findTasksCreatedAtLine(lineNumber)': 'private findTasksCreatedAtLine(lineNumber: number): string[]',
  'createImplicitConnections(globalTaskOrder)': 'private createImplicitConnections(globalTaskOrder: any[]): void',
  'processExplicitArrowConnections()': 'private processExplicitArrowConnections(): void',
  'parseArrowConnections(line, lineNumber)': 'private parseArrowConnections(line: string, lineNumber: number): any[]',
  'resolvePartToTaskId(part, lineNumber)': 'private resolvePartToTaskId(part: string, lineNumber: number): string | null',
  'connectMessageFlows()': 'private connectMessageFlows(): void',
  'handleSpecialConnections(globalTaskOrder)': 'private handleSpecialConnections(globalTaskOrder: any[]): void',
  'normalizeId(text)': 'private normalizeId(text: string): string',
  'ensureProcess(processName)': 'private ensureProcess(processName: string): void',
  'parseProcess(line)': 'private parseProcess(line: string): void',
  'parseLane(line)': 'private parseLane(line: string): void',
  'parseTask(line)': 'private parseTask(line: string): string | null',
  'parseGateway(line)': 'private parseGateway(line: string): string',
  'parseGatewayBranch(line)': 'private parseGatewayBranch(line: string): string | null',
  'parseComment(line)': 'private parseComment(line: string): void',
  'addConnection(type, sourceId, targetId, label)': 'private addConnection(type: string, sourceId: string, targetId: string, label?: string): void',
  'hasConnectionBreakBetween(lineNum1, lineNum2)': 'private hasConnectionBreakBetween(lineNum1: number, lineNum2: number): boolean',
  'splitConnections(line)': 'private splitConnections(line: string): string[]',
  'resolveTaskId(ref, createIfMissing)': 'private resolveTaskId(ref: string, createIfMissing?: boolean): string | null',
  'getActiveLanes()': 'private getActiveLanes(): string[]',
  'findTaskByNormalizedName(normalizedName, lanes)': 'private findTaskByNormalizedName(normalizedName: string, lanes?: string[]): any',
  'connectSequentialTasks()': 'private connectSequentialTasks(): void',
  'connectAcrossLanes()': 'private connectAcrossLanes(): void'
};

// Replace method signatures
Object.entries(methodSignatures).forEach(([oldSig, newSig]) => {
  const regex = new RegExp(oldSig.replace(/[()]/g, '\\$&') + '\\s*{', 'g');
  tsCode = tsCode.replace(regex, newSig + ' {');
});

// Add export and header
const finalTsCode = `// This is a TypeScript port of the BpmnLiteParser from the main application
// Auto-generated by build-parser.js - DO NOT EDIT DIRECTLY
// Last sync: ${new Date().toISOString()}

export ${tsCode}`;

// Write TypeScript file
fs.writeFileSync(path.join(__dirname, 'vscode-bpmn-lite', 'src', 'parser.ts'), finalTsCode);
console.log('✅ Updated vscode-bpmn-lite/src/parser.ts');

console.log('\nParser sync complete!');