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
const ProgressBar = require('electron-progressbar');
const pathToFfmpeg = require('ffmpeg-static');
const shell = require('any-shell-escape');

const ConfigManager = require(path.join(app.getAppPath(), 'launcher/ConfigManager.js'));
const Config = new ConfigManager('settings.json');

const videoSupport = require('./ffmpeg-helper');
const VideoServer = require('./VideoServer');
let movieServer = null;

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

ipcMain.on('movie', (event, data) => {
  console.log(data);
  switch(data.action){
    case 'play':
      onVideoFileSeleted(data.file, event.sender);
    break;
    case 'stop':

    break;
  }
});

ipcMain.on('movie-kill-stream', (event, data) => {
  if (movieServer) {
    movieServer.killFfmpegCommand();
  }
});

ipcMain.handle('locate-game-directory', (event, data) => {
  return new Promise( (resolve, reject) => {
    dialog.showOpenDialog({title: 'KotOR Game Install Folder', properties: ['openDirectory', 'createDirectory']}).then(result => {
      if(result.filePaths.length && !result.canceled){
        resolve(result.filePaths[0]);
      }
    }).catch(err => {
      reject(err)
    });
  });
})

ipcMain.handle('open-file-dialog', (event, data) => {
  return new Promise( (resolve, reject) => {
    dialog.showOpenDialog(...data).then(result => {
      resolve(result);
    }).catch(err => {
      reject(err)
    });
  });
})

function onVideoFileSeleted(videoFilePath, sender) {
  videoSupport(videoFilePath).then((checkResult) => {
    if (checkResult.videoCodecSupport && checkResult.audioCodecSupport) {
      if (movieServer) {
        movieServer.killFfmpegCommand();
      }
      let playParams = {};
      playParams.movie = path.parse(videoFilePath).name;
      playParams.type = "native";
      playParams.videoSource = videoFilePath;
      sender.send('movie-ready', playParams);
    }
    if (!checkResult.videoCodecSupport || !checkResult.audioCodecSupport) {
      if (!movieServer) {
        movieServer = new VideoServer();
      }
      movieServer.videoSourceInfo = { videoSourcePath: videoFilePath, checkResult: checkResult };
      movieServer.createServer();
      console.log("createVideoServer success");
      let playParams = {};
      playParams.movie = path.parse(videoFilePath).name;
      playParams.type = "stream";
      playParams.videoSource = "http://127.0.0.1:8888?startTime=0";
      playParams.duration = checkResult.duration
      sender.send('movie-ready', playParams);
    }
  }).catch((err) => {
    console.log("video format error", err);
    let playParams = {};
    playParams.movie = path.parse(videoFilePath).name;
    sender.send('movie-fail', playParams);
  })
}

async function createWindowFromProfile( profile = {} ) {

  // if(profile.category == 'game')
  //   await convertBIKtoMP4(path.join(profile.directory, 'movies'));

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
      preload: path.join(__dirname, 'dist/game/preload.js'),
      webviewTag: false,
      nodeIntegration: true,
      enableRemoteModule: true,
      //worldSafeExecuteJavaScript: true,
      contextIsolation: true,
    }
  });

  _window.state = profile;

  // and load the index.html of the app.
  _window.loadURL(`file://${__dirname}/dist/${profile.launch.path}?key=${profile.key}`);
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
      preload: path.join(__dirname, 'dist/launcher/preload.js'),
      webviewTag: false,
      nodeIntegration: true,
      enableRemoteModule: true,
      //worldSafeExecuteJavaScript: true,
      contextIsolation: true,
    }
  });
  // and load the index.html of the app.
  winLauncher.loadURL(`file://${__dirname}/dist/launcher/index.html`);
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

