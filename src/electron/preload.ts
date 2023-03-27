import { contextBridge, ipcRenderer, shell } from "electron";
import * as fs from "fs";

const query = new URLSearchParams(window.location.search);

contextBridge.exposeInMainWorld(
  'dialog', {
    locateDirectoryDialog: (profile) => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('locate-game-directory', profile).then( (response) => {
          resolve(response);
        });
      })
    },
    showOpenDialog: (...args) => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('open-file-dialog', args).then( (response) => {
          resolve(response);
        }).catch( (e) => {
          reject(e);
        })
      });
    },
    showSaveDialog: (...args) => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('save-file-dialog', args).then( (response) => {
          resolve(response);
        }).catch( (e) => {
          reject(e);
        })
      });
    }
  }
)

contextBridge.exposeInMainWorld(
  'fs', {
    open: (...args) => {
      return (fs as any).open(...args);
    },
    close: (...args) => {
      return (fs as any).close(...args);
    },
    read: (...args) => {
      return (fs as any).read(...args);
    },
    readFile: (...args) => {
      return (fs as any).readFile(...args);
    },
    writeFile: (...args) => {
      return (fs as any).writeFile(...args);
    },
    createReadStream: (...args) => {
      return (fs as any).createReadStream(...args);
    },
    createWriteStream: (...args) => {
      return (fs as any).createWriteStream(...args);
    },
    readdir: (...args) => {
      return (fs as any).readdir(...args);
    },
    mkdir: (...args) => {
      return (fs as any).mkdir(...args);
    },
    mkdirSync: (...args) => {
      return (fs as any).mkdirSync(...args);
    },
    rmdir: (...args) => {
      return (fs as any).rmdir(...args);
    },
    rmdirSync: (...args) => {
      return (fs as any).rmdirSync(...args);
    },
    stat: (...args) => {
      return (fs as any).stat(...args);
    },
    statSync: (...args) => {
      return (fs as any).statSync(...args);
    },
    exists: (...args) => {
      return (fs as any).exists(...args);
    },
    constants: fs.constants
  }
);
contextBridge.exposeInMainWorld(
  'electron',
  {
    isMac: () => {
      process.platform === 'darwin'
    },
    minimize: (profile) => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('win-minimize', profile).then( (response) => {
          resolve(response);
        });
      })
    },
    maximize: (profile) => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('win-maximize', profile).then( (response) => {
          resolve(response);
        });
      })
    },
    locate_game_directory: (profile) => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('locate-game-directory', profile).then( (response) => {
          resolve(response);
        });
      })
    },
    launchProfile: (profile: any) => {
      ipcRenderer.send('launch_profile', profile);
    },
    openExternal: (src, options) => {
      shell.openExternal(src, options);
    },
  }
);
