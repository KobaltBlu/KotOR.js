import * as fs from "fs";
import * as path from "path";
import * as KotOR from "@/apps/forge/KotOR";
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
        const properties: ('createDirectory' | 'openFile' | 'multiSelections')[] = ['createDirectory', 'openFile'];
        if (options.multiple) {
          properties.push('multiSelections');
        }
        dialog.showOpenDialog({
          title: 'Open File',
          filters: ForgeFileSystem.GetFilteredFilePickerTypes(options.ext),
          properties,
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
          multiple: !!options.multiple,
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

  static async OpenFileBuffer( options: OpenFileOptions = {} ): Promise<Uint8Array> {
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
            return new Uint8Array(buffer);
          });
        }
      }else{
        if(Array.isArray(response.handles)){
          const [handle] = response.handles as FileSystemFileHandle[];
          let file = await handle.getFile();
          return new Uint8Array( await file.arrayBuffer() );
        }
      }
    }catch(e: any){
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
          mode: "readwrite"
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
        const normalized = [
          ...new Set(
            ext.map((e) => {
              const t = e.trim().toLowerCase();
              return t.startsWith('.') ? t : `.${t}`;
            }),
          ),
        ];
        const textExts = new Set(['.txt', '.lyt', '.nss', '.vis', '.txi', '.pth']);
        const accept: Record<string, string[]> = {};
        const octet: string[] = [];
        const plain: string[] = [];
        const png: string[] = [];
        const jpeg: string[] = [];
        const wav: string[] = [];
        const mp3: string[] = [];
        for (const d of normalized) {
          if (textExts.has(d)) plain.push(d);
          else if (d === '.png') png.push(d);
          else if (d === '.jpg' || d === '.jpeg') jpeg.push(d);
          else if (d === '.wav') wav.push(d);
          else if (d === '.mp3') mp3.push(d);
          else octet.push(d);
        }
        if (plain.length) accept['text/plain'] = plain;
        if (png.length) accept['image/png'] = png;
        if (jpeg.length) accept['image/jpeg'] = jpeg;
        if (wav.length) accept['audio/wav'] = wav;
        if (mp3.length) accept['audio/mpeg'] = mp3;
        if (octet.length) accept['application/octet-stream'] = octet;
        return [{ description: 'File', accept }];
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
              handle: undefined,
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
          mode: options.mode || "readwrite"
        });
        console.log('result', result);

        if(result){
          return {
            type: responseType,
            path: result.name,
            handle: result,
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
      path: undefined,
      handle: undefined,
    };
  }

  /** Electron only: writes bytes to an absolute filesystem path. */
  static async writeUint8ArrayToPath(fullPath: string, data: Uint8Array): Promise<void> {
    if(KotOR.ApplicationProfile.ENV != KotOR.ApplicationEnvironment.ELECTRON){
      throw new Error('writeUint8ArrayToPath is only supported in Electron');
    }
    const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, buf);
  }

}

(window as any).ForgeFileSystem = ForgeFileSystem

export const supportedFilePickerTypes: any[] = [
  {
    description: "All Supported Formats",
    accept: {
      "application/octet-stream": [
        ".2da",
        ".are",
        ".bic",
        ".bik",
        ".dlg",
        ".dwk",
        ".erf",
        ".fac",
        ".git",
        ".gff",
        ".gui",
        ".ifo",
        ".jrl",
        ".lip",
        ".mdl",
        ".mdl.ascii",
        ".mdx",
        ".mod",
        ".ncs",
        ".phn",
        ".pwk",
        ".res",
        ".rim",
        ".sav",
        ".ssf",
        ".tga",
        ".tpc",
        ".utc",
        ".utd",
        ".ute",
        ".uti",
        ".utm",
        ".utp",
        ".uts",
        ".utt",
        ".utw",
        ".wok",
      ],
      "text/plain": [".txt", ".lyt", ".nss", ".vis", ".txi", ".pth"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "audio/wav": [".wav"],
      "audio/mpeg": [".mp3"],
    },
  },
  {
    description: "TPC Image",
    accept: {
      "application/octet-stream": [".tpc"],
    },
  },
  {
    description: "TGA Image",
    accept: {
      "application/octet-stream": [".tga"],
    },
  },
  {
    description: "PNG Image",
    accept: {
      "image/png": [".png"],
    },
  },
  {
    description: "JPG Image",
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
    },
  },
  {
    description: "GFF / Blueprint",
    accept: {
      "application/octet-stream": [".gff", ".dlg", ".bic", ".jrl", ".res", ".fac", ".are", ".git", ".ifo"],
    },
  },
  {
    description: "Creature Template",
    accept: {
      "application/octet-stream": [".utc"],
    },
  },
  {
    description: "Door Template",
    accept: {
      "application/octet-stream": [".utd"],
    },
  },
  {
    description: "Placeable Template",
    accept: {
      "application/octet-stream": [".utp"],
    },
  },
  {
    description: "Merchant Template",
    accept: {
      "application/octet-stream": [".utm"],
    },
  },
  {
    description: "Sound Template",
    accept: {
      "application/octet-stream": [".uts"],
    },
  },
  {
    description: "Trigger Template",
    accept: {
      "application/octet-stream": [".utt"],
    },
  },
  {
    description: "Encounter Template",
    accept: {
      "application/octet-stream": [".ute"],
    },
  },
  {
    description: "Item Template",
    accept: {
      "application/octet-stream": [".uti"],
    },
  },
  {
    description: "Waypoint Template",
    accept: {
      "application/octet-stream": [".utw"],
    },
  },
  {
    description: "LIP Animation",
    accept: {
      "application/octet-stream": [".lip"],
    },
  },
  {
    description: "PHN File",
    accept: {
      "application/octet-stream": [".phn"],
    },
  },
  {
    description: "Audio File",
    accept: {
      "audio/wav": [".wav"],
      "audio/mpeg": [".mp3"],
    },
  },
  {
    description: "Video File",
    accept: {
      "application/octet-stream": [".bik"],
    },
  },
  {
    description: "MOD File",
    accept: {
      "application/octet-stream": [".mod"],
    },
  },
  {
    description: "ERF File",
    accept: {
      "application/octet-stream": [".erf", ".sav"],
    },
  },
  {
    description: "RIM File",
    accept: {
      "application/octet-stream": [".rim"],
    },
  },
  {
    description: "Model File",
    accept: {
      "application/octet-stream": [".mdl", ".mdl.ascii", ".mdx", ".wok", ".pwk", ".dwk"],
    },
  },
  {
    description: "Module File",
    accept: {
      "application/octet-stream": [".git", ".ifo"],
    },
  },
  {
    description: "Area File",
    accept: {
      "application/octet-stream": [".are"],
    },
  },
  {
    description: "Path File",
    accept: {
      "text/plain": [".pth"],
    },
  },
  {
    description: "Script Source (NSS)",
    accept: {
      "text/plain": [".nss"],
    },
  },
  {
    description: "Script Compiled (NCS)",
    accept: {
      "application/octet-stream": [".ncs"],
    },
  },
  {
    description: "VIS File",
    accept: {
      "text/plain": [".vis"],
    },
  },
  {
    description: "Texture Info (TXI)",
    accept: {
      "text/plain": [".txi"],
    },
  },
  {
    description: "Plain Text",
    accept: {
      "text/plain": [".txt"],
    },
  },
  {
    description: "Sound Set (SSF)",
    accept: {
      "application/octet-stream": [".ssf"],
    },
  },
  {
    description: "GUI File",
    accept: {
      "application/octet-stream": [".gui"],
    },
  },
  {
    description: "Layout File",
    accept: {
      "text/plain": [".lyt"],
    },
  },
  {
    description: "2D Array File",
    accept: {
      "application/octet-stream": [".2da"],
    },
  },
];

