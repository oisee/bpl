# Change Log

All notable changes to the "bpmn-lite" extension will be documented in this file.

## [0.3.3] - 2025-07-09

### Added
- **End Event Normalization**: All End events (`!End`, `+!End`, `-!End`) now map to a single end event per lane
- **Gateway-to-End Connections**: Direct connections from gateways to End events with proper labels
- **Auto-injected Connection Breaks**: Automatic insertion of `---` after End events to prevent cross-lane connections
- **Improved Flow Termination**: End events properly terminate their flow paths

### Fixed
- `-!End` branches now connect directly to the lane's End event instead of creating separate branch tasks
- Gateway-to-End connections display proper labels (Yes/No) in Mermaid diagrams
- No more unintended connections from End events to subsequent lanes

## [0.3.2] - 2025-07-09

### Fixed
- Complete fix for Mermaid node ID generation with spaces
- All lane names are now properly normalized when creating node IDs
- Fixed node ID generation in events, gateways, branches, and comments
- Regenerated all example .mmd files with correct syntax

### Added
- Repository field in package.json for better VSCode marketplace integration

## [0.3.1] - 2025-07-09

### Fixed
- Fixed Mermaid syntax errors when lane names contain spaces
- Preserved original lane names in subgraph display labels
- Examples with multi-word lane names (e.g., "Payment Gateway") now render correctly

## [0.3.0] - 2025-07-09

### Added
- Export functionality in preview panel
  - Export as PNG (with DPI settings)
  - Export as SVG (scalable vector graphics)
  - Export as Mermaid (.mmd)
  - Export as XLSX (for Microsoft Visio import)
  - Export as BPMN 2.0 XML (Camunda compatible)
- New export buttons in preview toolbar
- Automatic BPMN 2.0 XML generation from AST

### Changed
- Updated preview UI with export section
- Enhanced message handling for export operations

## [0.2.0] - 2025-07-09

### Added
- Connection break feature using "---" separator
  - Place "---" on its own line to prevent automatic connections between tasks
  - Works for all connection types: sequence flows, message flows, and cross-lane connections
  - Multiple consecutive "---" lines are treated as a single break
  - Useful for creating disconnected process segments or controlling flow layout

### Example
```bpl
@Lane1
  task1
  task2
  ---
  task3  // task2 will NOT connect to task3
```

## [0.1.2] - 2025-06-30

### Fixed
- Preview panel now correctly handles VS Code preview mode files (italicized tabs)
- Improved file detection to check visible editors when no active editor exists

### Added
- Navigation controls in preview panel:
  - Pan controls (arrows) for moving the diagram
  - Zoom controls (+/- buttons) with percentage display
  - Reset zoom button to return to 100%
  - Fit to window button for optimal viewing
- Mouse interactions:
  - Click and drag to pan the diagram
  - Ctrl/Cmd + scroll wheel to zoom
- Smooth transitions for all navigation actions
- Auto-fit diagram on initial load

## [0.1.1] - 2024-01-30

### Fixed
- Preview panel now always opens to the side (split-screen) by default to avoid blocking text editing
- Added configuration option `bpmn-lite.preview.openToSide` to control preview placement
- Preview only updates for the active document to improve performance
- Added immediate preview update on file save

### Added
- New configuration: `bpmn-lite.preview.autoOpen` to control automatic preview opening
- Preview panel icons for light and dark themes
- Better handling of preview panel positioning

## [0.1.0] - 2024-01-29

### Initial Release
- Live preview of BPMN-Lite diagrams
- Syntax highlighting for .bpl files
- Export to Mermaid and JSON formats
- Real-time error detection
- Configurable preview themes