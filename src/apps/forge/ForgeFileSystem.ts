import { FileTypeManager } from "./FileTypeManager";
import { pathParse } from "./helpers/PathParse";
import * as fs from "fs";

import * as KotOR from "./KotOR";
declare const dialog: any;

export enum ForgeFileSystemResponseType {
  FILE_PATH_STRING = 0,
  FILE_SYSTEM_HANDLE = 1,
} 

export interface ForgeFileSystemResponse {
  type: ForgeFileSystemResponseType;
  handles?: FileSystemFileHandle[]|FileSystemDirectoryHandle[];
  paths?: string[];
  multiple?: boolean;
}

export interface OpenFileOptions {
  multiple?: boolean;
  ext?: string[];
}

export class ForgeFileSystem {
  static OpenFile(options: OpenFileOptions = {}): Promise<ForgeFileSystemResponse> {
    options = Object.assign({
      multiple: false,
      exts: []
    }, options);
    return new Promise( (resolve, reject) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        dialog.showOpenDialog({
          title: 'Open File',
          filters: ForgeFileSystem.GetFilteredFilePickerTypes(options.ext),
          properties: ['createDirectory', 'openFile'],
        }).then( (result: any) => {
          if(!result.canceled){
            if(result.filePaths.length){
              resolve({
                type: ForgeFileSystemResponseType.FILE_PATH_STRING,
                paths: result.filePaths as string[],
                multiple: options.multiple,
              });
              return;
            }
          }
          resolve({
            type: ForgeFileSystemResponseType.FILE_PATH_STRING,
            paths: [],
            multiple: options.multiple,
          });
          // console.log(result.canceled);
          // console.log(result.filePaths);
        }).catch( (e: any) => {
          console.error(e);
          resolve({
            type: ForgeFileSystemResponseType.FILE_PATH_STRING,
            paths: [],
            multiple: options.multiple,
          });
        })
      }else{
        window.showOpenFilePicker({
          types: ForgeFileSystem.GetFilteredFilePickerTypes(options.ext),
          multiple: false,
        }).then( (handles: FileSystemFileHandle[]) => {
          if(handles.length){
            resolve({
              type: ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE,
              handles: handles,
              multiple: options.multiple,
            });
            return;
          }
          resolve({
            type: ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE,
            handles: [],
            multiple: options.multiple,
          });
        }).catch((e: any) => {
          console.error(e);
          resolve({
            type: ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE,
            handles: [],
            multiple: options.multiple,
          });
        });
      }
    });
  }

  static async OpenFileBuffer( options: OpenFileOptions = {} ): Promise<Buffer> {
    options = Object.assign({
      multiple: false,
      exts: []
    }, options);
    try{
      const response = await ForgeFileSystem.OpenFile();
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(Array.isArray(response.paths)){
          fs.readFile(response.paths[0], (err, buffer) => {
            if(err) throw err;
            return Buffer.from(buffer);
          });
        }
      }else{
        if(Array.isArray(response.handles)){
          const [handle] = response.handles as FileSystemFileHandle[];
          let file = await handle.getFile();
          return Buffer.from( await file.arrayBuffer() );
        }
      }
    }catch(e: any){
      console.error(e);
    }
    return Buffer.alloc(0);
  }

  static OpenDirectory(options: OpenFileOptions = {}): Promise<ForgeFileSystemResponse> {
    options = Object.assign({
      multiple: false,
      exts: []
    }, options);
    options.multiple = false;
    return new Promise( (resolve, reject) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        dialog.showOpenDialog({
          title: 'Open Directory',
          // filters: ForgeFileSystem.GetFilteredFilePickerTypes(options.ext),
          properties: ['createDirectory', 'openDirectory'],
        }).then( (result: any) => {
          if(!result.canceled){
            if(result.filePaths.length){
              resolve({
                type: ForgeFileSystemResponseType.FILE_PATH_STRING,
                paths: result.filePaths as string[],
                multiple: false,
              });
              return;
            }
          }
          resolve({
            type: ForgeFileSystemResponseType.FILE_PATH_STRING,
            paths: [],
            multiple: false,
          });
          // console.log(result.canceled);
          // console.log(result.filePaths);
        }).catch( (e: any) => {
          console.error(e);
          resolve({
            type: ForgeFileSystemResponseType.FILE_PATH_STRING,
            paths: [],
            multiple: options.multiple,
          });
        })
      }else{
        window.showDirectoryPicker({
          types: ForgeFileSystem.GetFilteredFilePickerTypes(options.ext),
          multiple: false,
        }).then( (handle: FileSystemDirectoryHandle) => {
          if(handle){
            resolve({
              type: ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE,
              handles: [handle as any],
              multiple: false,
            });
            return;
          }
          resolve({
            type: ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE,
            handles: [],
            multiple: options.multiple,
          });
        }).catch((e: any) => {
          console.error(e);
          resolve({
            type: ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE,
            handles: [],
            multiple: options.multiple,
          });
        });
      }
    });
  }

  static GetFilteredFilePickerTypes(ext: string[] = []){
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      if(ext.length){
        return supportedFileDialogTypes.filter( (element: any) => {
          return element.extensions.some( (extension: string)=> ext.includes(extension) )
        });
      }else{
        return supportedFileDialogTypes;
      }
    }else{
      if(ext.length){
        return supportedFilePickerTypes.filter( (element: any) => {
          return element.accept['*'].some( (extension: string)=> ext.includes(extension.substring(1)) )
        });
      }else{
        return supportedFilePickerTypes
      }
    }
  }

}

