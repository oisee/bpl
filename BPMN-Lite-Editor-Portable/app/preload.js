const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // File operations
    handleFileOpen: (callback) => {
      ipcRenderer.on('file-opened', (event, content) => callback(content));
    },
    handleNewFile: (callback) => {
      ipcRenderer.on('new-file', () => callback());
    },
    // Export to Excel
    handleAstRequest: (callback) => {
      ipcRenderer.on('request-ast-for-export', (event, outputPath) => callback(outputPath));
    },
    exportToExcel: (ast, outputPath) => {
      ipcRenderer.send('export-to-excel', { ast, outputPath });
    }
  }
);