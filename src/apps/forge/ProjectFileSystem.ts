import * as fs from "fs";
import * as path from "path";


import { EditorFile } from "@/apps/forge/EditorFile";
import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabProjectExplorerState } from "@/apps/forge/states/tabs";
import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import { IGameFileSystemReadDirOptions } from "@/interface/filesystem/IGameFileSystemReadDirOptions";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.Forge);

const spleep = (time: number = 0) => {
  return new Promise( (resolve, _reject) => {
    setTimeout(resolve, time);
  });
}

export class ProjectFileSystem {
  /** Instance marker so this class is not treated as extraneous (static-only). */
  private readonly _instance = true;

  static rootDirectoryHandle: FileSystemDirectoryHandle;
  static rootDirectoryPath: string;
  static directoryCache: Map<string, FileSystemDirectoryHandle> = new Map();

  static initializeProjectExplorer() {
    log.trace('ProjectFileSystem.initializeProjectExplorer()');
    return new Promise<void>( (resolve, _reject) => {
      TabProjectExplorerState.GenerateResourceList( ForgeState.projectExplorerTab ).then( (_resourceList) => {
        log.trace('ProjectFileSystem.initializeProjectExplorer() GenerateResourceList done');
        ForgeState.loaderHide();
        resolve();
      });
    });
  }

