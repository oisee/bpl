# BPL AST to Visio Excel Converter

This tool converts Business Process Language (BPL) AST JSON files to Visio-compatible Excel format.

## Installation

1. Ensure you have Python 3.6+ installed
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Usage

### Command Line

```bash
python ast_to_visio.py input_ast.json output.xlsx
```

### From JavaScript

The tool can also be called from JavaScript using Node.js child processes:

```javascript
const { execSync } = require('child_process');

// Call the Python script
function convertAstToVisio(inputJsonPath, outputXlsxPath) {
  try {
    execSync(`python ${__dirname}/tools/ast_to_visio.py "${inputJsonPath}" "${outputXlsxPath}"`);
    return true;
  } catch (error) {
    console.error('Error converting AST to Visio format:', error.message);
    return false;
  }
}
```

## Output Format

The Excel file generated contains three main sections:

1. **Swimlanes** - Represent the process lanes/participants
2. **Shapes** - The nodes in the process (tasks, events, gateways)
3. **Connections** - The edges connecting the shapes (sequence flows, message flows)

Each section includes the necessary attributes for importing into Visio or other business process modeling tools.

## Visio Import

To import the Excel file into Visio:

1. Open Visio and create a new BPMN diagram
2. Select "Data" > "Link Data to Shapes"
3. Select the generated Excel file
4. Map the columns to Visio shape properties
5. Complete the import wizard