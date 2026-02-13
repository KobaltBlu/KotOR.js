import * as fs from "fs";
import * as path from "path";

import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { IGameFileSystemReadDirOptions } from "../interface/filesystem/IGameFileSystemReadDirOptions";

import { ApplicationProfile } from "./ApplicationProfile";
import { createScopedLogger, LogScope } from "./Logger";

/** Electron dialog (injected by preload when ENV is ELECTRON). Used by showOpenFileDialog/showSaveFileDialog when implemented. */
declare const _dialog: {
  showOpenDialog: (opts?: { properties?: string[] }) => Promise<{ filePaths?: string[] }>;
  locateDirectoryDialog: () => Promise<string | null>;
};

const log = createScopedLogger(LogScope.Default);

const spleep = (time: number = 0) => {
  return new Promise<void>((resolve, _reject) => {
    setTimeout(resolve, time);
  });
}

/**
 * GameFileSystem class.
 *
 * Handles file system access for the application.
 * It will use either the File System Access API or the fs module built into node
 * depending on the ENVIRONMENT ( BROWSER|ELECTRON ) the app was loaded under.
 *
 * This class should only access the directory that the user supplied and not escape it.
 * Under the web this is forced, but the node implementation is not so strict.
 *
 * This class will also be able to access sub files and folders of the supplied directory.
 *
 * File access outside of this usecase should be delagated to calling the open/save file dialogs
 * when the user requests them.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GameFileSystem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GameFileSystem {

  private static normalizePath(filepath: string) {
    filepath = filepath.trim();
    filepath.replace(/^\/+/, '').replace(/\/+$/, '');
    filepath.replace(/^\\+/, '').replace(/\\+$/, '');
    return filepath;
  }

  //filepath should be relative to the rootDirectoryPath or ApplicationProfile.directory
  static async open(filepath: string, _mode: 'r' | 'w' = 'r'): Promise<number | FileSystemFileHandle> {
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      return new Promise<number>((resolve, reject) => {
        fs.open(path.join(ApplicationProfile.directory, filepath), (err, fd) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(fd);
        });
      });
    } else {
      // log.info('open', filepath);
      filepath = this.normalizePath(filepath);
      const dirs = filepath.split('/');
      const filename = dirs.pop();
      const dirHandle = await this.resolveFilePathDirectoryHandle(filepath);
      if (dirHandle) {
        const file = await dirHandle.getFileHandle(filename, {
          create: false
        });
        if (file) {
          return file;
        } else {
          throw new Error('Failed to read file');
        }
      } else {
        throw new Error('Failed to locate file directory');
      }
    }
  }

  static async read(handle: FileSystemFileHandle | number, output: Uint8Array, offset: number, length: number, position: number) {
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      return new Promise<Uint8Array>((resolve, reject) => {
        fs.read(handle as number, output, offset, length, position, (err, bytes, buffer) => {
          if (err) reject(err);
          output.set(new Uint8Array(buffer), offset);
          resolve(output);
        })
      });
    } else {
      if (!(handle)) throw new Error('No file handle supplied!');

      if (!(handle instanceof FileSystemFileHandle)) throw new Error('FileSystemFileHandle expected but one was not supplied!');

      if (!(output instanceof Uint8Array)) throw new Error('No output buffer supplied!');

      const file = await handle.getFile();
      if (!file) throw new Error('Failed to read file from handle!');

      const blob = await file.slice(position, position + length);
      const arrayBuffer = await blob.arrayBuffer();
      output.set(new Uint8Array(arrayBuffer), offset);
      // output.copy(new Uint8Array(arrayBuffer));
    }
  }

  static async close(handle: FileSystemFileHandle | number) {
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      return new Promise<void>((resolve, _reject) => {
        fs.close(handle as number, () => {
          resolve();
        })
      });
    } else {
      //this api does not expose a close method for reads
      return;
    }
  }

  //filepath should be relative to the rootDirectoryPath or ApplicationProfile.directory
  static async readFile(filepath: string, options: { encoding?: BufferEncoding } | null = {}): Promise<Uint8Array> {
    // log.info('readFile', filepath);
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      return new Promise<Uint8Array>((resolve, _reject) => {
        fs.readFile(path.join(ApplicationProfile.directory, filepath), options, (err, buffer) => {
          if (err) _reject(undefined);
          resolve(new Uint8Array(buffer));
        })
      });
    } else {
      const file = await this.open(filepath);
      if (!file) throw new Error('Failed to read file');

      const handle = await file.getFile();
      return new Uint8Array(await handle.arrayBuffer());
    }
  }

  //filepath should be relative to the rootDirectoryPath or ApplicationProfile.directory
  static async writeFile(filepath: string, data: Uint8Array): Promise<boolean> {
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      return new Promise<boolean>((resolve, _reject) => {
        fs.writeFile(path.join(ApplicationProfile.directory, filepath), data, (err) => {
          resolve(!err);
        });
      });
    }
    filepath = this.normalizePath(filepath);
    const dirs = filepath.split('/');
    const filename = dirs.pop();
    const dirHandle = await this.resolveFilePathDirectoryHandle(filepath);
    if (!dirHandle) throw new Error('Failed to locate file directory');
    const newFile = await dirHandle.getFileHandle(filename, { create: true });
    if (!newFile) throw new Error('Failed to create file');
    try {
      const stream = await newFile.createWritable();
      await stream.write(data);
      await stream.close();
      return true;
    } catch (_e) {
      return false;
    }
  }

  static async readdir(
    dirpath: string, options: IGameFileSystemReadDirOptions = {}, files: string[] = []
  ): Promise<string[]> {
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      return await this.readdir_fs(dirpath, options, files);
    } else {
      return await this.readdir_web(dirpath, options, files);
    }
  }

  private static async readdir_web(pathOrHandle: string | FileSystemDirectoryHandle = '', opts: IGameFileSystemReadDirOptions = {}, files: string[] = [], dirbase: string = '') {
    try {
      if (typeof pathOrHandle === 'string') {
        const dirPath = pathOrHandle as string;
        pathOrHandle = await this.resolvePathDirectoryHandle(pathOrHandle);
        if (!pathOrHandle) throw new Error('Failed to locate directory inside game folder: ' + dirPath);
        dirbase = pathOrHandle.name;
      }

      if (pathOrHandle instanceof FileSystemDirectoryHandle) {
        // Convert async iterator to array for parallel processing
        const entries = [];
        for await (const entry of pathOrHandle.values()) {
          entries.push(entry);
        }

        // Separate files and directories for parallel processing
        const fileEntries = [];
        const directoryEntries = [];

        for (const entry of entries) {
          if (entry.kind === "file") {
            if (!opts.list_dirs) {
              fileEntries.push(entry.name);
            }
          } else if (entry.kind === "directory") {
            if (opts.recursive) {
              directoryEntries.push(entry);
            } else {
              files.push(path.join(dirbase, entry.name));
            }
          }
        }

        // Add files to results (no async needed)
        for (const fileName of fileEntries) {
          files.push(path.join(dirbase, fileName));
        }

        // Process subdirectories in parallel using Promise.all
        if (opts.recursive && directoryEntries.length > 0) {
          const subdirPromises = directoryEntries.map(async (entry) => {
            const newdirbase = path.join(dirbase, entry.name);
            const subdirFiles: string[] = [];
            await this.readdir_web(entry, opts, subdirFiles, newdirbase);
            return subdirFiles;
          });

          // Process all subdirectories in parallel
          const subdirResults = await Promise.all(subdirPromises);

          // Flatten results
          for (const subdirFiles of subdirResults) {
            files.push(...subdirFiles);
          }
        }
      }

      return files;

    } catch (e) {
      log.error(String(e), e);
      if (typeof pathOrHandle === 'string') {
        throw new Error('Failed to resolve directory inside game folder: ' + pathOrHandle);
      } else {
        throw new Error('Failed to resolve directory inside game folder: ' + pathOrHandle.name);
      }
    }
  }

  private static async isFSDirectory(resource_path: string = ''): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      fs.stat(path.join(ApplicationProfile.directory, resource_path), (err, stats) => {
        if (err) {
          // ENOENT = path does not exist (e.g. optional game folders like StreamVoice in K1)
          if (err.code !== 'ENOENT') {
            log.error(String(err), err);
          }
          resolve(false);
          return;
        }
        resolve((stats.mode & fs.constants.S_IFDIR) === fs.constants.S_IFDIR);
      });
    });
  }

  private static async readdir_fs(resource_path: string = '', opts: IGameFileSystemReadDirOptions = {}, files: string[] = [], depthState?: { folder: string; depth: number }) {
    if (typeof depthState === 'undefined') {
      depthState = {
        'folder': resource_path,
        depth: 0
      }
    } else {
      depthState.depth++;
    }
    return new Promise<string[]>((resolve, reject) => {
      (async () => {
        try {
          const exists = await this.exists(resource_path);
          if (!exists) {
            resolve(files);
            return;
          }
          const dir_path = path.join(ApplicationProfile.directory, resource_path);

          if (!(await this.isFSDirectory(resource_path))) {
            if (!opts.list_dirs) {
              files.push(resource_path);
            }
            resolve(files);
            return;
          }
          if ((depthState.depth < 1) || opts.recursive) {
            fs.readdir(dir_path, { withFileTypes: true }, async (err, dir_files: fs.Dirent[]) => {
              if (err) {
                log.error(String(err), err);
                reject(err);
                return;
              }
              let file: fs.Dirent;
              let file_path = '';
              let is_dir = false;
              if (opts.list_dirs && depthState.depth) {
                files.push(resource_path);
              }
              for (let i = 0, len = dir_files.length; i < len; i++) {
                file = dir_files[i];
                file_path = path.join(resource_path, file.name);
                is_dir = (await this.isFSDirectory(file_path));
                try {
                  if (is_dir) {
                    if (opts.recursive) {
                      await this.readdir_fs(file_path, opts, files, depthState);
                    } else {
                      files.push(path.join(file_path));
                    }
                  } else {
                    if (!opts.list_dirs) {
                      files.push(path.join(file_path));
                    }
                    // else: only listing directories, don't push file
                  }
                } catch (err) {
                  log.error(String(err), err);
                }
              }
              resolve(files);
            });
          } else {
            resolve(files);
          }
        } catch (_e) {
          resolve(files);
        }
      })();
    });
  }

  static async mkdir(dirPath: string, opts: IGameFileSystemReadDirOptions = {}) {
    return new Promise<boolean>((resolve, _reject) => {
      (async () => {
        dirPath = dirPath.trim();
        if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
          fs.mkdir(path.join(ApplicationProfile.directory, dirPath), { recursive: !!opts.recursive }, async (err) => {
            if (err) {
              log.error(String(err), err);
              resolve(false);
              return;
            }
            await spleep(100);
            resolve(true);
            return;
          });
        } else {
          if (dirPath.length) {
            const dirs = dirPath.length ? dirPath.split(path.sep) : [];
            const cacheKey = dirs.join('/');
            if (this.directoryCache.has(cacheKey)) {
              return this.directoryCache.get(cacheKey)!;
            }
            try {
              let currentDirHandle = ApplicationProfile.directoryHandle;
              for (let i = 0, len = dirs.length; i < len; i++) {
                const isTargetDirectory = (i == dirs.length - 1);
                const canCreate = (isTargetDirectory || !!opts.recursive);
                currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i], { create: canCreate });
                log.trace('handle', currentDirHandle, isTargetDirectory, canCreate);
                if (!currentDirHandle && !isTargetDirectory) {
                  resolve(false);
                  return;
                }
                this.directoryCache.set(cacheKey, currentDirHandle);
              }
              log.trace('mkdir', currentDirHandle);
              await spleep(1000);
              resolve(true);
            } catch (e) {
              log.error(String(e), e);
              resolve(false);
              return;
            }
          } else {
            resolve(false);
            return;
          }
        }
      })();
    });
  }

  static async rmdir(dirPath: string, opts: IGameFileSystemReadDirOptions = {}) {
    return new Promise<boolean>((resolve, _reject) => {
      (async () => {
        dirPath = dirPath.trim();
        if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
          const fullPath = path.join(ApplicationProfile.directory, dirPath);
          log.trace('fs.rmdir', fullPath, opts.recursive ? '(recursive)' : '');
          const callback = (err: NodeJS.ErrnoException | null) => {
            if (err) {
              log.error(String(err), err);
              resolve(false);
              return;
            }
            resolve(true);
          };
          if (opts.recursive) {
            try {
              (fs.rm as unknown as (a: string, b: { recursive: boolean }, c: (err: NodeJS.ErrnoException | null) => void) => void)(
                fullPath,
                { recursive: true },
                callback
              );
            } catch (_e) {
              (fs.rmdir as unknown as (a: string, b: { recursive: boolean }, c: (err: NodeJS.ErrnoException | null) => void) => void)(
                fullPath,
                { recursive: true },
                callback
              );
            }
          } else {
            fs.rmdir(fullPath, callback);
          }
        } else {
          try {
            const details = path.parse(dirPath);
            const parentHandle = await this.resolvePathDirectoryHandle(details.dir);
            if (parentHandle == ApplicationProfile.directoryHandle) resolve(false);
            if (parentHandle) {
              for await (const entry of parentHandle.values()) {
                if (entry.kind == 'file') continue;
                if (entry.name.toLowerCase() != details.name.toLowerCase()) continue;
                await parentHandle.removeEntry(entry.name, { recursive: opts.recursive });
                break;
              }
            }
            resolve(true);
            return;
          } catch (e) {
            log.error(String(e), e);
            resolve(false);
            return;
          }
        }
      })();
    });
  }

  static async opendir_web(dirPath: string = ''): Promise<FileSystemDirectoryHandle | undefined> {
    return await this.resolvePathDirectoryHandle(dirPath);
  }

  static exists(dirOrFilePath: string): Promise<boolean> {
    return new Promise<boolean>((resolve, _reject) => {
      if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
        fs.stat(path.join(ApplicationProfile.directory, dirOrFilePath), (err, _stats) => {
          if (err) {
            if (err.code !== 'ENOENT') {
              log.error(`GameFileSystem.exists: ${dirOrFilePath} - ${err.message}`);
            }
            resolve(false);
            return;
          }
          resolve(true);
        });
      } else {
        (async () => {
          const details = path.parse(dirOrFilePath);
          try {
            if (details.ext) {
              const handle = await this.resolveFilePathDirectoryHandle(dirOrFilePath);
              if (handle) {
                const fileHandle = await handle.getFileHandle(details.base);
                if (fileHandle) {
                  resolve(true);
                  return;
                }
                resolve(false);
                return;
              }
              resolve(false);
              return;
            }
            const handle = await this.resolvePathDirectoryHandle(dirOrFilePath);
            if (handle) {
              resolve(true);
              return;
            }
            resolve(false);
          } catch (e) {
            log.trace(dirOrFilePath);
            log.error(String(e), e);
            resolve(false);
          }
        })();
      }
    });
  }

  static async unlink(handleOrPath: string | FileSystemFileHandle) {
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      return new Promise<void>((resolve, reject) => {
        try {
          fs.unlink(handleOrPath as string, () => {
            resolve();
            return;
          })
        } catch (e) {
          log.error(String(e), e);
          reject(e);
          return;
        }
      })
    } else {
      if (handleOrPath instanceof FileSystemFileHandle) {
        const file = await handleOrPath.getFile();
        //@ts-expect-error
        file.remove();
      }
    }
  }

  static async showOpenFileDialog() {
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      void _dialog; // TODO: use _dialog.showOpenDialog when implementing
      return undefined;
    } else {
      // const pickerOpts = {
      //   types: [
      //     {
      //       description: 'Images',
      //       accept: {
      //         'image/*': ['.png', '.gif', '.jpeg', '.jpg']
      //       }
      //     },
      //   ],
      //   excludeAcceptAllOption: true,
      //   multiple: false
      // };
      const [fileHandle] = await window.showOpenFilePicker({ multiple: false });
      return fileHandle;
    }
  }

  static async showSaveFileDialog() {
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      void _dialog; // TODO: use _dialog when implementing
      return undefined;
    } else {
      return await window.showSaveFilePicker({});
    }
  }

  private static async resolvePathDirectoryHandle(filepath: string, parent = false): Promise<FileSystemDirectoryHandle> {
    if (ApplicationProfile.directoryHandle) {
      const dirs = filepath.length ? filepath.split('/') : [];
      const cacheKey = dirs.join('/');
      if (this.directoryCache.has(cacheKey)) {
        return this.directoryCache.get(cacheKey)!;
      }
      let lastDirectoryHandle = ApplicationProfile.directoryHandle;
      let currentDirHandle = ApplicationProfile.directoryHandle;
      let found = false;
      for (let i = 0, len = dirs.length; i < len; i++) {
        lastDirectoryHandle = currentDirHandle;
        // currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i]);
        found = false;
        for await (const entry of currentDirHandle.values()) {
          if (entry.kind == 'directory' && entry.name.toLowerCase() == dirs[i].toLowerCase()) {
            found = true;
            currentDirHandle = entry as FileSystemDirectoryHandle;
            break;
          }
        }
        if (!found) {
          throw new Error(`Failed to resolve file path directory handle: Filepath: ${filepath} | Current Directory: ${dirs[i]} | Index: ${i}`);
        }
      }
      this.directoryCache.set(cacheKey, currentDirHandle);
      return !parent ? currentDirHandle : lastDirectoryHandle;
    }
    return;
  }

  static directoryCache: Map<string, FileSystemDirectoryHandle> = new Map();

  private static async resolveFilePathDirectoryHandle(filepath: string): Promise<FileSystemDirectoryHandle> {
    if (ApplicationProfile.directoryHandle) {
      const dirs = filepath.split('/');
      dirs.pop(); // base name not needed for directory resolution
      const cacheKey = dirs.join('/');
      if (this.directoryCache.has(cacheKey)) {
        return this.directoryCache.get(cacheKey)!;
      }
      let currentDirHandle = ApplicationProfile.directoryHandle;
      let found = false;
      for (let i = 0, len = dirs.length; i < len; i++) {
        // currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i]);
        found = false;
        for await (const entry of currentDirHandle.values()) {
          if (entry.kind == 'directory' && entry.name.toLowerCase() == dirs[i].toLowerCase()) {
            found = true;
            currentDirHandle = entry as FileSystemDirectoryHandle;
            break;
          }
        }
        if (!found) {
          throw new Error(`Failed to resolve file path directory handle: Filepath: ${filepath} | Current Directory: ${dirs[i]} | Index: ${i}`);
        }
      }
      this.directoryCache.set(cacheKey, currentDirHandle);
      return currentDirHandle;
    }
    return;
  }

  static async initializeGameDirectory() {
    if (ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON) {
      // ELECTRON: directory is set by the launcher; no-op here
      void 0;
    } else {
      ApplicationProfile.directoryHandle = await window.showDirectoryPicker({
        mode: "readwrite"
      });
    }
  }

  static async validateDirectoryHandle(handle: FileSystemDirectoryHandle) {
    try {
      if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
        return true;
      }
      return false;
    } catch (e) {
      log.error(String(e), e);
      return false;
    }
  }

  static async showRequestDirectoryDialog() {
    const handle = await window.showDirectoryPicker({
      id: ApplicationProfile.profile?.key,
      mode: "readwrite"
    });
    if (handle) {
      if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
        return handle;
      }
    }
    return;
  }


}
