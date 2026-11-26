import * as path from "path";
import * as fs from "fs";
import { ApplicationProfile } from "@core/utility/ApplicationProfile";
import { ApplicationEnvironment } from "@core/enums/ApplicationEnvironment";
import { IGameFileSystemReadDirOptions } from "@core/interface/filesystem/IGameFileSystemReadDirOptions";
import { isUsableDirectoryHandle } from "@core/filesystem/gameDirectoryAccess";
declare const dialog: any;

const webHandleHasRemove =
  typeof FileSystemFileHandle !== "undefined" &&
  typeof (FileSystemFileHandle.prototype as { remove?: unknown }).remove === "function";

const spleep = (time: number = 0) => {
  return new Promise( (resolve, reject) => {
    setTimeout(resolve, time);
  });
}

/**
 * GameFileSystem class.
 * 
 * Handles file system access for the application.
 * It will use either the File System Access API or the fs module built into node
 * depending on the ENVIRONMENT (BROWSER|ELECTRON) the app was loaded under.
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

  private static normalizePath(filepath: string){
    filepath = String(filepath ?? '').trim();
    filepath = filepath.replace(/\\/g, '/');
    filepath = filepath.replace(/^file:\/\//i, '');
    filepath = filepath.replace(/^game\.dir\/?/i, '');
    filepath = filepath.replace(/^\/+/, '').replace(/\/+$/, '');
    return filepath;
  }

  private static decodePathSegment(segment: string): string {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }

  private static splitRelativePath(filepath: string): string[] {
    return this.normalizePath(filepath).split('/').filter(Boolean).map((part) => this.decodePathSegment(part));
  }

  private static getRootDirectoryHandle(): FileSystemDirectoryHandle | undefined {
    const candidates = [
      ApplicationProfile.directoryHandle,
      ApplicationProfile.profile?.directory_handle,
    ];
    for(let i = 0; i < candidates.length; i++){
      if(isUsableDirectoryHandle(candidates[i])){
        return candidates[i];
      }
    }
    return undefined;
  }

  //filepath should be relative to the rootDirectoryPath or ApplicationProfile.directory
  static async open(filepath: string, mode: 'r'|'w' = 'r'): Promise<any> {
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<number>( (resolve, reject) => {
        fs.open(path.join(ApplicationProfile.directory, filepath), (err, fd) => {
          if(err){
            console.error(err);
            reject(err);
            return;
          }
          resolve(fd);
        });
      });
    }else{
      // console.log('open', filepath);
      filepath = this.normalizePath(filepath);
      const dirs = filepath.split('/');
      const filename = dirs.pop();
      const dirHandle = await this.resolveFilePathDirectoryHandle(filepath);
      if(dirHandle){
        try {
          const file = await dirHandle.getFileHandle(filename, {
            create: false
          });
          if(file){
            return file;
          }
        } catch {
          // Fall through to a case-insensitive scan (File System Access API is case-sensitive).
        }
        const want = String(filename || '').toLowerCase();
        if(GameFileSystem.browserReadCaching){
          const index = await GameFileSystem.getDirectoryFileIndex(dirHandle);
          const actual = index.get(want);
          if(actual){
            return await dirHandle.getFileHandle(actual, { create: false });
          }
          throw new Error('Failed to read file: ' + filepath);
        }
        for await (const entry of dirHandle.values()){
          if(entry.kind === 'file' && entry.name.toLowerCase() === want){
            return await dirHandle.getFileHandle(entry.name, { create: false });
          }
        }
        throw new Error('Failed to read file: ' + filepath);
      }else{
        throw new Error('Failed to locate file directory: ' + filepath);
      }
    }
  }

  static async read(handle: FileSystemFileHandle|number, output: Uint8Array, offset: number, length: number, position: number){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<Uint8Array>( (resolve, reject) => {
        fs.read(handle as number, output, offset, length, position, (err, bytes, buffer) => {
          if(err) reject(err);
          output.set(new Uint8Array(buffer), offset);
          resolve(output);
        })
      });
    }else{
      if(!(handle)) throw new Error('No file handle supplied!');
      
      if(!(handle instanceof FileSystemFileHandle)) throw new Error('FileSystemFileHandle expected but one was not supplied!');
      
      if(!(output instanceof Uint8Array)) throw new Error('No output buffer supplied!');

      let file = GameFileSystem.fileSnapshotCache.get(handle);
      if(!file){
        file = await handle.getFile();
        if(file){
          GameFileSystem.fileSnapshotCache.set(handle, file);
        }
      }
      if(!file) throw new Error('Failed to read file from handle!');

      if(GameFileSystem.browserReadCaching){
        const bytes = await GameFileSystem.getCachedArchiveBytes(handle, file);
        if(bytes){
          output.set(bytes.subarray(position, position + length), offset);
          return;
        }
      }

      let blob = file.slice(position, position + length);
      let arrayBuffer = await blob.arrayBuffer();
      output.set(new Uint8Array(arrayBuffer), offset);
    }
  }

  static async close(handle: FileSystemFileHandle|number){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<void>( (resolve, reject) => {
        fs.close(handle as number, () => {
          resolve();
        })
      });
    }else{
      //this api does not expose a close method for reads
      return;
    }
  }

  //filepath should be relative to the rootDirectoryPath or ApplicationProfile.directory
  static async readFile(filepath: string, options: any = {}): Promise<Uint8Array> {
    // console.log('readFile', filepath);
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<Uint8Array>( (resolve, reject) => {
        fs.readFile(path.join(ApplicationProfile.directory, filepath), options, (err, buffer) => {
          if(err){
            reject(err);
            return;
          }
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

  //filepath should be relative to the rootDirectoryPath or ApplicationProfile.directory
  static async writeFile(filepath: string, data: Uint8Array): Promise<boolean> {
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<boolean>((resolve) => {
        fs.writeFile(path.join(ApplicationProfile.directory, filepath), data, (err) => {
          resolve(!err);
        });
      });
    }

    try {
      filepath = this.normalizePath(filepath);
      const parts = this.splitRelativePath(filepath);
      const filename = parts.pop();
      if(!filename){
        console.error('GameFileSystem.writeFile: missing filename', filepath);
        return false;
      }

      const root = this.getRootDirectoryHandle();
      if(!root){
        console.error('GameFileSystem.writeFile: no game directory handle');
        return false;
      }

      const granted = await this.validateDirectoryHandle(root);
      if(!granted){
        console.error('GameFileSystem.writeFile: write permission denied');
        return false;
      }

      const dirHandle = await this.resolveFilePathDirectoryHandle(filepath);
      if(!dirHandle){
        console.error('GameFileSystem.writeFile: failed to locate directory', filepath);
        return false;
      }

      let fileHandle: FileSystemFileHandle;
      try {
        fileHandle = await dirHandle.getFileHandle(filename, { create: true });
      } catch {
        let found: FileSystemFileHandle | undefined;
        const want = filename.toLowerCase();
        for await (const entry of dirHandle.values()){
          if(entry.kind === 'file' && entry.name.toLowerCase() === want){
            found = await dirHandle.getFileHandle(entry.name, { create: false });
            break;
          }
        }
        if(!found){
          console.error('GameFileSystem.writeFile: failed to create file', filepath);
          return false;
        }
        fileHandle = found;
      }

      GameFileSystem.invalidateReadCaches();
      const stream = await fileHandle.createWritable();
      await stream.write(data as any);
      await stream.close();
      GameFileSystem.invalidateReadCaches();
      return true;
    } catch(e) {
      console.error('GameFileSystem.writeFile', filepath, e);
      return false;
    }
  }

  static async readdir(
    dirpath: string, options: IGameFileSystemReadDirOptions = {}, files: any[] = []
  ): Promise<string[]> {
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return await this.readdir_fs(dirpath, options, files);
    }else{
      return await this.readdir_web(dirpath, options, files);
    }
  }

  private static async readdir_web(pathOrHandle: string|FileSystemDirectoryHandle = '', opts: any = {},  files: any[] = [], dirbase: string = ''){
    try{
      if(typeof pathOrHandle === 'string'){
        const dirPath = this.normalizePath(pathOrHandle as string);
        pathOrHandle = await this.resolvePathDirectoryHandle(pathOrHandle);
        if(!pathOrHandle) throw new Error('Failed to locate directory inside game folder: '+dirPath);
        // Paths must stay relative to the game root. Handle.name is only the last segment
        // (e.g. "000001 - AUTOSAVE"), which would make nested reads miss Saves/.
        dirbase = dirPath;
      }

      if(isUsableDirectoryHandle(pathOrHandle)){
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

    }catch(e){
      console.error(e);
      if(typeof pathOrHandle === 'string'){
        throw new Error('Failed to resolve directory inside game folder: '+pathOrHandle);
      }else{
        throw new Error('Failed to resolve directory inside game folder: '+pathOrHandle.name);
      }
    }
  }

  private static async isFSDirectory(resource_path: string = ''): Promise<boolean> {
    return new Promise<boolean>( (resolve, reject) => {
      fs.stat(path.join(ApplicationProfile.directory, resource_path), (err, stats) => {
        if(err){
          console.error(err);
          reject();
          return;
        }
        resolve((stats.mode & fs.constants.S_IFDIR) == fs.constants.S_IFDIR)
      })
    });
  }

  private static async readdir_fs(resource_path: string = '', opts: IGameFileSystemReadDirOptions = {}, files: any[] = [], depthState?: any): Promise<string[]> {
    if(typeof depthState === 'undefined'){
      depthState = { folder: resource_path, depth: 0 };
    }
    const currentDepth: number = depthState.depth;
    const dir_path = path.join(ApplicationProfile.directory, resource_path);

    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(dir_path, { withFileTypes: true }, async (err, dir_files: fs.Dirent[]) => {
        if(err){
          // resource_path is a file, not a directory
          if(!opts.list_dirs){
            files.push(resource_path);
          }
          resolve(files);
          return;
        }

        if(!!opts.list_dirs && currentDepth > 0){
          files.push(resource_path);
        }

        if(currentDepth < 1 || !!opts.recursive){
          const subdirPromises: Promise<string[]>[] = [];
          for(const file of dir_files){
            const file_path = path.join(resource_path, file.name);
            if(file.isDirectory()){
              if(!!opts.recursive){
                const subFiles: string[] = [];
                subdirPromises.push(
                  this.readdir_fs(file_path, opts, subFiles, { ...depthState, depth: currentDepth + 1 })
                );
              }else{
                files.push(file_path);
              }
            }else{
              if(!opts.list_dirs){
                files.push(file_path);
              }
            }
          }
          const subResults = await Promise.all(subdirPromises);
          for(const subFiles of subResults) files.push(...subFiles);
        }

        resolve(files);
      });
    });
  }

  static async mkdir(dirPath: string, opts: IGameFileSystemReadDirOptions = {}){
    return new Promise<boolean>( async (resolve, reject) => {
      dirPath = dirPath.trim();
      if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        fs.mkdir(path.join(ApplicationProfile.directory, dirPath), { recursive: !!opts.recursive }, (err) => {
          if(err){
            console.error(err);
            resolve(false);
            return;
          }
          resolve(true);
        });
      }else{
        if(dirPath.length){
          const dirs = dirPath.split(path.sep);
          const cacheKey = dirs.join('/');
          if(this.directoryCache.has(cacheKey)){
            resolve(true);
            return;
          }
          try{
            let currentDirHandle = ApplicationProfile.directoryHandle;
            for(let i = 0; i < dirs.length; i++){
              const canCreate = (i === dirs.length - 1) || !!opts.recursive;
              currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i], { create: canCreate });
              if(!currentDirHandle){
                resolve(false);
                return;
              }
              const partialKey = dirs.slice(0, i + 1).join('/');
              this.directoryCache.set(partialKey, currentDirHandle);
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
      }
    });
  }

  static async rmdir(dirPath: string, opts: IGameFileSystemReadDirOptions = {}){
    return new Promise<boolean>( async (resolve, reject) => {
      dirPath = dirPath.trim();
      if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        console.log(`fs.rmdir`, path.join(ApplicationProfile.directory, dirPath));
        fs.rmdir(
          path.join(ApplicationProfile.directory, dirPath), 
          {
            recursive: opts.recursive
          } as fs.RmDirOptions, 
          //@ts-ignore
          async (err) => {
            if(err){
              console.error(err);
              resolve(false);
              return;
            }
            resolve(true);
          }
        );
      }else{
        try{
          const details = path.parse(dirPath);
          // let handle = await this.resolvePathDirectoryHandle(dirPath);
          GameFileSystem.invalidateReadCaches();
          let parentHandle = await this.resolvePathDirectoryHandle(details.dir);
          if(parentHandle == ApplicationProfile.directoryHandle) resolve(false);
          if(parentHandle){
            for await (const entry of parentHandle.values()) {
              if(entry.kind == 'file') continue;
              if(entry.name.toLowerCase() != details.name.toLowerCase()) continue;
              await parentHandle.removeEntry(entry.name, {
                recursive: opts.recursive
              });
              break;
            }
          }
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

  static async opendir_web(dirPath: string = ''): Promise<FileSystemDirectoryHandle|undefined> {
    try{
      return await this.resolvePathDirectoryHandle(dirPath);
    }catch{
      return undefined;
    }
  }

  static exists(dirOrFilePath: string): Promise<boolean> {
    return new Promise<boolean>( async (resolve, reject) => {
      if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        fs.stat(path.join(ApplicationProfile.directory, dirOrFilePath), (err, stats) => {
          if(err){
            console.log(dirOrFilePath);
            console.error(err);
            resolve(false);
            return
          }

          resolve(true);
        });
      }else{
        const details = path.parse(dirOrFilePath);
        try{
          if(details.ext){
            let handle = await this.resolveFilePathDirectoryHandle(dirOrFilePath);
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
            let handle = await this.resolvePathDirectoryHandle(dirOrFilePath);
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

  static async unlink(handleOrPath: string|FileSystemFileHandle){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<void>( (resolve, reject) => {
        try{
          fs.unlink(handleOrPath as string, () => {
            resolve();
            return;
          })
        }catch(e){
          console.error(e);
          reject(e);
          return;
        }
      })
    }else{
      GameFileSystem.invalidateReadCaches();
      if(handleOrPath instanceof FileSystemFileHandle && webHandleHasRemove){
        //@ts-ignore
        await handleOrPath.remove();
        return;
      }
      if(typeof handleOrPath === 'string'){
        const normalized = this.normalizePath(handleOrPath);
        const details = path.parse(normalized);
        const parentHandle = await this.resolveFilePathDirectoryHandle(normalized);
        if(parentHandle) await parentHandle.removeEntry(details.base);
      }else{
        throw new Error('unlink: supply a path string in web mode, not a FileSystemFileHandle');
      }
    }
  }

  static async showOpenFileDialog(){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){

    }else{
      // const pickerOpts = {
      // types: [
      // {
      // description: 'Images',
      // accept: {
      // 'image/*': ['.png', '.gif', '.jpeg', '.jpg']
      // }
      // },
      // ],
      // excludeAcceptAllOption: true,
      // multiple: false
      // };
      let [fileHandle] = await window.showOpenFilePicker({multiple: false});
      return fileHandle;
    }
  }

  static async showSaveFileDialog(): Promise<FileSystemFileHandle | undefined> {
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return undefined;
    }else{
      return await window.showSaveFilePicker({});
    }
  }

  private static async resolvePathDirectoryHandle(filepath: string, parent = false): Promise<FileSystemDirectoryHandle> {
    const root = this.getRootDirectoryHandle();
    if(root){
      const dirs = this.splitRelativePath(filepath);
      const cacheKey = dirs.join('/');
      if(this.directoryCache.has(cacheKey)){
        const cached = this.directoryCache.get(cacheKey)!;
        if(!parent) return cached;
        // for parent=true we need the second-to-last handle; fall through to traverse
      }
      if(!parent && this.directoryInflight.has(cacheKey)){
        return this.directoryInflight.get(cacheKey)!;
      }
      const promise = (async () => {
        let lastDirectoryHandle = root;
        let currentDirHandle = root;
        for(let i = 0, len = dirs.length; i < len; i++){
          lastDirectoryHandle = currentDirHandle;
          const partialKey = dirs.slice(0, i + 1).join('/');
          if(this.directoryCache.has(partialKey)){
            currentDirHandle = this.directoryCache.get(partialKey)!;
            continue;
          }
          try{
            currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i], { create: false });
          }catch{
            // Fallback: case-insensitive scan for case-sensitive FSAPI
            let found = false;
            for await (const entry of currentDirHandle.values()){
              if(entry.kind === 'directory' && entry.name.toLowerCase() === dirs[i].toLowerCase()){
                currentDirHandle = entry as FileSystemDirectoryHandle;
                found = true;
                break;
              }
            }
            if(!found){
              this.directoryInflight.delete(cacheKey);
              throw new Error(`Failed to resolve file path directory handle: Filepath: ${filepath} | Current Directory: ${dirs[i]} | Index: ${i}`);
            }
          }
          this.directoryCache.set(partialKey, currentDirHandle);
        }
        this.directoryCache.set(cacheKey, currentDirHandle);
        this.directoryInflight.delete(cacheKey);
        return !parent ? currentDirHandle : lastDirectoryHandle;
      })();
      if(!parent){
        this.directoryInflight.set(cacheKey, promise);
      }
      return promise;
    }
    return;
  }

  static directoryCache: Map<string, FileSystemDirectoryHandle> = new Map();
  static directoryInflight: Map<string, Promise<FileSystemDirectoryHandle>> = new Map();
  private static fileSnapshotCache = new WeakMap<FileSystemFileHandle, File>();

  /**
   * Browser-only read caches for the game runtime: whole-file buffers for small
   * archives (one blob read instead of one per resource) and per-directory
   * lower-case name indexes for case-insensitive opens (including misses).
   * Off by default because tools such as Forge write game files through their own
   * handles, which these caches would not see. Electron never uses them.
   */
  static browserReadCaching = false;
  static archiveCacheMaxFileBytes = 48 * 1024 * 1024;
  static archiveCacheBudgetBytes = 128 * 1024 * 1024;
  private static archiveBufferCache = new Map<FileSystemFileHandle, { size: number; bytes: Promise<Uint8Array> }>();
  private static archiveCacheBytes = 0;
  private static directoryFileIndex = new WeakMap<FileSystemDirectoryHandle, Promise<Map<string, string>>>();

  /** Drop read caches after anything in the game directory changes. */
  static invalidateReadCaches(): void {
    GameFileSystem.archiveBufferCache.clear();
    GameFileSystem.archiveCacheBytes = 0;
    GameFileSystem.directoryFileIndex = new WeakMap();
    GameFileSystem.fileSnapshotCache = new WeakMap();
  }

  /** Small module / save archives; BIFs and texture packs are read sparsely. */
  static isCacheableArchive(name: string, size: number): boolean {
    if(!(size > 0) || size > GameFileSystem.archiveCacheMaxFileBytes){ return false; }
    const lower = String(name || '').toLowerCase();
    if(lower.startsWith('swpc_tex_')){ return false; }
    return /\.(rim|erf|mod|sav|hak)$/.test(lower);
  }

  private static async getCachedArchiveBytes(handle: FileSystemFileHandle, file: File): Promise<Uint8Array | undefined> {
    const cache = GameFileSystem.archiveBufferCache;
    let entry = cache.get(handle);
    if(entry){
      // Most recently used goes last.
      cache.delete(handle);
      cache.set(handle, entry);
    }else{
      if(!GameFileSystem.isCacheableArchive(handle.name, file.size)){ return undefined; }
      const created = { size: file.size, bytes: file.arrayBuffer().then((ab) => new Uint8Array(ab)) };
      entry = created;
      cache.set(handle, created);
      GameFileSystem.archiveCacheBytes += created.size;
      created.bytes.catch(() => {
        if(cache.get(handle) === created){
          cache.delete(handle);
          GameFileSystem.archiveCacheBytes -= created.size;
        }
      });
      for(const [key, value] of cache){
        if(GameFileSystem.archiveCacheBytes <= GameFileSystem.archiveCacheBudgetBytes || key === handle){ break; }
        cache.delete(key);
        GameFileSystem.archiveCacheBytes -= value.size;
      }
    }
    try{
      return await entry.bytes;
    }catch{
      return undefined;
    }
  }

  private static getDirectoryFileIndex(dirHandle: FileSystemDirectoryHandle): Promise<Map<string, string>> {
    let pending = GameFileSystem.directoryFileIndex.get(dirHandle);
    if(!pending){
      const indexes = GameFileSystem.directoryFileIndex;
      pending = (async () => {
        const index = new Map<string, string>();
        for await (const entry of dirHandle.values()){
          if(entry.kind !== 'file'){ continue; }
          const lower = entry.name.toLowerCase();
          if(!index.has(lower)){ index.set(lower, entry.name); }
        }
        return index;
      })();
      pending.catch(() => {
        if(indexes.get(dirHandle) === pending){ indexes.delete(dirHandle); }
      });
      indexes.set(dirHandle, pending);
    }
    return pending;
  }

  private static async resolveFilePathDirectoryHandle(filepath: string): Promise<FileSystemDirectoryHandle> {
    const root = this.getRootDirectoryHandle();
    if(root){
      const dirs = this.splitRelativePath(filepath);
      dirs.pop(); // remove filename
      const cacheKey = dirs.join('/');
      if(this.directoryCache.has(cacheKey)){
        return this.directoryCache.get(cacheKey)!;
      }
      if(this.directoryInflight.has(cacheKey)){
        return this.directoryInflight.get(cacheKey)!;
      }
      const promise = (async () => {
        let currentDirHandle = root;
        for(let i = 0, len = dirs.length; i < len; i++){
          const partialKey = dirs.slice(0, i + 1).join('/');
          if(this.directoryCache.has(partialKey)){
            currentDirHandle = this.directoryCache.get(partialKey)!;
            continue;
          }
          try{
            currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i], { create: false });
          }catch{
            // Fallback: case-insensitive scan for case-sensitive FSAPI
            let found = false;
            for await (const entry of currentDirHandle.values()){
              if(entry.kind === 'directory' && entry.name.toLowerCase() === dirs[i].toLowerCase()){
                currentDirHandle = entry as FileSystemDirectoryHandle;
                found = true;
                break;
              }
            }
            if(!found){
              this.directoryInflight.delete(cacheKey);
              throw new Error(`Failed to resolve file path directory handle: Filepath: ${filepath} | Current Directory: ${dirs[i]} | Index: ${i}`);
            }
          }
          this.directoryCache.set(partialKey, currentDirHandle);
        }
        this.directoryCache.set(cacheKey, currentDirHandle);
        this.directoryInflight.delete(cacheKey);
        return currentDirHandle;
      })();
      this.directoryInflight.set(cacheKey, promise);
      return promise;
    }
    return;
  }

  static async initializeGameDirectory(){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      ApplicationProfile.directory = ApplicationProfile.directory;
    }else{
      ApplicationProfile.directoryHandle = await window.showDirectoryPicker({
        mode: "readwrite"
      });
    }
  }

  static async validateDirectoryHandle(handle: FileSystemDirectoryHandle){
    try{
      if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') {
        return true;
      }
      return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
    }catch(e){
      console.error(e);
      return false;
    }
  }

  static async showRequestDirectoryDialog(){
    let handle = await window.showDirectoryPicker({
      id: ApplicationProfile.profile?.key,
      mode: "readwrite"
    });
    if(handle){
      if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
        return handle;
      }
    }
    return;
  }


}