function convertBIKtoMP4( sourceFolder = '' ){
  return new Promise( async (resolve, reject) => {
    try{
      const contents = await fs.promises.readdir(sourceFolder);

      const bik = new Map();
      const mp4 = new Map();

      const toConvert = [];

      for(let i = 0, len = contents.length; i < len; i++){
        let file = path.parse(contents[i]);
        if(file.ext == '.bik'){
          bik.set(file.name, file);
        }else if(file.ext == '.mp4'){
          mp4.set(file.name, file);
        }
      }

      for (let [name, file] of bik) {
        if(!mp4.has(name)){
          toConvert.push(file);
        }
      }

      let totalToConvert = toConvert.length;
      if(totalToConvert){

        let options = {
          //Can be "none", "info", "error", "question" or "warning".
          type: "question",
  
          //Array of texts for buttons.
          buttons: ["&High Quality - Slow","&Low Quality - Faster","&Skip"],
  
          //Index of the button in the buttons array which will be selected by default when the message box opens.
          defaultId: 2,
  
          //Title of the message box
          title: "Convert Movies?",
  
          //Content of the message box
          message: "Do you want to convert movies to enable playback support?",
  
          //More information of the message
          detail: "Press Skip button to continue without video playback support",
  
          //Shows a checkbox
          //checkboxLabel: "Checkbox only works with callback",
  
          //Initial checked state
          //checkboxChecked: true,
  
          //icon: "/path/image.png",
  
          //The index of the button to be used to cancel the dialog, via the Esc key
          cancelId: 2,
  
          //Prevent Electron on Windows to figure out which one of the buttons are common buttons (like "Cancel" or "Yes")
          noLink: true,
  
          //Normalize the keyboard access keys
          normalizeAccessKeys: true,
        };
        let res = await dialog.showMessageBox(winLauncher, options);

        if(res.response != 2){
          const progressBar = new ProgressBar({
            text: 'Converting movies...',
            detail: 'Please Wait...',
            indeterminate: false,
            initialValue: 0,
            maxValue: totalToConvert
          });
          
          progressBar
            .on('completed', function() {
              console.info(`completed...`);
              progressBar.detail = 'Convert completed. Launching...';
              resolve();
            })
            .on('aborted', function() {
              console.info(`aborted...`);
              resolve();
            })
            .on('progress', function(value) {
              currentFile = toConvert[value];
              progressBar.detail = `Converting: ${currentFile.name}.bik to ${currentFile.name}.mp4 | ${value}/${progressBar.getOptions().maxValue-1}...`;
            });
          
          for(let i = 0, len = toConvert.length; i < len; i++){
            progressBar.value = i;
            const file = toConvert[i];
            
            if(res.response == 0){
              await convertFile(
                shell([
                  pathToFfmpeg, '-y', '-v', 'error',
                  '-i', path.join(sourceFolder, file.name+'.bik'),
                  '-c:v', 'libx264',
                  '-preset', 'slow',
                  '-crf', '20',
                  '-c:a', 'aac',
                  '-format', 'mp4',
                  '-vf', 'format=yuv420p',
                  '-movflags', '+faststart',
                  path.join(sourceFolder, file.name+'.mp4')
                ])
              );
            }else{
              await convertFile(
                shell([
                  pathToFfmpeg, '-y', '-v', 'error',
                  '-i', path.join(sourceFolder, file.name+'.bik'),
                  '-c:v', 'libx264',
                  '-preset', 'fast',
                  //'-crf', '20',
                  '-c:a', 'aac',
                  '-format', 'mp4',
                  '-vf', 'format=yuv420p',
                  '-movflags', '+faststart',
                  path.join(sourceFolder, file.name+'.mp4')
                ])
              );
            }
          }

          progressBar.setCompleted();
        }else{
          resolve();
        }
      }else{
        resolve();
      }

    }catch(e){

    }
  });
}


function updateThreeJS(){
  // return new Promise( (resolve, reject, ) => {

  //   let file_path = path.join(app.getAppPath(), 'js', 'three', 'three.js');
  //   if(!fs.existsSync(file_path)){
  //     console.log('Downloading: THREE.js...');
  //     const file = fs.createWriteStream(file_path);
  //     const request = http.get("https://raw.githubusercontent.com/KobaltBlu/kotor.three.js/master/build/three.js", function(response) {
  //       response.pipe(file);
  //       console.log('Download: Complete');
  //       resolve();
  //     });
  //   }else{
  //     resolve();
  //   }

  // });
}

function convertFile(command){
  return new Promise( (resolve, reject) => {
    exec(command, (err) => {
      if (err) {
        console.error(err)
        resolve();
      } else {
        resolve();
      }
    })
  });
}