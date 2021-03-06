const electron = require('electron');
// In main process.
const {ipcMain} = require('electron');
// Module to control application life.
const {app} = electron;
// Module to create native browser window.
const {BrowserWindow, Tray, Menu, globalShortcut} = electron;
const {dialog} = electron;

const path = require('path');
//exec & execFile are used for launching the original games from the launcher
const { execFile } = require('child_process');
const { exec } = require('child_process');
const http = require('https');
const fs = require('fs');

const ConfigManager = require(path.join(app.getAppPath(), 'js/ConfigManager.js'));
const Config = new ConfigManager('settings.json');

console.log(process.argv);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let profileWindows = [];
let winLauncher = null;
let tray = null;

ipcMain.on('config-changed', (event, data) => {
  for(let i = 0, len = profileWindows.length; i < len; i++){
    profileWindows[i].webContents.send('config-changed', data);
  }
  if(winLauncher instanceof BrowserWindow){
    winLauncher.webContents.send('config-changed', data);
  }
});

function createWindowFromProfile( profile = {} ) {
  // Create the browser window.
  let _window = new BrowserWindow({
    width: profile.width ? profile.width : 1200, 
    height: profile.height ? profile.height : 600,
    fullscreen: profile.settings?.fullscreen.value != undefined ? profile.settings?.fullscreen.value : profile.settings?.fullscreen.defaultValue,
    frame: !profile.launch.frameless,
    title: profile.name,
    backgroundColor: profile.launch.backgroundColor,
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      enableRemoteModule: true,
      worldSafeExecuteJavaScript: false,
      //contextIsolation: false,
    }
  });

  _window.state = profile;

  // and load the index.html of the app.
  _window.loadURL(`file://${__dirname}/apps/${profile.launch.path}`);
  _window.setMenuBarVisibility(false);

  // Emitted when the window is closed.
  _window.on('closed', (event) => {
    event.preventDefault();
    createLauncherWindow();
    let index = profileWindows.indexOf(_window);
    if(index >= 0){
      profileWindows.splice(index, 1);
    }
  });

  winLauncher.hide();
  profileWindows.push(_window);

}

function createLauncherWindow() {

  if(winLauncher instanceof BrowserWindow){
    winLauncher.show();
    winLauncher.focus();
    return;
  }
  console.log(Config.get(['Launcher', 'width']), Config.get(['Launcher', 'height']))
  // Create the browser window.
  winLauncher = new BrowserWindow({
    width: Config.get(['Launcher', 'width']), 
    height: Config.get(['Launcher', 'height']), 
    minHeight: 600,
    minWidth: 1000,
    frame: false,
    title: 'KotOR Launcher',
    backgroundColor: "#000000",
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      enableRemoteModule: true,
      worldSafeExecuteJavaScript: true,
      //contextIsolation: true,
    }
  });
  // and load the index.html of the app.
  winLauncher.loadURL(`file://${__dirname}/launcher/launcher.html`);
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
  
  winLauncher.on('show', () => {
    //tray.setHighlightMode('always');
  });

  winLauncher.on('hide', () => {
    //tray.setHighlightMode('never');
  });

}

ipcMain.on('launch_profile', (event, profile) => {
  createWindowFromProfile(profile);
});

ipcMain.on('launch_executable', (event, exe_path) => {
  winLauncher.hide();
  let cwd = path.parse(exe_path);
  if(process.platform == 'linux'){
    //Attempt to find wine so we can run the exe
    exec(`which wine`, (error) => {
      if(error){
        dialog.showMessageBoxSync({
          type: 'error',
          title: 'Error',
          message: 'Wine not found!',
          buttons: ['Ok']
        });
        createLauncherWindow();
      }else{
        //Attempt to launch with wine
        exec(`cd ${cwd.dir} && wine ./${cwd.base}`, (error, stdout, stderr) => {
          createLauncherWindow();
        });
      }
    });
  }else{
    console.log('Launching', exe_path, 'in', cwd.dir);
    execFile(exe_path, [], {cwd:cwd.dir}, (error, stdout, stderr) => {
      console.log(error, stdout, stderr);
      createLauncherWindow();
    });
  }
});
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.on('ready', async () => {
  // console.log(__dirname);
  if(!fs.existsSync(path.join(__dirname, 'icon.png'))){
    fs.copyFileSync(path.join(app.getAppPath(), 'icon.png'), path.join(__dirname, 'icon.png'));
  }

  await updateThreeJS();

  try{
    tray = new Tray('icon.png');
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
      if(winLauncher instanceof BrowserWindow){
        winLauncher.isVisible() ? winLauncher.hide() : winLauncher.show();
      }else{
        createLauncherWindow();
      }
    });
  }catch(e){
    createLauncherWindow();
  }

  globalShortcut.register('Alt+`', () => {
    createLauncherWindow();
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


function updateThreeJS(){
  return new Promise( (resolve, reject, ) => {

    let file_path = path.join(app.getAppPath(), 'js', 'engine', 'three.js');
    if(!fs.existsSync(file_path)){
      console.log('Downloading: THREE.js...');
      const file = fs.createWriteStream(file_path);
      const request = http.get("https://raw.githubusercontent.com/KobaltBlu/kotor.three.js/master/build/three.js", function(response) {
        response.pipe(file);
        console.log('Download: Complete');
        resolve();
      });
    }else{
      resolve();
    }

  });
}