import * as fs from 'fs';

import { contextBridge, ipcRenderer, shell } from 'electron';

const query = new URLSearchParams(window.location.search);

contextBridge.exposeInMainWorld('dialog', {
  locateDirectoryDialog: (profile: string | undefined) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('locate-game-directory', profile).then((response: unknown) => {
        resolve(response);
      });
    });
  },
  showOpenDialog: (...args: unknown[]) => {
    return new Promise((resolve, reject) => {
      ipcRenderer
        .invoke('open-file-dialog', args)
        .then((response: unknown) => {
          resolve(response);
        })
        .catch((e: unknown) => {
          reject(e);
        });
    });
  },
  showSaveDialog: (...args: unknown[]) => {
    return new Promise((resolve, reject) => {
      console.log('save-file-dialog', args);
      ipcRenderer
        .invoke('save-file-dialog', args)
        .then((response: unknown) => {
          resolve(response);
        })
        .catch((e: unknown) => {
          reject(e);
        });
    });
  },
});

contextBridge.exposeInMainWorld('fs', {
  open: (...args: unknown[]) => (fs as typeof fs & { open: (...a: unknown[]) => unknown }).open(...args),
  close: (...args: unknown[]) => (fs as typeof fs & { close: (...a: unknown[]) => unknown }).close(...args),
  read: (...args: unknown[]) => (fs as typeof fs & { read: (...a: unknown[]) => unknown }).read(...args),
  readFile: (...args: unknown[]) => (fs as typeof fs & { readFile: (...a: unknown[]) => unknown }).readFile(...args),
  writeFile: (...args: unknown[]) => (fs as typeof fs & { writeFile: (...a: unknown[]) => unknown }).writeFile(...args),
  createReadStream: (...args: unknown[]) =>
    (fs as typeof fs & { createReadStream: (...a: unknown[]) => unknown }).createReadStream(...args),
  createWriteStream: (...args: unknown[]) =>
    (fs as typeof fs & { createWriteStream: (...a: unknown[]) => unknown }).createWriteStream(...args),
  readdir: (...args: unknown[]) => (fs as typeof fs & { readdir: (...a: unknown[]) => unknown }).readdir(...args),
  mkdir: (...args: unknown[]) => (fs as typeof fs & { mkdir: (...a: unknown[]) => unknown }).mkdir(...args),
  mkdirSync: (...args: unknown[]) => (fs as typeof fs & { mkdirSync: (...a: unknown[]) => unknown }).mkdirSync(...args),
  rmdir: (...args: unknown[]) => (fs as typeof fs & { rmdir: (...a: unknown[]) => unknown }).rmdir(...args),
  rmdirSync: (...args: unknown[]) => (fs as typeof fs & { rmdirSync: (...a: unknown[]) => unknown }).rmdirSync(...args),
  unlink: (...args: unknown[]) => (fs as typeof fs & { unlink: (...a: unknown[]) => unknown }).unlink(...args),
  stat: (...args: unknown[]) => (fs as typeof fs & { stat: (...a: unknown[]) => unknown }).stat(...args),
  statSync: (...args: unknown[]) => (fs as typeof fs & { statSync: (...a: unknown[]) => unknown }).statSync(...args),
  exists: (...args: unknown[]) => (fs as typeof fs & { exists: (...a: unknown[]) => unknown }).exists(...args),
  constants: fs.constants,
});
contextBridge.exposeInMainWorld('electron', {
  isMac: () => {
    process.platform === 'darwin';
  },
  minimize: (profile: string | undefined) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('win-minimize', profile).then((response: unknown) => {
        resolve(response);
      });
    });
  },
  maximize: (profile: string | undefined) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('win-maximize', profile).then((response: unknown) => {
        resolve(response);
      });
    });
  },
  locate_game_directory: (profile: string | undefined) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('locate-game-directory', profile).then((response: unknown) => {
        resolve(response);
      });
    });
  },
  launchProfile: (profile: unknown) => {
    ipcRenderer.send('launch_profile', profile);
  },
  openExternal: (src: string, options?: Electron.OpenExternalOptions) => {
    shell.openExternal(src, options);
  },
});
