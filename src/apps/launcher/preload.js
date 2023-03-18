const { contextBridge, ipcRenderer, shell, dialog } = require('electron');
const remote = require('electron').remote;

contextBridge.exposeInMainWorld(
  'electron',
  {
    isMac: () => {
      process.platform === 'darwin'
    },
    minimize: () => {
      remote.BrowserWindow.getFocusedWindow()?.minimize();
    },
    maximize: () => {
      let win = remote.BrowserWindow.getFocusedWindow();
      console.log(win.isMaximized());
      if(win){
        if(win.isMaximized()){
          win.unmaximize();
        }else{
          win.maximize();
        } 
      }
    },
    launchProfile: (profile) => {
      ipcRenderer.send('launch_profile', profile);
    },
    openExternal: (src, options) => {
      shell.openExternal(src, options);
    },
    locate_game_directory: (profile) => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('locate-game-directory', profile).then( (response) => {
          resolve(response);
        });
      })
    }
  }
)