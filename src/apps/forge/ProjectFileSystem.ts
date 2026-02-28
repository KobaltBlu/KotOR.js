import { EditorFile } from "./EditorFile";
import * as KotOR from "./KotOR";
import { EditorFileProtocol } from "./enum/EditorFileProtocol";
import { ForgeState } from "./states/ForgeState";
import { TabProjectExplorerState } from "./states/tabs";
import * as path from "path";
import * as fs from "fs";
import { ApplicationEnvironment } from "../../enums/ApplicationEnvironment";
import { IGameFileSystemReadDirOptions } from "../../interface/filesystem/IGameFileSystemReadDirOptions";

const spleep = (time: number = 0) => {
  return new Promise( (resolve, reject) => {
    setTimeout(resolve, time);
  });
}

export class ProjectFileSystem {

  static rootDirectoryHandle: FileSystemDirectoryHandle;
  static rootDirectoryPath: string;
  static directoryCache: Map<string, FileSystemDirectoryHandle> = new Map();

  static initializeProjectExplorer() {
    return new Promise<void>( (resolve, reject) => {
      TabProjectExplorerState.GenerateResourceList( ForgeState.projectExplorerTab ).then( (resourceList) => {
        ForgeState.loaderHide();
        resolve();
      });
    });
  }

  static async openEditorFile(resource: string): Promise<EditorFile> {
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      return new EditorFile({
        path: `${EditorFileProtocol.FILE}//project.dir/${resource}`,
        useProjectFileSystem: true,
      });
    }else{
      // const handle = await this.open(resource, "w") as FileSystemFileHandle;
      // return new EditorFile({
      //   handle: handle,
      //   useProjectFileSystem: true,
      // });
      return new EditorFile({
        path: `${EditorFileProtocol.FILE}//project.dir/${resource}`,
        useProjectFileSystem: true,
      });
    }
  }

  // Override mkdir to use project directory
  static async mkdir(dirPath: string, opts: IGameFileSystemReadDirOptions = {}): Promise<boolean> {
    return new Promise<boolean>( async (resolve, reject) => {
      dirPath = dirPath.trim();
      if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        if(!this.rootDirectoryPath){
          resolve(false);
          return;
        }
        fs.mkdir(path.join(this.rootDirectoryPath, dirPath), { recursive: !!opts.recursive }, async (err) => {
          if(err){
            console.error(err);
            resolve(false);
            return;
          }
          await spleep(100);
          resolve(true);
          return;
        });
      }else{
        if(!this.rootDirectoryHandle){
          resolve(false);
          return;
        }
        if(dirPath.length){
          const dirs = dirPath.length ? dirPath.split(path.sep) : [];
          const cacheKey = dirs.join('/');
          if(this.directoryCache.has(cacheKey)){
            return this.directoryCache.get(cacheKey)!;
          }
          try{
            let currentDirHandle = this.rootDirectoryHandle; 
            for(let i = 0, len = dirs.length; i < len; i++){
              const isTargetDirectory = (i == dirs.length-1);
              const canCreate = (isTargetDirectory || !!opts.recursive);
              currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i], { create: canCreate });
              if(!currentDirHandle && !isTargetDirectory){
                resolve(false);
                return;
              }
              this.directoryCache.set(cacheKey, currentDirHandle);
            }
            await spleep(100);
            resolve(true);
          }catch(e){
            console.error(e);
            resolve(false);
            return;
          }
        }else{
          resolve(false);
          return;
        }
      }
    });
  }

  // Override readFile to use project directory
  static async readFile(filepath: string, options: any = {}): Promise<Uint8Array> {
    if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      if(!this.rootDirectoryPath){
        throw new Error('Project root directory not set');
      }
      return new Promise<Uint8Array>( (resolve, reject) => {
        fs.readFile(path.join(this.rootDirectoryPath, filepath), options, (err, buffer) => {
          if(err) reject(undefined);
          resolve(new Uint8Array(buffer));
        })
      });
    }else{
      const file = await this.open(filepath);
      if(!file) throw new Error('Failed to read file');
      
      let handle = await file.getFile();
      return new Uint8Array( await handle.arrayBuffer() );
    }
  }

  // Override writeFile to use project directory
  static async writeFile(filepath: string, data: Uint8Array): Promise<boolean> {
    return new Promise<boolean>( async (resolve, reject) => {
      if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        if(!this.rootDirectoryPath){
          resolve(false);
          return;
        }
        fs.writeFile(path.join(this.rootDirectoryPath, filepath), data, (err) => {
          resolve(!err);
        })
      }else{
        if(!this.rootDirectoryHandle){
          resolve(false);
          return;
        }
        filepath = this.normalizePathProject(filepath);
        const dirs = filepath.split('/');
        const filename = dirs.pop();
        if(!filename){
          resolve(false);
          return;
        }
        const dirHandle = await this.resolveFilePathDirectoryHandleProject(filepath);
        
        if(!dirHandle) throw new Error('Failed to locate file directory');
        
        const newFile = await dirHandle.getFileHandle(filename, {
          create: true
        });

        if(!newFile) throw new Error('Failed to create file');

        try{
          let stream = await newFile.createWritable();
          await stream.write(data as any);
          await stream.close();
          resolve(true);
          return;
        }catch(e){
          console.error(e);
          resolve(false);
          return;
        }
      }
    });
  }

  // Override readdir to use project directory
  static async readdir(
    dirpath: string, options: IGameFileSystemReadDirOptions = {}, files: any[] = []
  ): Promise<string[]> {
    if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return await this.readdir_fs_project(dirpath, options, files);
    }else{
      return await this.readdir_web_project(dirpath, options, files);
    }
  }

  // Override exists to use project directory
  static exists(dirOrFilePath: string): Promise<boolean> {
    return new Promise<boolean>( async (resolve, reject) => {
      if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        if(!this.rootDirectoryPath){
          resolve(false);
          return;
        }
        fs.stat(path.join(this.rootDirectoryPath, dirOrFilePath), (err, stats) => {
          if(err){
            console.log(dirOrFilePath);
            console.error(err);
            resolve(false);
            return;
          }
          resolve(true);
        });
      }else{
        const details = path.parse(dirOrFilePath);
        try{
          if(details.ext){
            let handle = await this.resolveFilePathDirectoryHandleProject(dirOrFilePath);
            if(handle){
              let fileHandle = await handle.getFileHandle(details.base);
              if(fileHandle){
                resolve(true);
                return;
              }else{
                resolve(false);
                return;
              }
            }else{
              resolve(false);
              return;
            }
          }else{
            let handle = await this.resolvePathDirectoryHandleProject(dirOrFilePath);
            if(handle){
              resolve(true);
              return;
            }else{
              resolve(false);
              return;
            }
          }
        }catch(e){
          console.log(dirOrFilePath);
          console.error(e);
          resolve(false);
          return;
        }
      }
    });
  }

  // Override open to use project directory
  static async open(filepath: string, mode: 'r'|'w' = 'r'): Promise<any> {
    if(KotOR.ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      if(!this.rootDirectoryPath){
        throw new Error('Project root directory not set');
      }
      return new Promise<number>( (resolve, reject) => {
        fs.open(path.join(this.rootDirectoryPath, filepath), (err, fd) => {
          if(err){
            console.error(err);
            reject(err);
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
      if(this.directoryCache.has(cacheKey)){
        return this.directoryCache.get(cacheKey)!;
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
      const filename = dirs.pop();
      const cacheKey = dirs.join('/');
      if(this.directoryCache.has(cacheKey)){
        return this.directoryCache.get(cacheKey)!;
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
  private static async readdir_fs_project(resource_path: string = '', opts: IGameFileSystemReadDirOptions = {},  files: any[] = [], depthState?: any) {
    if(typeof depthState === 'undefined'){
      depthState = {
        'folder': resource_path,
        depth: 0
      }
    }else{
      depthState.depth++;
    }
    return new Promise<string[]>( async (resolve, reject) => {
      try{
        if(!this.rootDirectoryPath){
          resolve(files);
          return;
        }
        let dir_path = path.join(this.rootDirectoryPath, resource_path);
        
        if(!(await this.isFSDirectoryProject(resource_path))){
          if(!opts.list_dirs){
            files.push(resource_path);
          }
          resolve(files);
          return;
        }else{
          if((depthState.depth < 1) || !!opts.recursive ){
            fs.readdir(dir_path, {withFileTypes: true}, async (err, dir_files: fs.Dirent[]) => {
              if(err){
                console.error(err);
                reject(err);
                return;
              }
              let file: fs.Dirent;
              let file_path = '';
              let is_dir = false;
              if(!!opts.list_dirs && depthState.depth){
                files.push(resource_path);
              }
              for(let i = 0, len = dir_files.length; i < len; i++){
                file = dir_files[i];
                file_path = path.join(resource_path, file.name);
                is_dir = (await this.isFSDirectoryProject(file_path));
                try{
                  if(!!is_dir){
                    if(!!opts.recursive){
                      await this.readdir_fs_project(file_path, opts, files, depthState);
                    }else{
                      files.push(path.join(file_path));
                    }
                  }else{
                    if(!opts.list_dirs){
                      files.push(path.join(file_path));
                    }
                  }
                }catch(e){
                  console.error(e);
                }
              }
              resolve(files);
            });
          }else{
            resolve(files);
          }
        }
      }catch(e){
        resolve(files);
      }
    });
  }

  // Override readdir_web to use project directory handle
  private static async readdir_web_project(pathOrHandle: string|FileSystemDirectoryHandle = '', opts: any = {},  files: any[] = [], dirbase: string = ''): Promise<string[]> {
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
      console.error(e);
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
    return new Promise<boolean>( (resolve, reject) => {
      fs.stat(path.join(this.rootDirectoryPath, resource_path), (err, stats) => {
        if(err){
          console.error(err);
          reject();
          return;
        }
        resolve((stats.mode & fs.constants.S_IFDIR) == fs.constants.S_IFDIR)
      })
    });
  }

}
