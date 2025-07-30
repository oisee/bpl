// Shared parser template for BPL
// This template generates both JavaScript (for index.html) and TypeScript (for VSCode extension)

const parserTemplate = {
  // Core parser class definition
  className: 'BpmnLiteParser',
  
  // Properties with their types
  properties: [
    { name: 'processes', type: 'string[]', init: '[]' },
    { name: 'lanes', type: 'Record<string, { process: string | null; tasks: string[] }>', init: '{}' },
    { name: 'tasks', type: 'Record<string, any>', init: '{}' },
    { name: 'connections', type: 'any[]', init: '[]' },
    { name: 'dataObjects', type: 'any[]', init: '[]' },
    { name: 'messages', type: 'any[]', init: '[]' },
    { name: 'events', type: 'string[]', init: '[]' },
    { name: 'currentProcess', type: 'string | null', init: 'null' },
    { name: 'currentLane', type: 'string | null', init: 'null' },
    { name: 'lastTask', type: 'string | null', init: 'null' },
    { name: 'taskScope', type: 'Record<string, string>', init: '{}' },
    { name: 'gatewayStack', type: 'string[]', init: '[]' },
    { name: 'connectionBreaks', type: 'number[]', init: '[]' },
    { name: 'taskLineNumbers', type: 'Record<string, number>', init: '{}' },
    { name: 'originalText', type: 'string', init: "''" },
    { name: 'currentLineIndex', type: 'number', init: '0' }
  ],
  
  // Method signatures
  methods: {
    parse: {
      params: [{ name: 'text', type: 'string' }],
      returnType: 'any',
      visibility: 'public'
    },
    connectTasks: {
      params: [],
      returnType: 'void',
      visibility: 'private'
    },
    buildGlobalTaskOrder: {
      params: [],
      returnType: 'any[]',
      visibility: 'private'
    },
    findTasksCreatedAtLine: {
      params: [{ name: 'lineNumber', type: 'number' }],
      returnType: 'string[]',
      visibility: 'private'
    },
    createImplicitConnections: {
      params: [{ name: 'globalTaskOrder', type: 'any[]' }],
      returnType: 'void',
      visibility: 'private'
    },
    processExplicitArrowConnections: {
      params: [],
      returnType: 'void',
      visibility: 'private'
    },
    parseArrowConnections: {
      params: [
        { name: 'line', type: 'string' },
        { name: 'lineNumber', type: 'number' }
      ],
      returnType: 'any[]',
      visibility: 'private'
    },
    resolvePartToTaskId: {
      params: [
        { name: 'part', type: 'string' },
        { name: 'lineNumber', type: 'number' }
      ],
      returnType: 'string | null',
      visibility: 'private'
    },
    connectMessageFlows: {
      params: [],
      returnType: 'void',
      visibility: 'private'
    },
    handleSpecialConnections: {
      params: [{ name: 'globalTaskOrder', type: 'any[]' }],
      returnType: 'void',
      visibility: 'private'
    }
  }
};

// Function to generate JavaScript version
function generateJavaScript(implementationCode) {
  let js = `    class ${parserTemplate.className} {\n`;
  js += '      constructor() {\n';
  
  // Add property initializations
  parserTemplate.properties.forEach(prop => {
    js += `        this.${prop.name} = ${prop.init};\n`;
  });
  
  js += '      }\n\n';
  
  // Add implementation code
  js += implementationCode;
  
  js += '    }';
  
  return js;
}

// Function to generate TypeScript version
function generateTypeScript(implementationCode) {
  let ts = `// This is a TypeScript port of the BpmnLiteParser from the main application
// Auto-generated from shared parser template
// Last sync: ${new Date().toISOString()}

export class ${parserTemplate.className} {\n`;
  
  // Add typed property declarations
  parserTemplate.properties.forEach(prop => {
    ts += `    private ${prop.name}: ${prop.type} = ${prop.init};\n`;
  });
  
  ts += '\n';
  
  // Convert implementation code to TypeScript
  let tsImplementation = implementationCode;
  
  // Add type annotations to method signatures
  Object.entries(parserTemplate.methods).forEach(([methodName, method]) => {
    const params = method.params.map(p => `${p.name}: ${p.type}`).join(', ');
    const visibility = method.visibility === 'public' ? '' : 'private ';
    const regex = new RegExp(`${methodName}\\s*\\([^)]*\\)\\s*{`, 'g');
    tsImplementation = tsImplementation.replace(regex, `${visibility}${methodName}(${params}): ${method.returnType} {`);
  });
  
  // Fix other TypeScript-specific patterns
  tsImplementation = tsImplementation.replace(/const (\w+) = /g, 'const $1: any = ');
  tsImplementation = tsImplementation.replace(/let (\w+) = /g, 'let $1: any = ');
  tsImplementation = tsImplementation.replace(/for \(const (\w+) of/g, 'for (const $1 of');
  
  ts += tsImplementation;
  ts += '}';
  
  return ts;
}

module.exports = {
  parserTemplate,
  generateJavaScript,
  generateTypeScript
};