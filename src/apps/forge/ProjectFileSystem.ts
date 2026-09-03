import { EditorFile } from "@/apps/forge/EditorFile";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabProjectExplorerState } from "@/apps/forge/states/tabs";
import {
  hasProjectRoot,
  isMemoryDirectoryHandle,
  isProjectDirectoryHandle,
} from "@/apps/forge/virtual/VirtualProjectFolder";
import * as path from "path";
import * as fs from "fs";
import { IGameFileSystemReadDirOptions } from "@/interface/filesystem/IGameFileSystemReadDirOptions";

const spleep = (time: number = 0) => {
  return new Promise( (resolve, reject) => {
    setTimeout(resolve, time);
  });
}

/** Project-relative path for File System Access API (forward slashes, no leading slash). */
function normalizeWebProjectRelativeDir(rel: string): string {
  let s = rel.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  // "." means project root; do not treat it as a child directory named ".".
  if (!s || s === '.') {
    return '';
  }
  return s;
}

function posixJoinRel(dirbase: string, segment: string): string {
  const base = normalizeWebProjectRelativeDir(dirbase);
  if (!base) return segment;
  return `${base}/${segment}`;
}

function splitHandlePathSegments(dirPath: string): string[] {
  return normalizeWebProjectRelativeDir(dirPath).split('/').filter(Boolean);
}

export class ProjectFileSystem {

  static rootDirectoryHandle: FileSystemDirectoryHandle;
  static rootDirectoryPath: string;
  static directoryCache: Map<string, FileSystemDirectoryHandle> = new Map();
  static isVirtual = false;

  static hasRoot(): boolean {
    return hasProjectRoot(this.rootDirectoryPath, this.rootDirectoryHandle);
  }

  static useHandleBackend(): boolean {
    return isProjectDirectoryHandle(this.rootDirectoryHandle);
  }

  /** Call when switching projects so stale handles are not reused. */
  static clearDirectoryCache(): void {
    this.directoryCache.clear();
  }

  static initializeProjectExplorer() {
    return new Promise<void>( (resolve, reject) => {
      TabProjectExplorerState.GenerateResourceList( ForgeState.projectExplorerTab ).then( (resourceList) => {
        ForgeState.loaderHide();
        resolve();
      });
    });
  }

  static async openEditorFile(resource: string): Promise<EditorFile> {
    return new EditorFile({
      path: EditorFile.referenceURIForProjectRelative(resource),
      useProjectFileSystem: true,
    });
  }

