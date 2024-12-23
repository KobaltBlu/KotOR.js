import * as path from "path";
import * as fs from "fs";
import { ApplicationProfile } from "./ApplicationProfile";
import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { IGameFileSystemReadDirOptions } from "../interface/filesystem/IGameFileSystemReadDirOptions";

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

  private static normalizePath(filepath: string){
    filepath = filepath.trim();
    filepath.replace(/^\/+/, '').replace(/\/+$/, '');
    filepath.replace(/^\\+/, '').replace(/\\+$/, '');
    return filepath;
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

      const file = await handle.getFile();
      if(!file) throw new Error('Failed to read file from handle!');

      let blob = await file.slice(position, position + length);
      let arrayBuffer = await blob.arrayBuffer();
      output.set(new Uint8Array(arrayBuffer), offset);
      // output.copy(new Uint8Array(arrayBuffer));
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

  //filepath should be relative to the rootDirectoryPath or ApplicationProfile.directory
  static async writeFile(filepath: string, data: Uint8Array): Promise<boolean> {
    return new Promise<boolean>( async (resolve, reject) => {
      if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        fs.writeFile(path.join(ApplicationProfile.directory, filepath), data, (err) => {
          resolve(!err);
        })
      }else{
        filepath = this.normalizePath(filepath);
        const dirs = filepath.split('/');
        const filename = dirs.pop();
        const dirHandle = await this.resolveFilePathDirectoryHandle(filepath);
        
        if(!dirHandle) throw new Error('Failed to locate file directory');
        
        const newFile = await dirHandle.getFileHandle(filename, {
          create: true
        });

        if(!newFile) throw new Error('Failed to create file');

        try{
          let stream = await newFile.createWritable();
          await stream.write(data);
          await stream.close();
          resolve(true);
          return;
        }catch(e){
          console.error(e);
          resolve(false);
          return;
          // throw new Error('Failed to write file');
        }
      }
    });
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
        const dirPath = pathOrHandle as string;
        pathOrHandle = await this.resolvePathDirectoryHandle(pathOrHandle);
        if(!pathOrHandle) throw new Error('Failed to locate directory inside game folder: '+dirPath);
        dirbase = pathOrHandle.name;
      }

      if(pathOrHandle instanceof FileSystemDirectoryHandle){
        for await (const entry of pathOrHandle.values()) {
          if (entry.kind === "file"){
            if(!opts.list_dirs){
              files.push(path.join(dirbase, entry.name));
            }else{
              //don't push a file when we are only listing directories
            }
          }
          if (entry.kind === "directory"){
            let newdirbase = path.join(dirbase, entry.name);
            // if(!dirbase) dirbase = 
            // files.push(entry.name);
            if(opts.recursive){
              await this.readdir_web(entry, opts, files, newdirbase);
            }else{
              files.push(path.join(dirbase, entry.name));
            }
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

  private static async readdir_fs(resource_path: string = '', opts: IGameFileSystemReadDirOptions = {},  files: any[] = [], depthState?: any) {
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
        let dir_path = path.join(ApplicationProfile.directory, resource_path);
        
        if(!(await this.isFSDirectory(resource_path))){
          if(!opts.list_dirs){
            files.push(resource_path);
          }
          resolve(files);
          return;
        }else{
          if((depthState.depth < 1) || !!opts.recursive ){
            // let dir_base = path.join(ApplicationProfile.directory, resource_path);
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
                is_dir = (await this.isFSDirectory(file_path));
                try{
                  if(!!is_dir){
                    if(!!opts.recursive){
                      await this.readdir_fs(file_path, opts, files, depthState);
                    }else{
                      files.push(path.join(file_path));
                    }
                  }else{
                    if(!opts.list_dirs){
                      files.push(path.join(file_path));
                    }else{
                      //don't push a file when we are only listing directories
                    }
                  }
                }catch(e){
                  console.error(e);
                  // reject(e);
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

  static async mkdir(dirPath: string, opts: IGameFileSystemReadDirOptions = {}){
    return new Promise<boolean>( async (resolve, reject) => {
      dirPath = dirPath.trim();
      if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        fs.mkdir(path.join(ApplicationProfile.directory, dirPath), { recursive: !!opts.recursive }, async (err) => {
          if(err){
            console.error(err);
            resolve(false)
            return;
          }
          await spleep(100);
          resolve(true)
          return;
        });
      }else{
        if(dirPath.length){
          const dirs = dirPath.length ? dirPath.split(path.sep) : [];
          try{
            let currentDirHandle = ApplicationProfile.directoryHandle; 
            for(let i = 0, len = dirs.length; i < len; i++){
              const isTargetDirectory = (i == dirs.length-1);
              const canCreate = (isTargetDirectory || !!opts.recursive);
              currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i], { create: canCreate });
              console.log('handle', currentDirHandle, isTargetDirectory, canCreate);
              if(!currentDirHandle && !isTargetDirectory){
                resolve(false);
                return;
              }
            }
            console.log('mkdir', currentDirHandle);
            await spleep(1000);
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
          let parentHandle = await this.resolvePathDirectoryHandle(details.dir);
          if(parentHandle == ApplicationProfile.directoryHandle) resolve(false);
          if(parentHandle){
            for await (const entry of parentHandle.values()) {
              if(entry.kind == 'file') continue;
              if(entry.name != details.name) continue;
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
    const details = path.parse(dirPath);
    return await this.resolvePathDirectoryHandle(dirPath);
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
      if(handleOrPath instanceof FileSystemFileHandle){
        let file = await handleOrPath.getFile();
        //@ts-expect-error
        file.remove();
      }
    }
  }

  static async showOpenFileDialog(){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){

    }else{
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
      let [fileHandle] = await window.showOpenFilePicker({multiple: false});
      return fileHandle;
    }
  }

  static async showSaveFileDialog(){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){

    }else{
      // const opts = {
      //   types: [{
      //     description: 'Text file',
      //     accept: {'text/plain': ['.txt']},
      //   }],
      // };
      let fileHandle = await window.showSaveFilePicker({
        // d
      });
    }
  }

  static async showOpenDirectoryDialog(){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      
    }else{
      let directoryHandle = await window.showDirectoryPicker({ });
      return directoryHandle;
    }
  }

  private static async resolvePathDirectoryHandle(filepath: string, parent = false): Promise<FileSystemDirectoryHandle> {
    if(ApplicationProfile.directoryHandle){
      const dirs = filepath.length ? filepath.split('/') : [];
      let lastDirectoryHandle = ApplicationProfile.directoryHandle;
      let currentDirHandle = ApplicationProfile.directoryHandle;
      for(let i = 0, len = dirs.length; i < len; i++){
        lastDirectoryHandle = currentDirHandle;
        currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i]);
      }
      return !parent ? currentDirHandle : lastDirectoryHandle;
    }
    return;
  }

  private static async resolveFilePathDirectoryHandle(filepath: string): Promise<FileSystemDirectoryHandle> {
    if(ApplicationProfile.directoryHandle){
      const dirs = filepath.split('/');
      const filename = dirs.pop();
      let currentDirHandle = ApplicationProfile.directoryHandle;
      for(let i = 0, len = dirs.length; i < len; i++){
        currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i]);
      }
      return currentDirHandle;
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
      if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
        return true;
      }
      return false;
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