  static async openEditorFile(resource: string): Promise<EditorFile> {
    log.trace('ProjectFileSystem.openEditorFile()', resource);
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      const ef = new EditorFile({
        path: `${EditorFileProtocol.FILE}//project.dir/${resource}`,
        useProjectFileSystem: true,
      });
      log.trace('ProjectFileSystem.openEditorFile() ELECTRON created');
      return ef;
    }else{
      const ef = new EditorFile({
        path: `${EditorFileProtocol.FILE}//project.dir/${resource}`,
        useProjectFileSystem: true,
      });
      log.trace('ProjectFileSystem.openEditorFile() BROWSER created');
      return ef;
    }
  }

  // Override mkdir to use project directory
  static mkdir(dirPath: string, opts: IGameFileSystemReadDirOptions = {}): Promise<boolean> {
    log.trace('ProjectFileSystem.mkdir()', dirPath, opts.recursive);
    return new Promise<boolean>((resolve, _reject) => {
      dirPath = dirPath.trim();
      if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        if(!this.rootDirectoryPath){
          log.trace('ProjectFileSystem.mkdir() ELECTRON no root');
          resolve(false);
          return;
        }
        fs.mkdir(path.join(this.rootDirectoryPath, dirPath), { recursive: !!opts.recursive }, (err) => {
          if(err){
            log.error(err instanceof Error ? err : String(err));
            resolve(false);
            return;
          }
          void spleep(100).then(() => {
            log.trace('ProjectFileSystem.mkdir() ELECTRON done');
            resolve(true);
          });
        });
        return;
      }
      if(!this.rootDirectoryHandle){
        log.trace('ProjectFileSystem.mkdir() BROWSER no handle');
        resolve(false);
        return;
      }
      if(!dirPath.length){
        resolve(false);
        return;
      }
      const dirs = dirPath.split(path.sep);
      const cacheKey = dirs.join('/');
      const cached = this.directoryCache.get(cacheKey);
      if(cached){
        log.trace('ProjectFileSystem.mkdir() BROWSER cached');
        resolve(true);
        return;
      }
      void (async () => {
        try{
          let currentDirHandle = this.rootDirectoryHandle;
          for(let i = 0, len = dirs.length; i < len; i++){
            const isTargetDirectory = (i === dirs.length - 1);
            const canCreate = (isTargetDirectory || !!opts.recursive);
            currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i], { create: canCreate });
            if(!currentDirHandle && !isTargetDirectory){
              resolve(false);
              return;
            }
            this.directoryCache.set(cacheKey, currentDirHandle);
          }
          await spleep(100);
          log.trace('ProjectFileSystem.mkdir() BROWSER done');
          resolve(true);
        }catch(e){
          log.error(e instanceof Error ? e : String(e));
          resolve(false);
        }
      })();
    });
  }

  // Override readFile to use project directory
  static async readFile(filepath: string, options: { encoding?: BufferEncoding } = {}): Promise<Uint8Array> {
    log.trace('ProjectFileSystem.readFile()', filepath);
    if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      if(!this.rootDirectoryPath){
        throw new Error('Project root directory not set');
      }
      return new Promise<Uint8Array>( (resolve, reject) => {
        fs.readFile(path.join(this.rootDirectoryPath, filepath), options, (err: NodeJS.ErrnoException | null, buffer: Buffer | undefined) => {
          if (err) {
            log.trace('ProjectFileSystem.readFile() ELECTRON err', err.message);
            reject(err);
            return;
          }
          const out = new Uint8Array(buffer ?? new ArrayBuffer(0));
          log.trace('ProjectFileSystem.readFile() ELECTRON size', out.length);
          resolve(out);
        });
      });
    }else{
      const file = await this.open(filepath);
      if(!file) throw new Error('Failed to read file');
      const handle = await (file as FileSystemFileHandle).getFile();
      const arrBuf = await handle.arrayBuffer();
      log.trace('ProjectFileSystem.readFile() BROWSER size', arrBuf.byteLength);
      return new Uint8Array(arrBuf);
    }
  }

  // Override writeFile to use project directory
  static writeFile(filepath: string, data: Uint8Array): Promise<boolean> {
    log.trace('ProjectFileSystem.writeFile()', filepath, data.length);
    return new Promise<boolean>((resolve, _reject) => {
      if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        if(!this.rootDirectoryPath){
          log.trace('ProjectFileSystem.writeFile() ELECTRON no root');
          resolve(false);
          return;
        }
        fs.writeFile(path.join(this.rootDirectoryPath, filepath), data, (err) => {
          log.trace('ProjectFileSystem.writeFile() ELECTRON done', !err);
          resolve(!err);
        });
        return;
      }
      if(!this.rootDirectoryHandle){
        resolve(false);
        return;
      }
      void (async () => {
        try {
          const normalizedPath = this.normalizePathProject(filepath);
          const dirs = normalizedPath.split('/');
          const filename = dirs.pop();
          if(!filename){
            resolve(false);
            return;
          }
          const dirHandle = await this.resolveFilePathDirectoryHandleProject(normalizedPath);
          if(!dirHandle){
            resolve(false);
            return;
          }
          const newFile = await dirHandle.getFileHandle(filename, { create: true });
          if(!newFile){
            resolve(false);
            return;
          }
          const stream = await newFile.createWritable();
          await stream.write(data as BufferSource);
          await stream.close();
          resolve(true);
        }catch(e){
          log.error(e instanceof Error ? e : String(e));
          resolve(false);
        }
      })();
    });
  }

  // Override readdir to use project directory
  static async readdir(
    dirpath: string, options: IGameFileSystemReadDirOptions = {}, files: string[] = []
  ): Promise<string[]> {
    log.trace('ProjectFileSystem.readdir()', dirpath);
    if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      const result = await this.readdir_fs_project(dirpath, options, files);
      log.trace('ProjectFileSystem.readdir() ELECTRON count', result.length);
      return result;
    }else{
      const result = await this.readdir_web_project(dirpath, options, files);
      log.trace('ProjectFileSystem.readdir() BROWSER count', result.length);
      return result;
    }
  }

  // Override exists to use project directory
  static exists(dirOrFilePath: string): Promise<boolean> {
    log.trace('ProjectFileSystem.exists()', dirOrFilePath);
    return new Promise<boolean>((resolve, _reject) => {
      if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        if(!this.rootDirectoryPath){
          resolve(false);
          return;
        }
        fs.stat(path.join(this.rootDirectoryPath, dirOrFilePath), (err, _stats) => {
          if(err){
            log.debug('exists() failed for path', dirOrFilePath, err);
            resolve(false);
            return;
          }
          log.trace('ProjectFileSystem.exists() ELECTRON true');
          resolve(true);
        });
        return;
      }
      void (async () => {
        const details = path.parse(dirOrFilePath);
        try{
          if(details.ext){
            const handle = await this.resolveFilePathDirectoryHandleProject(dirOrFilePath);
            if(handle){
              const fileHandle = await handle.getFileHandle(details.base);
              resolve(!!fileHandle);
              return;
            }
            resolve(false);
            return;
          }
          const handle = await this.resolvePathDirectoryHandleProject(dirOrFilePath);
          resolve(!!handle);
        }catch(e){
          log.debug('resolvePathDirectoryHandleProject failed for path', dirOrFilePath);
          log.error(e instanceof Error ? e : String(e));
          resolve(false);
        }
      })();
    });
  }

  // Override open to use project directory
  static async open(filepath: string, _mode: 'r'|'w' = 'r'): Promise<number | FileSystemFileHandle> {
    if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      if(!this.rootDirectoryPath){
        throw new Error('Project root directory not set');
      }
      return new Promise<number>( (resolve, _reject) => {
        fs.open(path.join(this.rootDirectoryPath, filepath), (err, fd) => {
          if(err){
            log.error(err instanceof Error ? err : String(err));
            _reject(err);
            return;
          }
          resolve(fd);
        });
      });
    }else{
      if(!this.rootDirectoryHandle){
        throw new Error('Project root directory handle not set');
      }
      filepath = this.normalizePathProject(filepath);
      const dirs = filepath.split('/');
      const filename = dirs.pop();
      if(!filename){
        throw new Error('Invalid file path');
      }
      const dirHandle = await this.resolveFilePathDirectoryHandleProject(filepath);
      if(dirHandle){
        const file = await dirHandle.getFileHandle(filename, {
          create: false
        });
        if(file){
          return file;
        }else{
          throw new Error('Failed to read file');
        }
      }else{
        throw new Error('Failed to locate file directory');
      }
    }
  }

  // Helper method to normalize path (using different name to avoid conflict with base class)
  private static normalizePathProject(filepath: string): string {
    filepath = filepath.trim();
    filepath.replace(/^\/+/, '').replace(/\/+$/, '');
    filepath.replace(/^\\+/, '').replace(/\\+$/, '');
    return filepath;
  }

  // Override resolvePathDirectoryHandle to use project directory handle
  private static async resolvePathDirectoryHandleProject(filepath: string, parent = false): Promise<FileSystemDirectoryHandle | undefined> {
    if(this.rootDirectoryHandle){
      const dirs = filepath.length ? filepath.split('/') : [];
      const cacheKey = dirs.join('/');
      const cached = this.directoryCache.get(cacheKey);
      if(cached){
        return cached;
      }
      let lastDirectoryHandle = this.rootDirectoryHandle;
      let currentDirHandle = this.rootDirectoryHandle;
      let found = false;
      for(let i = 0, len = dirs.length; i < len; i++){
        lastDirectoryHandle = currentDirHandle;
        found = false;
        for await (const entry of currentDirHandle.values()) {
          if(entry.kind == 'directory' && entry.name.toLowerCase() == dirs[i].toLowerCase()){
            found = true;
            currentDirHandle = entry as FileSystemDirectoryHandle;
            break;
          }
        }
        if(!found){
          throw new Error(`Failed to resolve file path directory handle: Filepath: ${filepath} | Current Directory: ${dirs[i]} | Index: ${i}`);
        }
      }
      this.directoryCache.set(cacheKey, currentDirHandle);
      return !parent ? currentDirHandle : lastDirectoryHandle;
    }
    return undefined;
  }

  // Override resolveFilePathDirectoryHandle to use project directory handle
  private static async resolveFilePathDirectoryHandleProject(filepath: string): Promise<FileSystemDirectoryHandle | undefined> {
    if(this.rootDirectoryHandle){
      const dirs = filepath.split('/');
      dirs.pop(); // filename not needed for cacheKey
      const cacheKey = dirs.join('/');
      const cachedDir = this.directoryCache.get(cacheKey);
      if(cachedDir){
        return cachedDir;
      }
      let currentDirHandle = this.rootDirectoryHandle;
      let found = false;
      for(let i = 0, len = dirs.length; i < len; i++){
        found = false;
        for await (const entry of currentDirHandle.values()) {
          if(entry.kind == 'directory' && entry.name.toLowerCase() == dirs[i].toLowerCase()){
            found = true;
            currentDirHandle = entry as FileSystemDirectoryHandle;
            break;
          }
        }
        if(!found){
          throw new Error(`Failed to resolve file path directory handle: Filepath: ${filepath} | Current Directory: ${dirs[i]} | Index: ${i}`);
        }
      }
      this.directoryCache.set(cacheKey, currentDirHandle);
      return currentDirHandle;
    }
    return undefined;
  }

  // Override readdir_fs to use project directory
  private static async readdir_fs_project(resource_path: string = '', opts: IGameFileSystemReadDirOptions = {},  files: string[] = [], depthState?: { folder: string; depth: number }) {
    if(typeof depthState === 'undefined'){
      depthState = {
        'folder': resource_path,
        depth: 0
      }
    }else{
      depthState.depth++;
    }
    return new Promise<string[]>((resolve, _reject) => {
      void (async () => {
        try{
          if(!this.rootDirectoryPath){
            resolve(files);
            return;
          }
          const dir_path = path.join(this.rootDirectoryPath, resource_path);

          if(!(await this.isFSDirectoryProject(resource_path))){
            if(!opts.list_dirs){
              files.push(resource_path);
            }
            resolve(files);
            return;
          }
          if((depthState.depth < 1) || !!opts.recursive){
            const dirFiles = await new Promise<fs.Dirent[]>((res, rej) => {
              fs.readdir(dir_path, { withFileTypes: true }, (err, entries) => {
                if(err){
                  log.error(err instanceof Error ? err : String(err));
                  rej(err);
                  return;
                }
                res(entries);
              });
            });
            if(!!opts.list_dirs && depthState.depth){
              files.push(resource_path);
            }
            for(let i = 0, len = dirFiles.length; i < len; i++){
              const file = dirFiles[i];
              const file_path = path.join(resource_path, file.name);
              try{
                const is_dir = await this.isFSDirectoryProject(file_path);
                if(is_dir){
                  if(opts.recursive){
                    await this.readdir_fs_project(file_path, opts, files, depthState);
                  }else{
                    files.push(path.join(file_path));
                  }
                }else{
                  if(!opts.list_dirs){
                    files.push(path.join(file_path));
                  }
                }
              }catch(err){
                log.error(err instanceof Error ? err : String(err));
              }
            }
            resolve(files);
          }else{
            resolve(files);
          }
        }catch{
          resolve(files);
        }
      })();
    });
  }

  // Override readdir_web to use project directory handle
  private static async readdir_web_project(pathOrHandle: string|FileSystemDirectoryHandle = '', opts: IGameFileSystemReadDirOptions = {},  files: string[] = [], dirbase: string = ''): Promise<string[]> {
    try{
      let dirHandle: FileSystemDirectoryHandle | undefined;
      if(typeof pathOrHandle === 'string'){
        const dirPath = pathOrHandle as string;
        dirHandle = await this.resolvePathDirectoryHandleProject(dirPath);
        if(!dirHandle) throw new Error('Failed to locate directory inside project folder: '+dirPath);
        dirbase = dirHandle.name;
      } else {
        dirHandle = pathOrHandle;
      }

      if(dirHandle instanceof FileSystemDirectoryHandle){
        const entries: (FileSystemFileHandle | FileSystemDirectoryHandle)[] = [];
        for await (const entry of dirHandle.values()) {
          entries.push(entry);
        }

        const fileEntries: string[] = [];
        const directoryEntries: FileSystemDirectoryHandle[] = [];

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

        for (const fileName of fileEntries) {
          files.push(path.join(dirbase, fileName));
        }

        if (opts.recursive && directoryEntries.length > 0) {
          const subdirPromises = directoryEntries.map(async (entry) => {
            const newdirbase = path.join(dirbase, entry.name);
            const subdirFiles: string[] = [];
            await this.readdir_web_project(entry, opts, subdirFiles, newdirbase);
            return subdirFiles;
          });

          const subdirResults = await Promise.all(subdirPromises);

          for (const subdirFiles of subdirResults) {
            files.push(...subdirFiles);
          }
        }
      }

      return files;

    }catch(e){
      log.error(e instanceof Error ? e : String(e));
      if(typeof pathOrHandle === 'string'){
        throw new Error('Failed to resolve directory inside project folder: '+pathOrHandle);
      }else{
        throw new Error('Failed to resolve directory inside project folder: '+(pathOrHandle as FileSystemDirectoryHandle).name);
      }
    }
  }

  // Override isFSDirectory to use project directory
  private static async isFSDirectoryProject(resource_path: string = ''): Promise<boolean> {
    if(!this.rootDirectoryPath){
      return false;
    }
    return new Promise<boolean>( (resolve, _reject) => {
      fs.stat(path.join(this.rootDirectoryPath, resource_path), (err, stats) => {
        if(err){
          log.error(err instanceof Error ? err : String(err));
          _reject();
          return;
        }
        resolve((stats.mode & fs.constants.S_IFDIR) == fs.constants.S_IFDIR)
      })
    });
  }

}
