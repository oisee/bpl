# Backlog

This file tracks potential issues, bugs, and improvements for the BPMN-lite DSL Parser and Editor.

## High Priority

*   **[SOLVED] [BUG] Synchronous file operations on the main thread:** The use of `fs.readFileSync` and `fs.writeFileSync` in `main.js` can block the UI, making the application unresponsive when handling large files. These should be replaced with their asynchronous counterparts (`fs.readFile` and `fs.writeFile`).

## Medium Priority

*   **[SOLVED] [IMPROVEMENT] Hardcoded "python" command in `main.js`:** The command to execute the Visio export script is hardcoded as `python`. This should be made more robust to handle systems where the Python 3 executable is `python3`, similar to the logic in `build.js`.

## Low Priority

*   **[SOLVED] [IMPROVEMENT] More specific error handling for Visio export:** The `try...catch` block for the Visio export in `main.js` could provide more specific error messages to the user based on the type of error that occurs (e.g., Python not found, script execution error).