(window as any).ForgeFileSystem = ForgeFileSystem

export const supportedFilePickerTypes: any[] = [
  {
    description: 'All Supported Formats', 
    accept: {
      '*': ['.2da', '.tpc', '.tga', '.wav', '.mp3', '.bik', '.gff', '.utc', '.utd', '.utp', '.utm', '.uts', '.utt', '.utw', '.lip', '.phn', '.mod', '.nss', '.ncs', '.erf', '.rim', '.git', '.are', '.ifo', '.mdl', '.mdx', '.wok', '.pwk', '.dwk', '.lyt', '.vis', '.pth']
    }
  },
  {
    description: 'TPC Image', 
    accept: {
      '*': ['.tpc']
    }
  },
  {
    description: 'TGA Image', 
    accept: {
      '*': ['.tga']
    }
  },
  {
    description: '.GFF', 
    accept: {
      '*': ['.gff']
    }
  },
  {
    description: 'Creature Template', 
    accept: {
      '*': ['.utc']
    }
  },
  {
    description: 'Door Template', 
    accept: {
      '*': ['.utd']
    }
  },
  {
    description: 'Placeable Template', 
    accept: {
      '*': ['.utp']
    }
  },
  {
    description: 'Merchant Template', 
    accept: {
      '*': ['.utm']
    }
  },
  {
    description: 'Sound Template', 
    accept: {
      '*': ['.uts']
    }
  },
  {
    description: 'Trigger Template', 
    accept: {
      '*': ['.utt']
    }
  },
  {
    description: 'Waypoint Template', 
    accept: {
      '*': ['.utw']
    }
  },
  {
    description: 'LIP Animation', 
    accept: {
      '*': ['.lip']
    }
  },
  {
    description: 'PHN File', 
    accept: {
      '*': ['.phn']
    }
  },
  {
    description: 'Audio File', 
    accept: {
      '*': ['.wav', '.mp3']
    }
  },
  {
    description: 'Video File', 
    accept: {
      '*': ['.bik']
    }
  },
  {
    description: 'MOD File', 
    accept: {
      '*': ['.mod']
    }
  },
  {
    description: 'ERF File', 
    accept: {
      '*': ['.erf']
    }
  },
  {
    description: 'RIM File', 
    accept: {
      '*': ['.rim']
    }
  },
  {
    description: 'Model File', 
    accept: {
      '*': ['.mdl', '.mdx', '.wok', '.pwk', '.dwk']
    }
  },
  {
    description: 'Module File', 
    accept: {
      '*': ['.git', '.ifo']
    }
  },
  {
    description: 'Area File', 
    accept: {
      '*': ['.are']
    }
  },
  {
    description: 'Path File', 
    accept: {
      '*': ['.pth']
    }
  },
  {
    description: 'Script Source File', 
    accept: {
      '*': ['.ncs']
    }
  },
  {
    description: 'Script Compiled File', 
    accept: {
      '*': ['.nss']
    }
  },
  {
    description: 'VIS File', 
    accept: {
      '*': ['.vis']
    }
  },
  {
    description: 'Layout File', 
    accept: {
      '*': ['.lyt']
    }
  },
  {
    description: '2D Array File', 
    accept: {
      '*': ['.2da']
    }
  },
  {
    description: 'All Formats', 
    accept: {
      '*': ['*']
    }
  },
];

export const supportedFileDialogTypes: any[] = [
  {name: 'All Supported Formats', extensions: ['2da', 'tpc', 'tga', 'wav', 'mp3', 'bik', 'gff', 'utc', 'utd', 'utp', 'utm', 'uts', 'utt', 'utw', 'lip', 'phn', 'mod', 'nss', 'ncs', 'erf', 'rim', 'git', 'are', 'ifo', 'mdl', 'mdx', 'wok', 'pwk', 'dwk', 'lyt', 'vis', 'pth']},
  {name: 'TPC Image', extensions: ['tpc']},
  {name: 'TGA Image', extensions: ['tga']},
  {name: 'GFF', extensions: ['gff']},
  {name: 'Creature Template', extensions: ['utc']},
  {name: 'Door Template', extensions: ['utd']},
  {name: 'Placeable Template', extensions: ['utp']},
  {name: 'Merchant Template', extensions: ['utm']},
  {name: 'Sound Template', extensions: ['uts']},
  {name: 'Trigger Template', extensions: ['utt']},
  {name: 'Waypoint Template', extensions: ['utw']},
  {name: 'LIP Animation', extensions: ['lip']},
  {name: 'PHN File', extensions: ['phn']},
  {name: 'Audio File', extensions: ['wav', 'mp3']},
  {name: 'Video File', extensions: ['bik']},
  {name: 'MOD File', extensions: ['mod']},
  {name: 'ERF File', extensions: ['erf']},
  {name: 'RIM File', extensions: ['rim']},
  {name: 'Model File', extensions: ['mdl', 'mdx', 'wok', 'pwk', 'dwk']},
  {name: 'Module File', extensions: ['git', 'ifo']},
  {name: 'Area File', extensions: ['are']},
  {name: 'Path File', extensions: ['pth']},
  {name: 'Script Source File', extensions: ['ncs']},
  {name: 'Script Compiled File', extensions: ['nss']},
  {name: 'VIS File', extensions: ['vis']},
  {name: 'Layout File', extensions: ['lyt']},
  {name: '2D Array File', extensions: ['2da']},
  {name: 'All Formats', extensions: ['*']},
];
