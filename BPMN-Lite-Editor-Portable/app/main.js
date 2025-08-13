const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'resources/icon.png')
  });

  // Load the index.html file from the dist directory
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-file');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            dialog.showOpenDialog({
              properties: ['openFile'],
              filters: [
                { name: 'BPMN-Lite Files', extensions: ['bpl'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            }).then(result => {
              if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                fs.readFile(filePath, 'utf8', (err, fileContent) => {
                  if (err) {
                    console.error('Error opening file:', err);
                    return;
                  }
                  mainWindow.webContents.send('file-opened', fileContent);
                });
              }
            }).catch(err => {
              console.error('Error opening file:', err);
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Export to Excel',
          click: () => {
            // Logic for exporting to Excel using the Python script
            dialog.showSaveDialog({
              title: 'Export to Excel',
              defaultPath: 'process.xlsx',
              filters: [
                { name: 'Excel Files', extensions: ['xlsx'] }
              ]
            }).then(result => {
              if (!result.canceled && result.filePath) {
                // Get the current AST from the renderer
                mainWindow.webContents.send('request-ast-for-export', result.filePath);
              }
            }).catch(err => {
              console.error('Error exporting to Excel:', err);
            });
          }
        },
        { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About BPMN-Lite Editor',
          click: () => {
            dialog.showMessageBox({
              title: 'About BPMN-Lite Editor',
              message: 'BPMN-Lite Editor v' + app.getVersion(),
              detail: 'A minimal, intuitive domain-specific language for describing business process diagrams.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Handle IPC messages from renderer process
ipcMain.on('export-to-excel', (event, data) => {
  const tempJsonPath = path.join(app.getPath('temp'), 'temp-ast.json');

  fs.writeFile(tempJsonPath, JSON.stringify(data.ast, null, 2), err => {
    if (err) {
      return dialog.showErrorBox('Export Failed', `Failed to write temporary file: ${err.message}`);
    }

    let pythonCmd;
    try {
      execSync('python3 --version');
      pythonCmd = 'python3';
    } catch (e) {
      try {
        execSync('python --version');
        pythonCmd = 'python';
      } catch (e2) {
        return dialog.showErrorBox(
          'Export Failed',
          'Python is not installed or not in your PATH. Please install Python 3 to use the Excel export feature.'
        );
      }
    }

    try {
      // Execute the Python script
      const scriptPath = path.join(__dirname, 'dist', 'tools', 'ast_to_visio.py');
      execSync(`"${pythonCmd}" "${scriptPath}" "${tempJsonPath}" "${data.outputPath}"`);

      dialog.showMessageBox({
        type: 'info',
        title: 'Export Successful',
        message: 'The process has been exported to Excel successfully.',
        buttons: ['OK']
      });
    } catch (error) {
      dialog.showErrorBox(
        'Export Failed',
        `An error occurred while running the export script: ${error.message}`
      );
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});