  // Override mkdir to use project directory
  static async mkdir(dirPath: string, opts: IGameFileSystemReadDirOptions = {}): Promise<boolean> {
    return new Promise<boolean>( async (resolve, reject) => {
      dirPath = dirPath.trim();
      if(this.useHandleBackend()){
        if(dirPath.length){
          const dirs = splitHandlePathSegments(dirPath);
          const cacheKey = dirs.join('/');
          if(this.directoryCache.has(cacheKey)){
            resolve(true);
            return;
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
            if(!isMemoryDirectoryHandle(this.rootDirectoryHandle)){
              await spleep(100);
            }
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
      }else{
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
      }
    });
  }

  // Override readFile to use project directory
  static async readFile(filepath: string, options: any = {}): Promise<Uint8Array> {
    if(this.useHandleBackend()){
      const file = await this.open(filepath);
      if(!file) throw new Error('Failed to read file');
      
      let handle = await file.getFile();
      return new Uint8Array( await handle.arrayBuffer() );
    }
    if(!this.rootDirectoryPath){
      throw new Error('Project root directory not set');
    }
    return new Promise<Uint8Array>( (resolve, reject) => {
      fs.readFile(path.join(this.rootDirectoryPath, filepath), options, (err, buffer) => {
        if(err){
          reject(err);
          return;
        }
        resolve(new Uint8Array(buffer));
      })
    });
  }

  // Override writeFile to use project directory
  static async writeFile(filepath: string, data: Uint8Array): Promise<boolean> {
    return new Promise<boolean>( async (resolve, reject) => {
      if(this.useHandleBackend()){
        filepath = this.normalizePathProject(filepath);
        const parts = splitHandlePathSegments(filepath);
        const filename = parts.pop();
        if(!filename){
          resolve(false);
          return;
        }
        if(parts.length){
          await this.mkdir(parts.join("/"), { recursive: true });
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
      }else{
        if(!this.rootDirectoryPath){
          resolve(false);
          return;
        }
        fs.writeFile(path.join(this.rootDirectoryPath, filepath), data, (err) => {
          resolve(!err);
        })
      }
    });
  }

  // Override readdir to use project directory
  static async readdir(
    dirpath: string, options: IGameFileSystemReadDirOptions = {}, files: any[] = []
  ): Promise<string[]> {
    if(this.useHandleBackend()){
      return await this.readdir_web_project(dirpath, options, files);
    }
    return await this.readdir_fs_project(dirpath, options, files);
  }

  // Override exists to use project directory
  static exists(dirOrFilePath: string): Promise<boolean> {
    return new Promise<boolean>( async (resolve, reject) => {
      if(!this.useHandleBackend()){
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
        }catch(e: any){
          if(e?.name !== 'NotFoundError'){
            console.log(dirOrFilePath);
            console.error(e);
          }
          resolve(false);
          return;
        }
      }
    });
  }

  // Override open to use project directory
  static async open(filepath: string, mode: 'r'|'w' = 'r'): Promise<any> {
    if(this.useHandleBackend()){
      filepath = this.normalizePathProject(filepath);
      const filename = splitHandlePathSegments(filepath).pop();
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
      const dirs = splitHandlePathSegments(filepath);
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
      const dirs = splitHandlePathSegments(filepath);
      dirs.pop();
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
                      if(!!opts.include_dirs){
                        files.push(file_path);
                      }
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
        const dirPathNorm = normalizeWebProjectRelativeDir(String(pathOrHandle as string));
        dirHandle = await this.resolvePathDirectoryHandleProject(dirPathNorm);
        if(!dirHandle) throw new Error('Failed to locate directory inside project folder: '+dirPathNorm);
        // Paths must be relative to project root — not dirHandle.name (that repeats the picked folder segment).
        dirbase = dirPathNorm;
      } else {
        dirHandle = pathOrHandle;
      }

      if(isProjectDirectoryHandle(dirHandle)){
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
            const rel = posixJoinRel(dirbase, entry.name);
            if (!opts.recursive || opts.include_dirs || opts.list_dirs) {
              files.push(rel);
            }
            if (opts.recursive) {
              directoryEntries.push(entry);
            }
          }
        }

        for (const fileName of fileEntries) {
          files.push(posixJoinRel(dirbase, fileName));
        }

        if (opts.recursive && directoryEntries.length > 0) {
          const subdirPromises = directoryEntries.map(async (entry) => {
            const newdirbase = posixJoinRel(dirbase, entry.name);
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

  static async copyToDirectory(dest: { path?: string; handle?: FileSystemDirectoryHandle }): Promise<boolean> {
    if(!this.hasRoot()){
      return false;
    }
    if(!dest?.path && !isProjectDirectoryHandle(dest?.handle)){
      return false;
    }
    let files: string[] = [];
    try{
      files = await this.readdir("", { recursive: true });
    }catch(e){
      console.error(e);
      return false;
    }
    for(let i = 0; i < files.length; i++){
      const rel = normalizeWebProjectRelativeDir(String(files[i] || ""));
      if(!rel.length){
        continue;
      }
      let data: Uint8Array;
      try{
        data = await this.readFile(rel);
      }catch(e){
        console.error(e);
        return false;
      }
      const written = await this.writeFileToDest(dest, rel, data);
      if(!written){
        return false;
      }
    }
    return true;
  }

  private static async writeFileToDest(
    dest: { path?: string; handle?: FileSystemDirectoryHandle },
    rel: string,
    data: Uint8Array
  ): Promise<boolean> {
    const posix = normalizeWebProjectRelativeDir(rel);
    const parts = posix.split("/").filter(Boolean);
    const filename = parts.pop();
    if(!filename){
      return false;
    }
    if(isProjectDirectoryHandle(dest.handle)){
      try{
        let dir = dest.handle;
        for(let i = 0; i < parts.length; i++){
          dir = await dir.getDirectoryHandle(parts[i], { create: true });
        }
        const file = await dir.getFileHandle(filename, { create: true });
        const stream = await file.createWritable();
        await stream.write(data as any);
        await stream.close();
        return true;
      }catch(e){
        console.error(e);
        return false;
      }
    }
    if(dest.path){
      const full = path.join(dest.path, ...parts, filename);
      return new Promise<boolean>((resolve) => {
        fs.mkdir(path.dirname(full), { recursive: true }, (err) => {
          if(err){
            console.error(err);
            resolve(false);
            return;
          }
          fs.writeFile(full, data, (writeErr) => {
            if(writeErr){
              console.error(writeErr);
              resolve(false);
              return;
            }
            resolve(true);
          });
        });
      });
    }
    return false;
  }

  static async isDirectory(relPath: string): Promise<boolean> {
    const rel = normalizeWebProjectRelativeDir(relPath);
    if(!rel.length){
      return this.hasRoot();
    }
    if(this.useHandleBackend()){
      try{
        const handle = await this.resolvePathDirectoryHandleProject(rel);
        return !!handle;
      }catch{
        return false;
      }
    }
    try{
      return await this.isFSDirectoryProject(rel);
    }catch{
      return false;
    }
  }

  static async unlink(relPath: string): Promise<boolean> {
    const rel = normalizeWebProjectRelativeDir(relPath);
    if(!rel.length){
      return false;
    }
    if(this.useHandleBackend()){
      try{
        const parts = splitHandlePathSegments(rel);
        const name = parts.pop();
        if(!name){
          return false;
        }
        const parent = parts.length
          ? await this.resolvePathDirectoryHandleProject(parts.join("/"))
          : this.rootDirectoryHandle;
        if(!parent){
          return false;
        }
        await parent.removeEntry(name);
        this.clearDirectoryCache();
        return true;
      }catch(e){
        console.error(e);
        return false;
      }
    }
    if(!this.rootDirectoryPath){
      return false;
    }
    return new Promise<boolean>((resolve) => {
      fs.unlink(path.join(this.rootDirectoryPath, rel), (err) => {
        if(err){
          console.error(err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  static async rmdir(relPath: string, opts: IGameFileSystemReadDirOptions = {}): Promise<boolean> {
    const rel = normalizeWebProjectRelativeDir(relPath);
    if(!rel.length){
      return false;
    }
    if(this.useHandleBackend()){
      try{
        const parts = splitHandlePathSegments(rel);
        const name = parts.pop();
        if(!name){
          return false;
        }
        const parent = parts.length
          ? await this.resolvePathDirectoryHandleProject(parts.join("/"))
          : this.rootDirectoryHandle;
        if(!parent){
          return false;
        }
        await parent.removeEntry(name, { recursive: !!opts.recursive });
        this.clearDirectoryCache();
        return true;
      }catch(e){
        console.error(e);
        return false;
      }
    }
    if(!this.rootDirectoryPath){
      return false;
    }
    return new Promise<boolean>((resolve) => {
      fs.rmdir(path.join(this.rootDirectoryPath, rel), { recursive: !!opts.recursive } as fs.RmDirOptions, (err) => {
        if(err){
          console.error(err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  static async rename(fromRel: string, toRel: string): Promise<boolean> {
    const from = normalizeWebProjectRelativeDir(fromRel);
    const to = normalizeWebProjectRelativeDir(toRel);
    if(!from.length || !to.length || from.toLowerCase() === to.toLowerCase()){
      return false;
    }
    if(await this.exists(to)){
      return false;
    }
    if(!this.useHandleBackend()){
      if(!this.rootDirectoryPath){
        return false;
      }
      return new Promise<boolean>((resolve) => {
        const destFull = path.join(this.rootDirectoryPath, to);
        fs.mkdir(path.dirname(destFull), { recursive: true }, (mkdirErr) => {
          if(mkdirErr){
            console.error(mkdirErr);
            resolve(false);
            return;
          }
          fs.rename(path.join(this.rootDirectoryPath, from), destFull, (err) => {
            if(err){
              console.error(err);
              resolve(false);
              return;
            }
            resolve(true);
          });
        });
      });
    }
    const asDir = await this.isDirectory(from);
    if(asDir){
      const made = await this.mkdir(to, { recursive: true });
      if(!made && !(await this.exists(to))){
        return false;
      }
      let files: string[] = [];
      let dirs: string[] = [];
      try{
        files = await this.readdir(from, { recursive: true });
        dirs = await this.readdir(from, { recursive: true, list_dirs: true });
      }catch(e){
        console.error(e);
        return false;
      }
      for(let i = 0; i < dirs.length; i++){
        const srcDir = normalizeWebProjectRelativeDir(String(dirs[i] || ""));
        if(!srcDir.length){
          continue;
        }
        const suffix = srcDir === from ? "" : (srcDir.toLowerCase().startsWith(from.toLowerCase() + "/") ? srcDir.slice(from.length + 1) : srcDir);
        const destDir = suffix ? `${to}/${suffix}` : to;
        await this.mkdir(destDir, { recursive: true });
      }
      for(let i = 0; i < files.length; i++){
        const srcFile = normalizeWebProjectRelativeDir(String(files[i] || ""));
        if(!srcFile.length){
          continue;
        }
        const suffix = srcFile.toLowerCase().startsWith(from.toLowerCase() + "/") ? srcFile.slice(from.length + 1) : srcFile;
        const destFile = suffix ? `${to}/${suffix}` : `${to}/${srcFile.split("/").pop()}`;
        const parentDir = destFile.split("/").slice(0, -1).join("/");
        if(parentDir){
          await this.mkdir(parentDir, { recursive: true });
        }
        try{
          const data = await this.readFile(srcFile);
          const written = await this.writeFile(destFile, data);
          if(!written){
            return false;
          }
        }catch(e){
          console.error(e);
          return false;
        }
      }
      return this.rmdir(from, { recursive: true });
    }
    const parentDir = to.split("/").slice(0, -1).join("/");
    if(parentDir){
      await this.mkdir(parentDir, { recursive: true });
    }
    try{
      const data = await this.readFile(from);
      const written = await this.writeFile(to, data);
      if(!written){
        return false;
      }
      return this.unlink(from);
    }catch(e){
      console.error(e);
      return false;
    }
  }

}
