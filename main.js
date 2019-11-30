const electron = require('electron');
// In main process.
const {ipcMain} = require('electron');
// Module to control application life.
const {app} = electron;
// Module to create native browser window.
const {BrowserWindow, Tray, Menu} = electron;

const {dialog} = electron;

let Global = {};
let tlkStrings = [];

console.log(process.argv);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let winGame = null;
let winEditor = null;
let winLauncher = null;
let tray = null;

function createWindowFromProfile( profile = {} ) {
  // Create the browser window.
  winGame = new BrowserWindow({
    width: 1200, 
    height: 600,
    fullscreen: profile.launch.fullscreen,
    frame: !profile.launch.frameless,
    title: profile.name,
    backgroundColor: profile.launch.backgroundColor,
    webPreferences: {
      nodeIntegration: true
    }
  });

  winGame.state = profile;

  winGame.webContents.MyGlobal = Global;
  // and load the index.html of the app.
  winGame.loadURL(`file://${__dirname}/${profile.launch.path}`);
  /*winGame.openDevTools();
  winGame.on('ready', () => {
    winGame.webcontents.openDevTools();
  });*/

  winGame.setMenuBarVisibility(false);

  winGame.on( 'devtools-closed', function ( event ) {
    winGame.setMenuBarVisibility(false);
  });
  winGame.on( 'devtools-opened', function ( event ) {
    winGame.setMenuBarVisibility(true);
  });

  // Emitted when the window is closed.
  winGame.on('closed', (event) => {
    event.preventDefault();
    createLauncherWindow();
    winGame = null;
  });

  winLauncher.hide();

}

function createLauncherWindow() {

  if(winLauncher instanceof BrowserWindow){
    winLauncher.show();
    winLauncher.focus();
    return;
  }

  // Create the browser window.
  winLauncher = new BrowserWindow({
    width: 1200, 
    height: 600, 
    minHeight: 600,
    minWidth: 1000,
    frame: false,
    title: 'KotOR Launcher',
    backgroundColor: "#000000",
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true
    }
  });
  winLauncher.webContents.MyGlobal = Global;
  // and load the index.html of the app.
  winLauncher.loadURL(`file://${__dirname}/launcher.html`);
  //winLauncher.openDevTools();
  //winLauncher.on('ready', () => {
    //winLauncher.webcontents.openDevTools();
  //})

  // Emitted when the window is closed.
  winLauncher.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    winLauncher = null;
  });

  winLauncher.on('minimize',(event) => {
    event.preventDefault();
    winLauncher.hide();
  });

  winLauncher.on('close', (event) => {
    /*if(!app.isQuiting){
      event.preventDefault();
      winLauncher.hide();
    }

    return false;*/
  });

}

ipcMain.on('launch_profile', (event, profile) => {
  createWindowFromProfile(profile);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.on('ready', () => {

  tray = new Tray('./icon.png');
  const contextMenu = Menu.buildFromTemplate([{
    label: 'Exit', 
    type: 'normal', 
    click: (menuItem, browserWindow, event) => {
      app.quit();
    }
  }]);
  tray.setToolTip('KotOR Launcher');
  tray.setContextMenu(contextMenu);

  createLauncherWindow();

  tray.on('click', () => {

    winLauncher.isVisible() ? winLauncher.hide() : winLauncher.show()
  });
  winLauncher.on('show', () => {
    tray.setHighlightMode('always');
  });
  winLauncher.on('hide', () => {
    tray.setHighlightMode('never');
  });

});

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
  if (win === null)
  createLauncherWindow();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.