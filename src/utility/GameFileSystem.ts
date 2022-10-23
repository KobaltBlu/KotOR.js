/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as path from "path";
import * as fs from "fs";

import isBuffer from "is-buffer";
import { ApplicationProfile } from "./ApplicationProfile";
import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { GameFileSystemReadDirOptions } from "../interface/filesystem/GameFileSystemReadDirOptions";

/* @file
 * The FileSystem class.
 * Handles file system access for the application.
 * It will use either the File System Access API or the fs module built into node
 * depending on the ENVIRONMENT ( WEB|ELECTRON ) the app was loaded under.
 * 
 * This class should only access the directory that the user supplied and not escape it.
 * Under the web this is forced, but the node implementation is not so strict.
 * 
 * This class will also be able to access sub files and folders of the supplied directory.
 * 
 * File access outside of this usecase should be delagated to calling the open/save file dialogs
 * when the user requests them.
 */

export class GameFileSystem {

  static rootDirectoryPath: string;
  static rootDirectoryHandle: FileSystemDirectoryHandle;

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
        fs.open(path.join(GameFileSystem.rootDirectoryPath, filepath), (err, fd) => {
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
      filepath = GameFileSystem.normalizePath(filepath);
      const dirs = filepath.split('/');
      const filename = dirs.pop();
      const dirHandle = await GameFileSystem.resolveFilePathDirectoryHandle(filepath);
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

  static async read(handle: FileSystemFileHandle|number, output: Buffer, offset: number, length: number, position: number){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<Buffer>( (resolve, reject) => {
        fs.read(handle as number, output, offset, length, position, (err, bytes, buffer) => {
          if(err) reject(err);
          resolve(buffer);
        })
      });
    }else{
      if(!(handle)) throw new Error('No file handle supplied!');
      
      if(!(handle instanceof FileSystemFileHandle)) throw new Error('FileSystemFileHandle expected but one was not supplied!');
      
      if(!isBuffer(output)) throw new Error('No output buffer supplied!');

      const file = await handle.getFile();
      if(!file) throw new Error('Failed to read file from handle!');

      let blob = await file.slice(position, position + length);
      let arrayBuffer = await blob.arrayBuffer();
      Buffer.from(arrayBuffer).copy(output);
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
  static async readFile(filepath: string, options: any = {}): Promise<Buffer> {
    // console.log('readFile', filepath);
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<Buffer>( (resolve, reject) => {
        fs.readFile(path.join(GameFileSystem.rootDirectoryPath, filepath), options, (err, buffer) => {
          if(err) reject(undefined);
          resolve(buffer);
        })
      });
    }else{
      const file = await GameFileSystem.open(filepath);
      if(!file) throw new Error('Failed to read file');
      
      let handle = await file.getFile();
      return Buffer.from( await handle.arrayBuffer() );
    }
  }

  //filepath should be relative to the rootDirectoryPath or ApplicationProfile.directory
  static async writeFile(filepath: string, data: Uint8Array): Promise<void> {
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<void>( (resolve, reject) => {
        fs.writeFile(path.join(GameFileSystem.rootDirectoryPath, filepath), data, () => {
          resolve();
        })
      });
    }else{
      filepath = GameFileSystem.normalizePath(filepath);
      const dirs = filepath.split('/');
      const filename = dirs.pop();
      const dirHandle = await GameFileSystem.resolveFilePathDirectoryHandle(filepath);
      
      if(!dirHandle) throw new Error('Failed to locate file directory');
      
      const newFile = await dirHandle.getFileHandle(filename, {
        create: true
      });
  
      if(!newFile) throw new Error('Failed to create file');
  
      try{
        let stream = await newFile.createWritable();
        await stream.write(data);
        stream.close();
      }catch(e){
        console.error(e);
        throw new Error('Failed to write file');
      }
    }
  }

  static async readdir(
    dirpath: string, options: GameFileSystemReadDirOptions = {}, files: any[] = []
  ): Promise<string[]> {
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return await GameFileSystem.readdir_fs(dirpath, options, files);
    }else{
      return await GameFileSystem.readdir_web(dirpath, options, files);
    }
  }

