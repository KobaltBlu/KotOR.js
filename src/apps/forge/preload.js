const { contextBridge } = require('electron');
const fs = require('fs');

const query = new URLSearchParams(window.location.search);

contextBridge.exposeInMainWorld(
  'dialog', {
    locateDirectoryDialog: () => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('locate-game-directory', profile).then( (response) => {
          resolve(response);
        });
      })
    },
    showSaveDialog: (args) => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('save-file-dialog', args).then( (response) => {
          resolve(response);
        });
      })
    },
    showOpenDialog: (args) => {
      return new Promise( (resolve, reject) => {
        ipcRenderer.invoke('open-file-dialog', args).then( (response) => {
          resolve(response);
        }); 
      })
    },
  }
)

contextBridge.exposeInMainWorld(
  'fs', {
    exists: (...args) => {
      return fs.exists(...args);
    },
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
      return fs.rmdir(...args);
    },
    rmdirSync: (...args) => {
      return fs.rmdirSync(...args);
    },
    stat: (...args) => {
      return fs.stat(...args);
    },
    statSync: (...args) => {
      return fs.statSync(...args);
    },
    exists: (...args) => {
      return fs.exists(...args);
    }
  }
);
