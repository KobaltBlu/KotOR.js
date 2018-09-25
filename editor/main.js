const electron = require('electron');
// In main process.
const {ipcMain} = require('electron');
// Module to control application life.
const {app} = electron;
// Module to create native browser window.
const {BrowserWindow} = electron;

const {dialog} = electron;

const jBinary = require('jbinary');

let Global = {};
let tlkStrings = [];

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({width: 1200, height: 600, frame: false});
  //transparent: true, breaks win + arrow keys to move window around the screen
  win.webContents.MyGlobal = Global;
  // and load the index.html of the app.
  win.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  //win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

}

ipcMain.on('editor-gff', (event, arg) => {
  // Create the browser window.
  let editorGFF = new BrowserWindow({width: 800, height: 600, frame: false});

  // and load the index.html of the app.
  editorGFF.loadURL(`file://${__dirname}/windows/gff_editor.html`);
  editorGFF.webContents.MyGlobal = Global;
  editorGFF.myProps = {ToOpen: arg};

  // Open the DevTools.
  //win.webContents.openDevTools();

  // Emitted when the window is closed.
  editorGFF.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    editorGFF = null;
  });

  editorGFF.on('show', () => {
    editorGFF.send('open-file', arg);
  });

});

ipcMain.on('editor-nss', (event, arg) => {
  // Create the browser window.
  let editorNSS = new BrowserWindow({width: 800, height: 600, frame: false});
  editorNSS.webContents.Global = Global;
  editorNSS.Global = Global;
  // and load the index.html of the app.
  editorNSS.loadURL(`file://${__dirname}/windows/nss_editor.html`);

  editorNSS.myProps = {ToOpen: arg};

  // Open the DevTools.
  //win.webContents.openDevTools();

  // Emitted when the window is closed.
  editorNSS.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    editorNSS = null;
  });

});

ipcMain.on('open-file-dialog', (event, arg) => {
  let focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow.send('open-file', focusedWindow.ToOpen);
});

ipcMain.on('window-update-prop', (event, arg) => {
  let focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow.myProps = arg
});

ipcMain.on('window-get-prop', (event, arg) => {
  let focusedWindow = BrowserWindow.getFocusedWindow();
});

ipcMain.on('get-file', (event, arg) => {
  let focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow.send('open-file', focusedWindow.ToOpen);
});

ipcMain.on('maximize-toggle', (event, arg) => {
  let focusedWindow = BrowserWindow.getFocusedWindow();
  if(focusedWindow.isMaximized())
    focusedWindow.unmaximize();
  else
    focusedWindow.maximize();
});

ipcMain.on('close-toggle', (event, arg) => {
  let focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow.close();
});

ipcMain.on('minimize-toggle', (event, arg) => {
  let focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow.minimize();
});

ipcMain.on('devtools-toggle', (event, arg) => {
  let focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow.webContents.openDevTools();
});

ipcMain.on('GetGlobal', (event, arg) => {
  event.returnValue = Global;
});

ipcMain.on('SetGlobal', (event, arg) => {
  Global = arg;
  event.returnValue = Global;
});

ipcMain.on('SetTLKStrings', (event, arg) => {
  tlkStrings = arg;
});

ipcMain.on('TLKGetStringById', (event, arg) => {

  if(arg > tlkStrings.length-1){
    event.returnValue = tlkStrings[0];
    return;
  }

  event.returnValue = tlkStrings[(arg > 0 ? arg : 0)];
});

ipcMain.on('CloseMain', (event, arg) => {
  app.quit();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
