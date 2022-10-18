/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as path from "path";
import * as fs from "fs";

import { Buffer } from "buffer/";
import isBuffer from "is-buffer";

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

export class FileSystem {

  static rootDirectoryPath: string;
  static rootDirectoryHandle: FileSystemDirectoryHandle;

  private static normalizePath(filepath: string){
    filepath = filepath.trim();
    filepath.replace(/^\/+/, '').replace(/\/+$/, '');
    filepath.replace(/^\\+/, '').replace(/\\+$/, '');
    return filepath;
    Buffer.alloc
  }

  static async openFile(filepath: string): Promise<FileSystemFileHandle> {
    filepath = FileSystem.normalizePath(filepath);
    const dirs = filepath.split('/');
    const filename = dirs.pop();
    const dirHandle = await FileSystem.resolveFilePathDirectoryHandle(filepath);
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

  static async read(handle: FileSystemFileHandle, output: Buffer, offset: number, length: number, position: number){
    if(!(handle)) throw new Error('No file handle supplied!');
    
    if(!(handle instanceof FileSystemFileHandle)) throw new Error('FileSystemFileHandle expected but one was not supplied!');
    
    if(!isBuffer(output)) throw new Error('No output buffer supplied!');

    const file = await handle.getFile();
    if(!file) throw new Error('Failed to read file from handle!');

    let blob = await file.slice(position, position + length);
    let arrayBuffer = await blob.arrayBuffer();
    Buffer.from( arrayBuffer );
  }

  static async close(handle: FileSystemFileHandle){
    //this api does not expose a close method for reads
  }

  static async readFile(filepath: string){
    const file = await FileSystem.openFile(filepath);
    if(!file) throw new Error('Failed to read file');
    
    let handle = await file.getFile();
    return new Uint8Array( await handle.arrayBuffer() );
  }

  static async writeFile(filepath: string, data: Uint8Array): Promise<void> {
    // fs.writeFile()
    filepath = FileSystem.normalizePath(filepath);
    const dirs = filepath.split('/');
    const filename = dirs.pop();
    const dirHandle = await FileSystem.resolveFilePathDirectoryHandle(filepath);
    
    if(!dirHandle) throw new Error('Failed to locate file directory');
    
    const newFile = await dirHandle.getFileHandle(filename, {
      create: true
    });

    if(!newFile) throw new Error('Failed to create file');

    try{
      //@ts-expect-error
      let stream = await newFile.createWritable();
      await stream.write(data);
      stream.close();
    }catch(e){
      console.error(e);
      throw new Error('Failed to write file');
    }
  }

  static async showOpenFile(){

  }

  static async showSaveFile(){

  }

  static async showOpenDirectory(){

  }

  private static async resolveFilePathDirectoryHandle(filepath: string): Promise<FileSystemDirectoryHandle> {
    if(FileSystem.rootDirectoryHandle){
      const dirs = filepath.split('/');
      const filename = dirs.pop();
      let currentDirHandle = FileSystem.rootDirectoryHandle;
      for(let i = 0, len = dirs.length; i < len; i++){
        currentDirHandle = await currentDirHandle.getDirectoryHandle(dirs[i]);
      }
      return currentDirHandle;
    }
    return;
  }

  static async initializeGameDirectory(){
    // @ts-expect-error
    FileSystem.rootDirectoryHandle = await window.showDirectoryPicker({
      mode: "readwrite"
    });
  }

}