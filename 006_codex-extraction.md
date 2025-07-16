 # Codex Extraction

 ## Project Purpose

 The BPMN-lite DSL Parser and Editor is a toolchain that enables the definition, parsing, visualization, and export of business process diagrams using a concise, human-readable domain-specific language (DSL). It provides:

- A minimal, intuitive DSL for describing BPMN-like constructs, including processes, lanes, tasks, gateways, message flows, data objects, events, and annotations.
- A parser that converts DSL input into a structured Abstract Syntax Tree (AST).
- Live rendering of diagrams via Mermaid.js in a web-based editor for instant feedback and interactive editing.
- Export capabilities to multiple formats:
  - .bpl files (source code)
  - .json files (AST)
  - .mmd files (Mermaid diagrams)
  - .xlsx files (Visio-compatible spreadsheets), powered by Python tools for seamless integration with Microsoft Visio.