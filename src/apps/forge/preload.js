const { contextBridge, ipcRenderer, shell, dialog } = require('electron');
const fs = require('fs');

const query = new URLSearchParams(window.location.search);

contextBridge.exposeInMainWorld(
    'dialog', {
        locateDirectoryDialog: () => {
            return new Promise( (resolve, reject) => {
                dialog.showOpenDialog({title: 'Locate Game Directory', properties: ['openDirectory', 'createDirectory']}).then(result => {
                    console.log(result.canceled);
                    console.log(result.filePaths);
                    if(result.filePaths.length && !result.canceled){
                        resolve(result.filePaths[0]);
                    }else{
                        reject();
                    }
        
                }).catch(err => {
                    reject(err);
                });
            });
        }
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
    stat: (...args) => {
      return fs.stat(...args);
    },
    statSync: (...args) => {
      return fs.statSync(...args);
    },
  }
);