export const supportedFileDialogTypes: any[] = [
  {
    name: 'All Supported Formats',
    extensions: [
      '2da', 'are', 'bic', 'bik', 'dlg', 'dwk', 'erf', 'fac', 'git', 'gff', 'gui', 'ifo',
      'jpg', 'jpeg', 'jrl', 'lip', 'lyt', 'mdl', 'mdl.ascii', 'mdx', 'mod', 'mp3', 'ncs',
      'nss', 'phn', 'png', 'pth', 'pwk', 'res', 'rim', 'sav', 'ssf', 'tga', 'tpc', 'txi',
      'txt', 'utc', 'utd', 'ute', 'uti', 'utm', 'utp', 'uts', 'utt', 'utw', 'vis', 'wav',
      'wok',
    ],
  },
  {name: 'TPC Image', extensions: ['tpc']},
  {name: 'TGA Image', extensions: ['tga']},
  {name: 'PNG Image', extensions: ['png']},
  {name: 'JPG Image', extensions: ['jpg', 'jpeg']},
  {name: 'GFF / Blueprint', extensions: ['gff', 'dlg', 'bic', 'jrl', 'res', 'fac', 'are', 'git', 'ifo']},
  {name: 'Creature Template', extensions: ['utc']},
  {name: 'Door Template', extensions: ['utd']},
  {name: 'Placeable Template', extensions: ['utp']},
  {name: 'Merchant Template', extensions: ['utm']},
  {name: 'Sound Template', extensions: ['uts']},
  {name: 'Trigger Template', extensions: ['utt']},
  {name: 'Encounter Template', extensions: ['ute']},
  {name: 'Item Template', extensions: ['uti']},
  {name: 'Waypoint Template', extensions: ['utw']},
  {name: 'LIP Animation', extensions: ['lip']},
  {name: 'PHN File', extensions: ['phn']},
  {name: 'Audio File', extensions: ['wav', 'mp3']},
  {name: 'Video File', extensions: ['bik']},
  {name: 'MOD File', extensions: ['mod']},
  {name: 'ERF File', extensions: ['erf', 'sav']},
  {name: 'RIM File', extensions: ['rim']},
  {name: 'Model File', extensions: ['mdl', 'mdl.ascii', 'mdx', 'wok', 'pwk', 'dwk']},
  {name: 'Module File', extensions: ['git', 'ifo']},
  {name: 'Area File', extensions: ['are']},
  {name: 'Path File', extensions: ['pth']},
  {name: 'Script Source (NSS)', extensions: ['nss']},
  {name: 'Script Compiled (NCS)', extensions: ['ncs']},
  {name: 'VIS File', extensions: ['vis']},
  {name: 'Texture Info (TXI)', extensions: ['txi']},
  {name: 'Plain Text', extensions: ['txt']},
  {name: 'Sound Set (SSF)', extensions: ['ssf']},
  {name: 'GUI File', extensions: ['gui']},
  {name: 'Layout File', extensions: ['lyt']},
  {name: '2D Array File', extensions: ['2da']},
  {name: 'All Formats', extensions: ['*']},
];
