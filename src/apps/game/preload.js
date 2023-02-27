const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
// remote.app.allowRendererProcessReuse = false; 
// const dxt = require('dxt');

const query = new URLSearchParams(window.location.search);

// contextBridge.exposeInMainWorld(
//   'dxt', {
//     kDxt1: dxt.kDxt1,
//     kDxt5: dxt.kDxt5,
//     decompress: (buffer, frameWidth, frameHeight, encoding) => {
//       return dxt.decompress(Buffer.from(buffer), frameWidth, frameHeight, encoding);
//     },
//     compress: (buffer, frameWidth, frameHeight, encoding) => {
//       return dxt.compress(Buffer.from(buffer), frameWidth, frameHeight, encoding); 
//     }
//   }
// );

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
      return fs.open(...args);
    },
    close: (...args) => {
      return fs.close(...args);
    },
    read: (...args) => {
      return fs.read(...args);
    },
    readFile: (...args) => {
      return fs.readFile(...args);
    },
    writeFile: (...args) => {
      return fs.writeFile(...args);
    },
    createReadStream: (...args) => {
      return fs.createReadStream(...args);
    },
    createWriteStream: (...args) => {
      return fs.createWriteStream(...args);
    },
    readdir: (...args) => {
      return fs.readdir(...args);
    },
    mkdir: (...args) => {
      return fs.mkdir(...args);
    },
    mkdirSync: (...args) => {
      return fs.mkdirSync(...args);
    },
    rmdir: (...args) => {
      return fs.mkdir(...args);
    },
    rmdirSync: (...args) => {
      return fs.mkdirSync(...args);
    },
    stat: (...args) => {
      return fs.stat(...args);
    },
    statSync: (...args) => {
      return fs.statSync(...args);
    },
    exists: (...args) => {
      return fs.exists(...args);
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
    minimize: () => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('win-minimize', profile).then( (response) => {
          resolve(response);
        });
      })
    },
    maximize: () => {
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
    }
  }
);
