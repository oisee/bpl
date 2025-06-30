# Change Log

All notable changes to the "bpmn-lite" extension will be documented in this file.

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