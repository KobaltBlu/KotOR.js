import * as fs from "fs";
import isBuffer from "is-buffer";
import { ForgeState } from "./states/ForgeState";
import { FileLocationType } from "./enum/FileLocationType";
import { EditorFileOptions } from "./interfaces/EditorFileOptions";
import { Project } from "./Project";
import { pathParse } from "./helpers/PathParse";
import { EventListenerModel } from "./EventListenerModel";
import * as KotOR from "../../KotOR";
import { ProjectFileSystem } from "./ProjectFileSystem";
import { EditorFileProtocol } from "./enum/EditorFileProtocol";

export type EditorFileEventListenerTypes =
  'onNameChanged'|'onSaveStateChanged'|'onSaved'

export interface EditorFileEventListeners {
  onNameChanged: Function[],
  onSaveStateChanged: Function[],
  onSaved: Function[],
}

export interface EditorFileReadResponse {
  buffer: Buffer;
  buffer2?: Buffer;
}

export class EditorFile extends EventListenerModel {

  protocol: EditorFileProtocol;

  //handle - is for file handling inside the web environment
  handle?: FileSystemFileHandle;
  handle2?: FileSystemFileHandle; //for dual file types like mdl/mdx
  useGameFileSystem: boolean = false;
  useProjectFileSystem: boolean = false;
  useSystemFileSystem: boolean = false;

  buffer?: Buffer;
  buffer2?: Buffer; //for dual file types like mdl/mdx
  
  path: any;
  path2: any; //for dual file types like mdl/mdx
  archive_path: any;
  archive_path2: any; //for dual file types like mdl/mdx

  location: any;
  _unsaved_changes: any;
  _resref: any;
  _reskey: any;
  _ext: any;

  get unsaved_changes(){
    return this._unsaved_changes;
  };

  set unsaved_changes(value){
    this._unsaved_changes = ( value || (this.location == FileLocationType.OTHER) ) ? true : false;
    this.processEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', [this]);
    if(!this.unsaved_changes) ForgeState.addRecentFile(this);
  }

  get resref(){
    return this._resref;
  }

  set resref(value){
    this._resref = value;
    this.processEventListener<EditorFileEventListenerTypes>('onNameChanged', [this]);
  }

  get reskey(){
    return this._reskey;
  }

  set reskey(value){
    // console.log('reskey', value);
    this._reskey = value;
    this._ext = KotOR.ResourceTypes.getKeyByValue(this.reskey);
    this.processEventListener<EditorFileEventListenerTypes>('onNameChanged', [this]);
  }

  get ext(){
    return this._ext;
  }

  set ext(value){
    // console.log('ext', value);
    this._ext = value;
    this._reskey = KotOR.ResourceTypes[value];
    this.processEventListener<EditorFileEventListenerTypes>('onNameChanged', [this]);
  }

  constructor( options: EditorFileOptions = {} ){
    super();
    options = Object.assign({
      path: null,
      path2: null,
      handle: this.handle,
      handle2: this.handle2,
      buffer: [],
      buffer2: [],
      resref: null,
      reskey: null,
      ext: null,
      archive_path: null,
      location: FileLocationType.OTHER,
      useGameFileSystem: false,
      useProjectFileSystem: false,
    }, options);

    this.buffer = options.buffer;
    this.buffer2 = options.buffer2;
    this.path = options.path;
    this.path2 = options.path2;
    this.ext = options.ext;
    this.resref = options.resref;
    this.reskey = options.reskey;
    this.archive_path = options.archive_path;
    this.location = options.location;
    this.unsaved_changes = false;
    this.handle = options.handle;
    this.handle2 = options.handle2;
    this.useGameFileSystem = !!options.useGameFileSystem;
    this.useProjectFileSystem = !!options.useProjectFileSystem;

    if(!this.ext && this.reskey){
      this.ext = KotOR.ResourceTypes.getKeyByValue(this.reskey);
    }

    this.setPath(this.path);

    if(!this.ext && this.reskey){
      this.ext = KotOR.ResourceTypes.getKeyByValue(this.reskey);
    }

    if(this.location == FileLocationType.OTHER)
      this.unsaved_changes = true;

  }

