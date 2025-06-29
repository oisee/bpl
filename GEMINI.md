# Gemini Project Analysis

This document provides a summary of the BPMN-lite DSL Parser and Editor project, including its purpose, architecture, and key architectural decisions.

## Project Purpose

The core purpose of this project is to provide a streamlined and intuitive tool for creating, visualizing, and exporting business process diagrams. It achieves this through a custom Domain-Specific Language (DSL) called "BPMN-lite."

The key objectives are:

*   **Simplified Process Modeling:** To offer a simple, text-based alternative to complex graphical BPMN editors, making it accessible to both technical and non-technical users.
*   **Rapid Visualization:** To allow users to instantly visualize their text-based process descriptions as clear flowchart diagrams using the Mermaid.js library.
*   **Interoperability:** To bridge the gap between the lightweight DSL and professional business process modeling tools by enabling export to a Visio-compatible Excel format.
*   **Accessibility:** To provide the tool as both a web-based editor and a standalone, portable desktop application for various operating systems.

## Architecture

The application employs a hybrid architecture that combines a web-based frontend with a desktop application wrapper and a Python-based backend for specific features.

### Components

*   **Frontend/Editor:** A single-page application (SPA) built with HTML and JavaScript. This is the primary user interface for writing BPMN-lite code, viewing the generated Abstract Syntax Tree (AST), and rendering the Mermaid diagram.
*   **DSL Parser:** A core component written in JavaScript (`BpmnLiteParser` class) that interprets the BPMN-lite syntax and converts it into a structured AST (JSON format).
*   **Diagram Rendering:** The `Mermaid.js` library is integrated into the frontend to render the AST into a visual flowchart diagram.
*   **Desktop Application:** The web application is packaged using **Electron**. This provides a native desktop experience with features like an application menu, file dialogs (open/save), and offline access. The main entry point for the Electron app is `main.js`.
*   **Visio Export Module:** This is a key feature implemented through a hybrid approach:
    *   The Node.js/Electron application captures the AST.
    *   It invokes a Python script (`tools/ast_to_visio.py`).
    *   The Python script uses the `pandas` and `openpyxl` libraries to transform the AST into a specially formatted `.xlsx` file that is compatible with Microsoft Visio's Data Visualizer feature.
*   **Build System:** The project uses Node.js scripts (`build.js`) and `electron-builder` to compile, package, and distribute the application for Windows, macOS, and Linux.

## Architectural Decision Records (ADRs)

The following are the key architectural decisions that have shaped the project:

### ADR-001: Adoption of a Custom DSL (BPMN-lite)

*   **Decision:** To create a new, minimal, text-based DSL for defining business processes instead of using existing standards like BPMN 2.0 XML.
*   **Rationale:** A custom DSL provides a much lower barrier to entry for users. It allows for rapid, keyboard-driven modeling and is more intuitive for non-technical stakeholders than verbose XML or complex graphical editors.

### ADR-002: Selection of Mermaid.js for Diagram Rendering

*   **Decision:** To use Mermaid.js for rendering the visual representation of the BPMN-lite code.
*   **Rationale:** Mermaid.js is a lightweight, client-side library that generates diagrams from text-based descriptions. This aligns perfectly with the DSL-first approach of the project and simplifies the rendering process, as there is no need for a complex server-side rendering engine.

### ADR-003: Hybrid Implementation for Visio Export (Node.js + Python)

*   **Decision:** To use a Python script, called from the main Node.js application, to handle the conversion of the AST to a Visio-compatible Excel file.
*   **Rationale:** Python possesses mature and powerful libraries (`pandas`, `openpyxl`) that are ideal for creating the structured Excel files required by Visio's Data Visualizer. Replicating this functionality in Node.js would be more complex and less robust. This decision leverages the best tool for the specific task.

### ADR-004: Use of Electron for the Desktop Application

*   **Decision:** To package the web-based editor as a cross-platform desktop application using Electron.
*   **Rationale:** This approach allows for maximum code reuse between the web and desktop versions. It also provides essential desktop integration features, such as native file system access and application menus, which are critical for a user-friendly experience, especially for users who are not developers.