  private static async readdir_web(pathOrHandle: string|FileSystemDirectoryHandle = '', opts: any = {},  files: any[] = [], dirbase: string = ''){
    try{
      if(typeof pathOrHandle === 'string'){
        const dirPath = pathOrHandle as string;
        pathOrHandle = await GameFileSystem.resolvePathDirectoryHandle(pathOrHandle);
        if(!pathOrHandle) throw new Error('Failed to locate directory inside game folder: '+dirPath);
        dirbase = pathOrHandle.name;
      }

      if(pathOrHandle instanceof FileSystemDirectoryHandle){
        for await (const entry of pathOrHandle.values()) {
          if (entry.kind === "file"){
            files.push(path.join(dirbase, entry.name));
          }
          if (entry.kind === "directory"){
            let newdirbase = path.join(dirbase, entry.name);
            // if(!dirbase) dirbase = 
            // files.push(entry.name);
            if(opts.recursive){
              await GameFileSystem.readdir_web(entry, opts, files, newdirbase);
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

  private static async readdir_fs(resource_path: string = '', opts: GameFileSystemReadDirOptions = {},  files: any[] = [], depthState?: any) {
    if(typeof depthState === 'undefined'){
      depthState = {
        'folder': resource_path,
        depth: 0
      }
    }else{
      depthState.depth++;
    }
    return new Promise<string[]>( (resolve, reject) => {
      fs.stat(path.join(GameFileSystem.rootDirectoryPath, resource_path), (err, stats: fs.Stats) => {
        if(err){
          reject(err);
          return;
        }
        if(!stats.isDirectory()){
          if(!opts.list_dirs){
            files.push(resource_path);
          }
          resolve(files);
          return;
        }else{
          if((depthState.depth <= 1) || !!opts.recursive ){
            fs.readdir(path.join(GameFileSystem.rootDirectoryPath, resource_path), {withFileTypes: true}, async (err, dir_files: fs.Dirent[]) => {
              if(err){
                reject(err);
                return;
              }
              let file: fs.Dirent;
              if(!!opts.list_dirs && depthState.depth){
                files.push(resource_path);
              }
              for(let i = 0, len = dir_files.length; i < len; i++){
                file = dir_files[i];
                try{
                  await GameFileSystem.readdir_fs(path.join(resource_path, file.name), opts, files, depthState);
                }catch(e){
                  reject(err);
                }
              }
              resolve(files);
            });
          }else{
            resolve(files);
          }
        }
  
      });
    });
  }

  static async mkdir(dirPath: string, opts: GameFileSystemReadDirOptions = {}){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<boolean>( (resolve, reject) => {
        fs.mkdir(path.join(GameFileSystem.rootDirectoryPath, dirPath), { recursive: !!opts.recursive }, (err) => {
          if(err){
            reject(err);
            return;
          }
          resolve(true)
          return;
        });
      })
    }else{
      const dirs = dirPath.split(path.sep);
      try{
        let currentDirHandle = GameFileSystem.rootDirectoryHandle; 
        for(let i = 0, len = dirs.length; i < len; i++){
          currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i], { create: true })
        }
      }catch(e){
        throw e;
      }
    }
  }

  static async rmdir(dirPath: string, opts: GameFileSystemReadDirOptions = {}){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<void>( (resolve, reject) => {
        fs.rmdir(dirPath, {
          recursive: opts.recursive
        } as fs.RmDirOptions, () => {
          resolve();
        })
      });
    }else{
      try{
        const details = path.parse(dirPath);
        // let handle = await GameFileSystem.resolvePathDirectoryHandle(dirPath);
        let parentHandle = await GameFileSystem.resolvePathDirectoryHandle(details.dir);
        if(parentHandle){
          for await (const entry of parentHandle.values()) {
            if(entry.kind == 'file') continue;
            if(entry.name != details.name) continue;
            parentHandle.removeEntry(entry.name, {
              recursive: opts.recursive
            });
            break;
          }
        }
      }catch(e){
        return;
      }
    }
  }

  static async exists(dirOrFilePath: string): Promise<boolean>{
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      return new Promise<boolean>( (resolve, reject) => {
        fs.stat(dirOrFilePath, (err, stats) => {
          if(err){
            resolve(false);
            return
          }

          resolve(true);
        });
      });
    }else{
      const details = path.parse(dirOrFilePath);
      try{
        if(details.ext){
          let handle = await GameFileSystem.resolveFilePathDirectoryHandle(dirOrFilePath);
          return true;
        }else{
          let handle = await GameFileSystem.resolvePathDirectoryHandle(dirOrFilePath);
          return true;
        }
      }catch(e){
        console.error(e);
        return false;
      }
    }
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
    if(GameFileSystem.rootDirectoryHandle){
      const dirs = filepath.split('/');
      let lastDirectoryHandle = GameFileSystem.rootDirectoryHandle;
      let currentDirHandle = GameFileSystem.rootDirectoryHandle;
      for(let i = 0, len = dirs.length; i < len; i++){
        lastDirectoryHandle = currentDirHandle;
        currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i]);
      }
      return !parent ? currentDirHandle : lastDirectoryHandle;
    }
    return;
  }

  private static async resolveFilePathDirectoryHandle(filepath: string): Promise<FileSystemDirectoryHandle> {
    if(GameFileSystem.rootDirectoryHandle){
      const dirs = filepath.split('/');
      const filename = dirs.pop();
      let currentDirHandle = GameFileSystem.rootDirectoryHandle;
      for(let i = 0, len = dirs.length; i < len; i++){
        currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i]);
      }
      return currentDirHandle;
    }
    return;
  }

  static async initializeGameDirectory(){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      GameFileSystem.rootDirectoryPath = ApplicationProfile.directory;
    }else{
      GameFileSystem.rootDirectoryHandle = await window.showDirectoryPicker({
        mode: "readwrite"
      });
    }
  }

}