  setPath(filepath: string){
    this.path = filepath;
    if(typeof this.path === 'string'){
      this.path = filepath.replace(/\\/g, "/");
      const url = new URL(filepath);

      this.protocol = url.protocol as EditorFileProtocol;
      let pathname = url.pathname.replace(/%20/g, " ");

      //remove excess slashes on both ends
      pathname = pathname.replace(/^\/+|\/+$/g, '');

      if(pathname.indexOf('game.dir') >= 0){ //Use: GameFileSystem
        pathname = pathname.replace('game.dir', '').replace(/^\/+|\/+$/g, '');
        this.useGameFileSystem = true;
      }

      if(pathname.indexOf('project.dir') >= 0){ //Use: ProjectFileSystem
        pathname = pathname.replace('project.dir', '').replace(/^\/+|\/+$/g, '');
        this.useProjectFileSystem = true;
      }

      if(pathname.indexOf('system.dir') >= 0){ //Use: SystemFileSytem
        pathname = pathname.replace('system.dir', '').replace(/^\/+|\/+$/g, '');
        this.useSystemFileSystem = true;
      }
      pathname = pathname.replace(/^\/+|\/+$/g, '');

      const path_obj = pathParse(pathname);
      switch(this.protocol){
        case EditorFileProtocol.BIF:
        case EditorFileProtocol.ERF:
        case EditorFileProtocol.MOD:
        case EditorFileProtocol.RIM:
        case EditorFileProtocol.ZIP:
        case EditorFileProtocol._7ZIP:
          this.location = FileLocationType.ARCHIVE;
          this.archive_path = pathname;

          if(url.searchParams.has('resref')){
            this.resref = url.searchParams.get('resref');
          }

          if(url.searchParams.has('restype')){
            const ext = url.searchParams.get('restype') as string;
            this.ext = KotOR.ResourceTypes.getKeyByValue( ext );

            if(!this.reskey){
              this.reskey = KotOR.ResourceTypes[ext];
            }
          }

        break;
        case EditorFileProtocol.FILE:
          this.location = FileLocationType.LOCAL;
          this.path = pathname;
          this.resref = path_obj.name;
          if(!this.reskey){
            this.reskey = KotOR.ResourceTypes[path_obj.ext.slice(1)];
          }
    
          this.ext = KotOR.ResourceTypes.getKeyByValue(this.reskey);
        break;
        default:
          console.warn('Unhandled Protocol', this.protocol, url);
        break;
      }
      console.log('setPath', this);
    }
  }

  getPath(){
    //Check to see if the EditorFile has the path variable set.
    //If not it's because the file was created in memory and hasn't been saved to the HDD yet
    if(this.path && !this.archive_path){
      return this.path;
    }else if(this.archive_path){
      return this.archive_path + '?' + this.resref + '.' + this.ext;
    }
    return undefined;
  }

