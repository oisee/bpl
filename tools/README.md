# BPL AST to Visio Excel Converter

This tool converts Business Process Language (BPL) AST JSON files to Visio-compatible Excel format. The output follows industry-standard business process documentation formats with proper shape type mapping and connection labeling.

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

The Excel file follows a standardized business process documentation format with the following columns:

1. **Process Step ID** - Unique identifier for each step (automatically generated)
2. **Process Step Description** - "Step ID : Step Name" format for clear identification
3. **Next Step ID** - Comma-separated list of all connected target step IDs
4. **Connector Label** - Labels for each connection (only used for meaningful labels like "Yes"/"No" decisions)
5. **Shape Type** - Maps BPL node types to corresponding Visio shapes:
   - `task` → "Process"
   - `gateway` → "Decision"
   - `event` (start) → "Start"
   - `event` (end) → "End"
   - `comment` → "Document"
   - `dataObject` → "Data"
   - `send/receive` → "External reference"
   - `branch` → "Custom 1"
6. **Function** - Corresponds to the Lane/Pool from the BPL diagram
7. **Additional fields** - Phase, Owner, Cost, etc. (empty for manual entry)

This format is specifically designed for seamless importing into Visio and other business process modeling tools. The Excel file also includes a defined named range "Visio_01" that covers all data, making it instantly recognizable during the Visio import process.

## Visio Import

To import the Excel file into Visio:

1. Open Visio and create a new BPMN diagram
2. Select "Data" > "Link Data to Shapes"
3. Select the generated Excel file
4. When prompted for the data source, choose the "Visio_01" named range
   - This range is automatically detected thanks to the named range feature
5. Map the columns to Visio shape properties:
   - Process Step ID → ID/Shape text
   - Process Step Description → Description
   - Function → Category/Swim lane
   - Shape Type → Type of shape
   - Connector Label → Connection label
6. Complete the import wizard