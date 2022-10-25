const { contextBridge, ipcRenderer, shell, dialog } = require('electron');
const fs = require('fs');

const query = new URLSearchParams(window.location.search);

contextBridge.exposeInMainWorld(
    'dialog', {
        locateDirectoryDialog: (profile) => {
          return new Promise( (resolve, reject) => {
            ipcRenderer.invoke('locate-game-directory', profile).then( (response) => {
              resolve(response);
            });
          })
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
    stat: (...args) => {
      return fs.stat(...args);
    },
    statSync: (...args) => {
      return fs.statSync(...args);
    },
  }
);
