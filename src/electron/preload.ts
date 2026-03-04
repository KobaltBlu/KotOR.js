import * as fs from "fs";

import { contextBridge, ipcRenderer, shell } from "electron";

import { createScopedLogger, LogScope } from "@/utility/Logger";

/** Profile shape for launch (matches ElectronProfile from src/index.d.ts). */
interface LaunchProfile {
  key?: string;
  name?: string;
}

const log = createScopedLogger(LogScope.Default);

contextBridge.exposeInMainWorld(
  'dialog', {
  locateDirectoryDialog: (profile) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('locate-game-directory', profile).then((response) => {
        resolve(response);
      }).catch((e) => {
        reject(e);
      });
    })
  },
  showOpenDialog: (...args) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('open-file-dialog', args).then((response) => {
        resolve(response);
      }).catch((e) => {
        reject(e);
      })
    });
  },
  showSaveDialog: (...args) => {
    return new Promise((resolve, reject) => {
      log.debug('save-file-dialog', args);
      ipcRenderer.invoke('save-file-dialog', args).then((response) => {
        resolve(response);
      }).catch((e) => {
        reject(e);
      })
    });
  }
}
)

contextBridge.exposeInMainWorld(
  'fs', {
  open: (...args: Parameters<typeof fs.open>) => fs.open(...args),
  close: (...args: Parameters<typeof fs.close>) => fs.close(...args),
  read: (...args: Parameters<typeof fs.read>) => fs.read(...args),
  readFile: (...args: Parameters<typeof fs.readFile>) => fs.readFile(...args),
  writeFile: (...args: Parameters<typeof fs.writeFile>) => fs.writeFile(...args),
  createReadStream: (...args: Parameters<typeof fs.createReadStream>) => fs.createReadStream(...args),
  createWriteStream: (...args: Parameters<typeof fs.createWriteStream>) => fs.createWriteStream(...args),
  readdir: (...args: Parameters<typeof fs.readdir>) => fs.readdir(...args),
  mkdir: (...args: Parameters<typeof fs.mkdir>) => fs.mkdir(...args),
  mkdirSync: (...args: Parameters<typeof fs.mkdirSync>) => fs.mkdirSync(...args),
  rmdir: (...args: Parameters<typeof fs.rmdir>) => fs.rmdir(...args),
  rmdirSync: (...args: Parameters<typeof fs.rmdirSync>) => fs.rmdirSync(...args),
  stat: (...args: Parameters<typeof fs.stat>) => fs.stat(...args),
  statSync: (...args: Parameters<typeof fs.statSync>) => fs.statSync(...args),
  exists: (...args: Parameters<typeof fs.exists>) => fs.exists(...args),
  constants: fs.constants
}
);
contextBridge.exposeInMainWorld(
  'electron',
  {
    isMac: () => {
      return process.platform === 'darwin';
    },
    minimize: (profile) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke('win-minimize', profile).then((response) => {
          resolve(response);
        }).catch((e) => {
          reject(e);
        });
      })
    },
    maximize: (profile) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke('win-maximize', profile).then((response) => {
          resolve(response);
        }).catch((e) => {
          reject(e);
        });
      })
    },
    locate_game_directory: (profile) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke('locate-game-directory', profile).then((response) => {
          resolve(response);
        }).catch((e) => {
          reject(e);
        });
      })
    },
    launchProfile: (profile: LaunchProfile) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke('launch_profile', profile).then((response) => {
          resolve(response);
        }).catch((e) => {
          reject(e);
        });
      });
    },
    openExternal: (src: string, options?: Electron.OpenExternalOptions) => {
      return new Promise((resolve, reject) => {
        shell.openExternal(src, options).then((response) => {
          resolve(response);
        }).catch((e) => {
          reject(e);
        });
      });
    },
    showLoadingErrorAndExit: (message: string) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke('show-loading-error', message).then((response) => {
          resolve(response);
        }).catch((e) => {
          reject(e);
        });
      });
    },
  }
);
