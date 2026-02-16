import * as fs from "fs";
import * as KotOR from "./KotOR";
/** Electron dialog when ENV is ELECTRON; provided by preload. */
declare const dialog: {
  showOpenDialog: (options: { title?: string; defaultPath?: string; buttonLabel?: string; filters?: { name: string; extensions: string[] }[]; properties?: string[]; message?: string; securityScopedBookmarks?: boolean }) => Promise<{ canceled?: boolean; filePaths?: string[] }>;
  showSaveDialog: (options?: { title?: string; defaultPath?: string; buttonLabel?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<{ canceled?: boolean; filePath?: string }>;
};

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

interface ShowOpenDirectoryDialogOptions {
  /**
   * File System Access API
   */
  id?: string;
  mode?: 'readwrite' | 'readonly';
  types?: {
    description: string;
    accept: {
      [key: string]: string[];
    };
  }[];
  multiple?: boolean;
  startIn?: string|FileSystemHandle;

  /**
   * Electron arguments
   */
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: {
    name: string;
    extensions: string[];
  }[];
  properties?: ('openDirectory' | 'createDirectory' | 'multiSelections' | 'showHiddenFiles' | 'promptToCreate' | 'noResolveAliases' | 'treatPackageAsDirectory' | 'dontAddToRecent')[];
  message?: string;
  securityScopedBookmarks?: boolean;
}

export class ForgeFileSystem {
  static OpenFile(options: OpenFileOptions = {}): Promise<ForgeFileSystemResponse> {
    options = Object.assign({
      multiple: false,
      ext: []
    }, options);
    return new Promise( (resolve, reject) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        dialog.showOpenDialog({
          title: 'Open File',
          filters: ForgeFileSystem.GetFilteredFilePickerTypes(options.ext),
          properties: ['createDirectory', 'openFile'],
        }).then( (result: { canceled?: boolean; filePaths?: string[] }) => {
          if(!result.canceled){
            if(result.filePaths?.length){
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
        }).catch( (e: unknown) => {
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
          multiple: options.multiple ?? false,
        }).then( (handles: FileSystemFileHandle | FileSystemFileHandle[]) => {
          const arr = Array.isArray(handles) ? handles : (handles ? [handles] : []);
          if(arr.length){
            resolve({
              type: ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE,
              handles: arr,
              multiple: options.multiple,
            });
            return;
          }
          resolve({
            type: ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE,
            handles: [],
            multiple: options.multiple,
          });
        }).catch((e: unknown) => {
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

  static async OpenFileBuffer( options: OpenFileOptions = {} ): Promise<Uint8Array> {
    options = Object.assign({
      multiple: false,
      exts: []
    }, options);
    try{
      const response = await ForgeFileSystem.OpenFile(options);
      return await ForgeFileSystem.ReadFileBufferFromResponse(response);
    }catch(e: unknown){
      console.error(e);
    }
    return new Uint8Array(0);
  }

  /** Read file contents from an OpenFile dialog response (Electron path or browser handle). */
  static async ReadFileBufferFromResponse(response: ForgeFileSystemResponse): Promise<Uint8Array> {
    try {
      if (KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.ELECTRON) {
        if (response.paths && response.paths.length > 0) {
          const buf = await fs.promises.readFile(response.paths[0]);
          return new Uint8Array(buf);
        }
      } else {
        if (response.handles && response.handles.length > 0) {
          const handle = response.handles[0] as FileSystemFileHandle;
          const file = await handle.getFile();
          const ab = await file.arrayBuffer();
          return new Uint8Array(ab);
        }
      }
    } catch (e: unknown) {
      console.error(e);
    }
    return new Uint8Array(0);
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
        }).catch( (e: unknown) => {
          console.error(e);
          resolve({
            type: ForgeFileSystemResponseType.FILE_PATH_STRING,
            paths: [],
            multiple: options.multiple,
          });
        })
      }else{
        window.showDirectoryPicker({
          mode: "readwrite" as FileSystemPermissionMode,
        }).then( (handle: FileSystemDirectoryHandle) => {
          if(handle){
            resolve({
              type: ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE,
              handles: [handle],
              multiple: false,
            });
            return;
          }
          resolve({
            type: ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE,
            handles: [],
            multiple: options.multiple,
          });
        }).catch((e: unknown) => {
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
        return supportedFileDialogTypes.filter( (element: { extensions: string[] }) => {
          return element.extensions.some( (extension: string)=> ext.includes(extension) )
        });
      }else{
        return supportedFileDialogTypes;
      }
    }else{
      if(ext.length){
        // return supportedFilePickerTypes.filter( (element: any) => {
        //   return element.accept['application/*'].some( (extension: string)=> ext.includes(extension.substring(1)) )
        // });
        return [
          {
            description: 'File',
            accept: {
              'application/*': ext
            }
          },
        ]
      }else{
        return supportedFilePickerTypes
      }
    }
  }

  static async showOpenDirectoryDialog( options: ShowOpenDirectoryDialogOptions = {} ){
    const responseType = KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON ? ForgeFileSystemResponseType.FILE_PATH_STRING : ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE;
    let cancelled = false;
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      try{
        const result = await dialog.showOpenDialog({
          title: options.title,
          defaultPath: options.defaultPath,
          buttonLabel: options.buttonLabel,
          filters: options.filters,
          properties: options.properties || ['createDirectory', 'openDirectory'],
          message: options.message,
          securityScopedBookmarks: options.securityScopedBookmarks,
        });
        console.log('result', result);
        cancelled = !!result.canceled;
        if(!cancelled){
          if(result.filePaths.length){
            return {
              type: responseType,
              path: result.filePaths[0],
              handle: undefined as unknown as FileSystemDirectoryHandle,
            };
          }
        }
      }catch(e){
        console.error(e);
        cancelled = true;
      }
    }

    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
      try{
        const result = await window.showDirectoryPicker({
          mode: (options.mode || "readwrite") as FileSystemPermissionMode,
        });
        console.log('result', result);

        if(result){
          return {
            type: responseType,
            path: result.name,
            handle: result as FileSystemDirectoryHandle,
          };
        }
      }catch(e){
        console.error(e);
        cancelled = true;
      }
    }
    return {
      cancelled: cancelled,
      type: responseType,
      path: undefined as string | undefined,
      handle: undefined as FileSystemDirectoryHandle | undefined,
    };
  }

}

(window as Window & { ForgeFileSystem?: typeof ForgeFileSystem }).ForgeFileSystem = ForgeFileSystem

export const supportedFilePickerTypes: any[] = [
  {
    description: 'All Supported Formats',
    accept: {
      'application/*': ['.2da', '.tpc', '.tga', '.wav', '.mp3', '.bik', '.gff', '.utc', '.utd', '.utp', '.utm', '.uts', '.utt', '.utw', '.lip', '.phn', '.mod', '.nss', '.ncs', '.erf', '.rim', '.git', '.are', '.ifo', '.mdl', '.mdx', '.wok', '.pwk', '.dwk', '.lyt', '.vis', '.pth']
    }
  },
  {
    description: 'TPC Image',
    accept: {
      'application/*': ['.tpc']
    }
  },
  {
    description: 'TGA Image',
    accept: {
      'application/*': ['.tga']
    }
  },
  {
    description: '.GFF',
    accept: {
      'application/*': ['.gff']
    }
  },
  {
    description: 'Creature Template',
    accept: {
      'application/*': ['.utc']
    }
  },
  {
    description: 'Door Template',
    accept: {
      'application/*': ['.utd']
    }
  },
  {
    description: 'Placeable Template',
    accept: {
      'application/*': ['.utp']
    }
  },
  {
    description: 'Merchant Template',
    accept: {
      'application/*': ['.utm']
    }
  },
  {
    description: 'Sound Template',
    accept: {
      'application/*': ['.uts']
    }
  },
  {
    description: 'Trigger Template',
    accept: {
      'application/*': ['.utt']
    }
  },
  {
    description: 'Waypoint Template',
    accept: {
      'application/*': ['.utw']
    }
  },
  {
    description: 'LIP Animation',
    accept: {
      'application/*': ['.lip']
    }
  },
  {
    description: 'PHN File',
    accept: {
      'application/*': ['.phn']
    }
  },
  {
    description: 'Audio File',
    accept: {
      'application/*': ['.wav', '.mp3']
    }
  },
  {
    description: 'Video File',
    accept: {
      'application/*': ['.bik']
    }
  },
  {
    description: 'MOD File',
    accept: {
      'application/*': ['.mod']
    }
  },
  {
    description: 'ERF File',
    accept: {
      'application/*': ['.erf']
    }
  },
  {
    description: 'RIM File',
    accept: {
      'application/*': ['.rim']
    }
  },
  {
    description: 'Model File',
    accept: {
      'application/*': ['.mdl', '.wok', '.pwk', '.dwk']
    }
  },
  {
    description: 'Module File',
    accept: {
      'application/*': ['.git', '.ifo']
    }
  },
  {
    description: 'Area File',
    accept: {
      'application/*': ['.are']
    }
  },
  {
    description: 'Path File',
    accept: {
      'application/*': ['.pth']
    }
  },
  {
    description: 'Script Source File',
    accept: {
      'application/*': ['.ncs']
    }
  },
  {
    description: 'Script Compiled File',
    accept: {
      'application/*': ['.nss']
    }
  },
  {
    description: 'VIS File',
    accept: {
      'application/*': ['.vis']
    }
  },
  {
    description: 'Layout File',
    accept: {
      'application/*': ['.lyt']
    }
  },
  {
    description: '2D Array File',
    accept: {
      'application/*': ['.2da']
    }
  },
  // {
  //   description: 'All Formats',
  //   accept: {
  //     'application/*': ['.*']
  //   }
  // },
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
