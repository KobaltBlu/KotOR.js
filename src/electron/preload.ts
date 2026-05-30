import { contextBridge, ipcRenderer, shell } from "electron";
import * as fs from "fs";

const query = new URLSearchParams(window.location.search);

contextBridge.exposeInMainWorld(
  'dialog', 
  {
    locateDirectoryDialog: (profile: any) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke('locate-game-directory', profile).then((response) => {
          resolve(response);
        });
      })
    },
    showOpenDialog: (...args: any[]) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke('open-file-dialog', args).then((response) => {
          resolve(response);
        }).catch((e) => {
          reject(e);
        })
      });
    },
    showSaveDialog: (...args: any[]) => {
      return new Promise((resolve, reject) => {
        console.log('save-file-dialog', args);
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
  'fs', 
  {
    open: (...args: any[]) => {
      return (fs as any).open(...args);
    },
    close: (...args: any[]) => {
      return (fs as any).close(...args);
    },
    read: (...args: any[]) => {
      return (fs as any).read(...args);
    },
    readFile: (...args: any[]) => {
      return (fs as any).readFile(...args);
    },
    writeFile: (...args: any[]) => {
      return (fs as any).writeFile(...args);
    },
    createReadStream: (...args: any[]) => {
      return (fs as any).createReadStream(...args);
    },
    createWriteStream: (...args: any[]) => {
      return (fs as any).createWriteStream(...args);
    },
    readdir: (path: string, options: any, callback?: Function) => {
      const cb = typeof options === 'function' ? options : callback;
      const opts = typeof options === 'function' ? {} : options;
      (fs as any).readdir(path, opts, (err: any, files: any[]) => {
        if (err) { cb(err, null); return; }
        const serialized = files.map((file: any) => {
          // withFileTypes returns Dirent objects; plain strings need no wrapping
          if (typeof file === 'string') return file;
          return {
            name: file.name,
            isDirectory: () => file.isDirectory(),
            isFile: () => file.isFile(),
            isSymbolicLink: () => file.isSymbolicLink(),
            isBlockDevice: () => file.isBlockDevice(),
            isCharacterDevice: () => file.isCharacterDevice(),
            isFIFO: () => file.isFIFO(),
            isSocket: () => file.isSocket(),
          };
        });
        cb(null, serialized);
      });
    },
    mkdir: (...args: any[]) => {
      return (fs as any).mkdir(...args);
    },
    mkdirSync: (...args: any[]) => {
      return (fs as any).mkdirSync(...args);
    },
    rmdir: (...args: any[]) => {
      return (fs as any).rmdir(...args);
    },
    rmdirSync: (...args: any[]) => {
      return (fs as any).rmdirSync(...args);
    },
    stat: (path: string, callback: Function) => {
      (fs as any).stat(path, (err: any, stats: any) => {
        if (err) { callback(err, null); return; }
        callback(null, {
          // plain properties
          dev: stats.dev, ino: stats.ino, mode: stats.mode,
          nlink: stats.nlink, uid: stats.uid, gid: stats.gid,
          size: stats.size, blksize: stats.blksize, blocks: stats.blocks,
          atimeMs: stats.atimeMs, mtimeMs: stats.mtimeMs,
          ctimeMs: stats.ctimeMs, birthtimeMs: stats.birthtimeMs,
          atime: stats.atime, mtime: stats.mtime,
          ctime: stats.ctime, birthtime: stats.birthtime,
          // methods re-exposed as new closures
          isDirectory: () => stats.isDirectory(),
          isFile: () => stats.isFile(),
          isSymbolicLink: () => stats.isSymbolicLink(),
          isBlockDevice: () => stats.isBlockDevice(),
          isCharacterDevice: () => stats.isCharacterDevice(),
          isFIFO: () => stats.isFIFO(),
          isSocket: () => stats.isSocket(),
        });
      });
    },
    statSync: (path: string) => {
      const stats = (fs as any).statSync(path);
      return {
        dev: stats.dev, ino: stats.ino, mode: stats.mode,
        nlink: stats.nlink, uid: stats.uid, gid: stats.gid,
        size: stats.size, blksize: stats.blksize, blocks: stats.blocks,
        atimeMs: stats.atimeMs, mtimeMs: stats.mtimeMs,
        ctimeMs: stats.ctimeMs, birthtimeMs: stats.birthtimeMs,
        atime: stats.atime, mtime: stats.mtime,
        ctime: stats.ctime, birthtime: stats.birthtime,
        isDirectory: () => stats.isDirectory(),
        isFile: () => stats.isFile(),
        isSymbolicLink: () => stats.isSymbolicLink(),
        isBlockDevice: () => stats.isBlockDevice(),
        isCharacterDevice: () => stats.isCharacterDevice(),
        isFIFO: () => stats.isFIFO(),
        isSocket: () => stats.isSocket(),
      };
    },
    exists: (...args: any[]) => {
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
    minimize: (profile: any) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke('win-minimize', profile).then((response) => {
          resolve(response);
        });
      })
    },
    maximize: (profile: any) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke('win-maximize', profile).then((response) => {
          resolve(response);
        });
      })
    },
    locate_game_directory: (profile: any) => {
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke('locate-game-directory', profile).then((response) => {
          resolve(response);
        });
      })
    },
    launchProfile: (profile: any) => {
      ipcRenderer.send('launch_profile', profile);
    },
    openExternal: (src: string, options: any) => {
      shell.openExternal(src, options);
    },
  }
);