  async readFile(): Promise<EditorFileReadResponse> {
    return new Promise<EditorFileReadResponse>( async (resolve, reject) => {
      if(this.reskey == KotOR.ResourceTypes.mdl || this.reskey == KotOR.ResourceTypes.mdx){
        //Mdl / Mdx Special Loader
        resolve(
          await this.readMdlMdxFile()
        );
      }else{
        //Common Loader
        if(isBuffer(this.buffer) || this.buffer?.length){
          resolve({
            buffer: Buffer.from(this.buffer as Buffer),
          });
        }else{
          if(this.archive_path){
            let archive_path = pathParse(this.archive_path);
            console.log(archive_path.ext.slice(1))

            switch(this.protocol){
              case EditorFileProtocol.BIF:
                new KotOR.BIFObject(this.archive_path, (archive: KotOR.BIFObject) => {
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, this.reskey), (buffer: Buffer) => {
                    this.buffer = buffer;
                    resolve({
                      buffer: Buffer.from(this.buffer as Buffer),
                    });
                  });
                });
              break;
              case EditorFileProtocol.ERF:
              case EditorFileProtocol.MOD:
                new KotOR.ERFObject(this.archive_path, (archive: KotOR.ERFObject) => {
                  archive.getRawResource(this.resref, this.reskey, (buffer: Buffer) => {
                    this.buffer = buffer;
                    resolve({
                      buffer: Buffer.from(this.buffer as Buffer),
                    });
                  });
                });
              break;
              case EditorFileProtocol.RIM:
                new KotOR.RIMObject(this.archive_path, (archive: KotOR.RIMObject) => {
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, this.reskey), (buffer: Buffer) => {
                    this.buffer = buffer;
                    resolve({
                      buffer: Buffer.from(this.buffer as Buffer),
                    });
                  });
                });
              break;
              default:
                console.warn('EditorFile.readFile', 'unhandled protocol', this.protocol);
              break;
            }
          }else{
            if(typeof this.path === 'string'){
              switch(this.protocol){
                case EditorFileProtocol.FILE:
                  if(this.useGameFileSystem){
                    KotOR.GameFileSystem.readFile(this.path).then( (buffer: Buffer) => {
                      this.buffer = buffer;
        
                      resolve({
                        buffer: Buffer.from(this.buffer as Buffer),
                      });
                    }).catch( (err: any) => {
                      throw err;
                    });
                  }else if(this.useProjectFileSystem){
                    ProjectFileSystem.readFile(this.path).then( (buffer: Buffer) => {
                      this.buffer = buffer;
        
                      resolve({
                        buffer: Buffer.from(this.buffer as Buffer),
                      });
                    }).catch( (err: any) => {
                      throw err;
                    });
                  }else{
                    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
                      fs.readFile(this.path, (err, buffer) => {
                        if(err) throw err;
      
                        this.buffer = Buffer.from(buffer);
                        resolve({
                          buffer: Buffer.from(this.buffer as Buffer),
                        });
                      });
                    }else{
                      if(this.handle){
                        let granted = (await this.handle.queryPermission({mode: 'read'})) === 'granted';
                        if(!granted){
                          granted = (await this.handle.requestPermission({mode: 'read'})) === 'granted';
                        }
                        
                        if(granted){
                          let file = await this.handle.getFile();
                          this.buffer = Buffer.from( await file.arrayBuffer() );
                          resolve({
                            buffer: Buffer.from(this.buffer as Buffer),
                          });
                        }else{
                          //cannot open file
                          console.warn('EditorFile.readFile', 'unable to open file', this.protocol);
                          this.buffer = Buffer.alloc(0);
                          resolve({
                            buffer: Buffer.from(this.buffer as Buffer),
                          });
                        }
                      }
                    }
                  }
                break;
                default:
                  console.warn('EditorFile.readFile', 'unhandled protocol', this.protocol);
                break;
              }
            }else{
              console.warn('EditorFile.readFile', 'unable to open file', this.protocol);
              this.buffer = Buffer.alloc(0);
              resolve({
                buffer: Buffer.from(this.buffer as Buffer),
              });
            }
          }
  
        }
      }
    });
  }

  async readMdlMdxFile(): Promise<EditorFileReadResponse> {
    return new Promise<EditorFileReadResponse>( async (resolve, reject) => {
      if(this.archive_path){
        switch(this.protocol){
          case EditorFileProtocol.BIF:
            const key_mdl = KotOR.KEYManager.Key.GetFileKey(this.resref, KotOR.ResourceTypes['mdl']);
            const key_mdx = KotOR.KEYManager.Key.GetFileKey(this.resref, KotOR.ResourceTypes['mdx']);

            if((!isBuffer(this.buffer) || !this.buffer?.length) && key_mdl){
              this.buffer = await KotOR.KEYManager.Key.GetFileDataAsync(key_mdl);
            }

            if((!isBuffer(this.buffer2) || !this.buffer2?.length) && key_mdx){
              this.buffer2 = await KotOR.KEYManager.Key.GetFileDataAsync(key_mdx);
            }
            
            resolve({
              buffer: Buffer.from(this.buffer as Buffer),
              buffer2: this.buffer2 as Buffer
            });
          break;
          case EditorFileProtocol.ERF:
          case EditorFileProtocol.MOD:
            new KotOR.ERFObject(this.archive_path, async (archive: KotOR.ERFObject) => {
              //MDL
              if(!isBuffer(this.buffer) || !this.buffer?.length){
                this.buffer = await archive.getResourceDataAsync(this.resref, KotOR.ResourceTypes['mdl']);
              }

              //MDX
              if(!isBuffer(this.buffer2) || !this.buffer2?.length){
                this.buffer2 = await archive.getResourceDataAsync(this.resref, KotOR.ResourceTypes['mdx']);
              }

              resolve({
                buffer: Buffer.from(this.buffer as Buffer),
                buffer2: this.buffer2 as Buffer
              });
            });
          break;
          case EditorFileProtocol.RIM:
            new KotOR.RIMObject(this.archive_path, async (archive: KotOR.RIMObject) => {
              //MDL
              if(!isBuffer(this.buffer) || !this.buffer?.length){
                this.buffer = await archive.getResourceDataAsync(this.resref, KotOR.ResourceTypes['mdl']);
              }

              //MDX
              if(!isBuffer(this.buffer2) || !this.buffer2?.length){
                this.buffer2 = await archive.getResourceDataAsync(this.resref, KotOR.ResourceTypes['mdx']);
              }

              resolve({
                buffer: Buffer.from(this.buffer as Buffer),
                buffer2: this.buffer2 as Buffer
              });
            });
          break;
          default:

          break;
        }
      }else{
        switch(this.protocol){
          case EditorFileProtocol.FILE:
            if(this.useGameFileSystem){
              try{
                //MDL
                if(!isBuffer(this.buffer) || !this.buffer?.length) this.buffer = await KotOR.GameFileSystem.readFile(this.path);

                //MDX
                if(!isBuffer(this.buffer2) || !this.buffer2?.length) this.buffer2 = await KotOR.GameFileSystem.readFile(this.path2);
              }catch(e){
                console.error(e);
              }
  
              resolve({
                buffer: Buffer.from(this.buffer as Buffer),
                buffer2: Buffer.from(this.buffer2 as Buffer),
              });
            }else if(this.useProjectFileSystem){
              try{
                //MDL
                if(!isBuffer(this.buffer) || !this.buffer?.length) this.buffer = await ProjectFileSystem.readFile(this.path);
                
                //MDX
                if(!isBuffer(this.buffer2) || !this.buffer2?.length) this.buffer2 = await ProjectFileSystem.readFile(this.path2);
              }catch(e){
                console.error(e);
              }
  
              resolve({
                buffer: Buffer.from(this.buffer as Buffer),
                buffer2: Buffer.from(this.buffer2 as Buffer),
              });
            }else{
              if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
                fs.readFile(this.path, (err, buffer) => {
                  if(err) throw err;

                  this.buffer = Buffer.from(buffer);
                  fs.readFile(this.path2, (err, buffer2) => {
                    if(err) throw err;

                    this.buffer2 = Buffer.from(buffer2);
                    resolve({
                      buffer: Buffer.from(this.buffer as Buffer),
                      buffer2: Buffer.from(this.buffer2 as Buffer),
                    });
                  });
                });
              }else{
                //MDL
                let granted = false;
                if(this.handle){
                  granted = (await this.handle.queryPermission({mode: 'readwrite'})) === 'granted';
                  if(!granted){
                    granted = (await this.handle.requestPermission({mode: 'readwrite'})) === 'granted';
                  }

                  if(!granted){
                    console.warn('EditorFile.readFile', 'unable to open (mdl) file', this.protocol);
                    resolve({
                      buffer: Buffer.from(this.buffer as Buffer),
                      buffer2: Buffer.from(this.buffer2 as Buffer),
                    });
                    return;
                  }

                  let file = await this.handle.getFile();
                  if(file){
                    this.buffer = Buffer.from( await file.arrayBuffer() );
                  }
                }

                //MDX
                let granted2 = false;
                if(this.handle2){
                  granted2 = (await this.handle2.queryPermission({mode: 'read'})) === 'granted';
                  if(!granted2){
                    granted2 = (await this.handle2.requestPermission({mode: 'read'})) === 'granted';
                  }

                  if(!granted2){
                    console.warn('EditorFile.readFile', 'unable to open (mdx) file', this.protocol);
                    resolve({
                      buffer: Buffer.from(this.buffer as Buffer),
                      buffer2: Buffer.from(this.buffer2 as Buffer),
                    });
                    return;
                  }
                  
                  let file2 = await this.handle2.getFile();
                  if(file2){
                    this.buffer2 = Buffer.from( await file2.arrayBuffer() );
                  }
                }

                resolve({
                  buffer: Buffer.from(this.buffer as Buffer),
                  buffer2: Buffer.from(this.buffer2 as Buffer),
                });
              }
            }
          break;
          default:
            console.warn('EditorFile.readFile', 'unhandled protocol', this.protocol);
          break;
        }
      }
    });
  }

  getData(){
    return this.buffer;
  }

  getLocalPath(){
    if(!this.archive_path && this.path)
      return this.path;
    else
      return null;
  }

  getFilename(){
    return this.resref+'.'+this.ext;
  }

  getPrettyPath(){
    const parsed = pathParse(this.path);
    if(this.useGameFileSystem){
      if(this.archive_path){
        return `${this.protocol}//~/${this.archive_path}`;
      }
      
      return parsed.dir;
    }else if (this.useProjectFileSystem){
      if(this.archive_path){
        return `${this.protocol}//~/${this.archive_path}`;
      }
      
      return parsed.dir;
    }

    if(this.archive_path){
      return `${this.archive_path}`;
    }
      
    return parsed.dir;
  }

  save(){
    //stub
  }

  saveAs(){
    //stub
  }

  static From(editorFile: EditorFile){
    return new EditorFile(editorFile);
  }

}
