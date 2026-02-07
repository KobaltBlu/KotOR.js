import * as fs from "fs";
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
  buffer: Uint8Array;
  buffer2?: Uint8Array;
}

export class EditorFile extends EventListenerModel {

  protocol: EditorFileProtocol;

  //handle - is for file handling inside the web environment
  handle?: FileSystemFileHandle;
  handle2?: FileSystemFileHandle; //for dual file types like mdl/mdx
  useGameFileSystem: boolean = false;
  useProjectFileSystem: boolean = false;
  useSystemFileSystem: boolean = false;

  buffer: Uint8Array = new Uint8Array(0);
  buffer2?: Uint8Array; //for dual file types like mdl/mdx
  gffObject?: KotOR.GFFObject;
  isBlueprint: boolean = false;

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

    this.buffer = options.buffer || new Uint8Array(0);
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

  setGFFObject(gffObject: KotOR.GFFObject){
    this.gffObject = gffObject;
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
            this.reskey = KotOR.ResourceTypes[path_obj.ext];
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
        if(this.buffer instanceof Uint8Array && this.buffer.length){
          resolve({
            buffer: this.buffer,
          });
        }else{
          if(this.archive_path){
            const archive_path = pathParse(this.archive_path);
            console.log(archive_path.ext)

            switch(this.protocol){
              case EditorFileProtocol.BIF:
                const bif = new KotOR.BIFObject(this.archive_path);
                bif.load().then((archive: KotOR.BIFObject) => {
                  archive.getResourceBuffer(archive.getResource(this.resref, this.reskey)).then( (buffer: Uint8Array) => {
                    this.buffer = buffer;
                    resolve({
                      buffer: this.buffer,
                    });
                  });
                });
              break;
              case EditorFileProtocol.ERF:
              case EditorFileProtocol.MOD:
                const erf = new KotOR.ERFObject(this.archive_path);
                erf.load().then( (archive: KotOR.ERFObject) => {
                  archive.getResourceBufferByResRef(this.resref, this.reskey).then((buffer: Uint8Array) => {
                    this.buffer = buffer;
                    resolve({
                      buffer: this.buffer,
                    });
                  });
                });
              break;
              case EditorFileProtocol.RIM:
                const rim = new KotOR.RIMObject(this.archive_path);
                rim.load().then( (archive: KotOR.RIMObject) => {
                  archive.getResourceBuffer(archive.getResource(this.resref, this.reskey)).then( (buffer: Uint8Array) => {
                    this.buffer = buffer;
                    resolve({
                      buffer: this.buffer,
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
                      KotOR.GameFileSystem.readFile(this.path).then( (buffer: Uint8Array) => {
                      this.buffer = buffer;

                      resolve({
                        buffer: this.buffer,
                      });
                    }).catch( (err: any) => {
                      throw err;
                    });
                  }else if(this.useProjectFileSystem){
                    ProjectFileSystem.readFile(this.path).then( (buffer: Uint8Array) => {
                      this.buffer = buffer;

                      resolve({
                        buffer: this.buffer,
                      });
                    }).catch( (err: any) => {
                      throw err;
                    });
                  }else{
                    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
                      fs.readFile(this.path, (err, buffer) => {
                        if(err) throw err;

                        this.buffer = new Uint8Array(buffer);
                        resolve({
                          buffer: this.buffer,
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
                          this.buffer = new Uint8Array( await file.arrayBuffer() );
                          resolve({
                            buffer: this.buffer,
                          });
                        }else{
                          //cannot open file
                          console.warn('EditorFile.readFile', 'unable to open file', this.protocol);
                          this.buffer = new Uint8Array(0);
                          resolve({
                            buffer: this.buffer,
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
              this.buffer = new Uint8Array(0);
              resolve({
                buffer: this.buffer,
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
            const key_mdl = KotOR.KEYManager.Key.getFileKey(this.resref, KotOR.ResourceTypes['mdl']);
            const key_mdx = KotOR.KEYManager.Key.getFileKey(this.resref, KotOR.ResourceTypes['mdx']);

            if((!(this.buffer instanceof Uint8Array) || !this.buffer?.length) && key_mdl){
              this.buffer = await KotOR.KEYManager.Key.getFileBuffer(key_mdl);
            }

            if((!(this.buffer2 instanceof Uint8Array) || !this.buffer2?.length) && key_mdx){
              this.buffer2 = await KotOR.KEYManager.Key.getFileBuffer(key_mdx);
            }

            resolve({
              buffer: this.buffer,
              buffer2: this.buffer2
            });
          break;
          case EditorFileProtocol.ERF:
          case EditorFileProtocol.MOD:
            const erf = new KotOR.ERFObject(this.archive_path);
            erf.load().then( async (archive: KotOR.ERFObject) => {
              //MDL
              if(!(this.buffer instanceof Uint8Array) || !this.buffer?.length){
                this.buffer = await archive.getResourceBufferByResRef(this.resref, KotOR.ResourceTypes['mdl']);
              }

              //MDX
              if(!(this.buffer2 instanceof Uint8Array) || !this.buffer2?.length){
                this.buffer2 = await archive.getResourceBufferByResRef(this.resref, KotOR.ResourceTypes['mdx']);
              }

              resolve({
                buffer: this.buffer,
                buffer2: this.buffer2
              });
            });
          break;
          case EditorFileProtocol.RIM:
            const rim = new KotOR.RIMObject(this.archive_path);
            rim.load().then( async (archive: KotOR.RIMObject) => {
              //MDL
              if(!(this.buffer instanceof Uint8Array) || !this.buffer?.length){
                this.buffer = await archive.getResourceBufferByResRef(this.resref, KotOR.ResourceTypes['mdl']);
              }

              //MDX
              if(!(this.buffer2 instanceof Uint8Array) || !this.buffer2?.length){
                this.buffer2 = await archive.getResourceBufferByResRef(this.resref, KotOR.ResourceTypes['mdx']);
              }

              resolve({
                buffer: this.buffer,
                buffer2: this.buffer2
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
                if(!(this.buffer instanceof Uint8Array) || !this.buffer?.length) this.buffer = await KotOR.GameFileSystem.readFile(this.path);

                //MDX
                if(!(this.buffer2 instanceof Uint8Array) || !this.buffer2?.length) this.buffer2 = await KotOR.GameFileSystem.readFile(this.path2);
              }catch(e){
                console.error(e);
              }

              resolve({
                buffer: this.buffer,
                buffer2: this.buffer2
              });
            }else if(this.useProjectFileSystem){
              try{
                //MDL
                if(!(this.buffer instanceof Uint8Array) || !this.buffer?.length) this.buffer = await ProjectFileSystem.readFile(this.path);

                //MDX
                if(!(this.buffer2 instanceof Uint8Array) || !this.buffer2?.length) this.buffer2 = await ProjectFileSystem.readFile(this.path2);
              }catch(e){
                console.error(e);
              }

              resolve({
                buffer: this.buffer,
                buffer2: this.buffer2,
              });
            }else{
              if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
                fs.readFile(this.path, (err, buffer) => {
                  if(err) throw err;

                  this.buffer = new Uint8Array(buffer);
                  fs.readFile(this.path2, (err, buffer2) => {
                    if(err) throw err;

                    this.buffer2 = new Uint8Array(buffer2);
                    resolve({
                      buffer: this.buffer,
                      buffer2: this.buffer2,
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
                      buffer: this.buffer,
                      buffer2: this.buffer2,
                    });
                    return;
                  }

                  let file = await this.handle.getFile();
                  if(file){
                    this.buffer = new Uint8Array( await file.arrayBuffer() );
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
                      buffer: this.buffer,
                      buffer2: this.buffer2,
                    });
                    return;
                  }

                  let file2 = await this.handle2.getFile();
                  if(file2){
                    this.buffer2 = new Uint8Array( await file2.arrayBuffer() );
                  }
                }

                resolve({
                  buffer: this.buffer,
                  buffer2: this.buffer2,
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

  /** Save to current path. Call TabState.save() on the owning tab to perform the actual save. */
  save(){
    // Stub: tab handles save via TabState.save() when user uses File → Save.
  }

  /** Save to a new path. Call TabState.saveAs() on the owning tab to perform the actual save. */
  saveAs(){
    // Stub: tab handles save-as via TabState.saveAs() when user uses File → Save As.
  }

  static From(editorFile: EditorFile){
    return new EditorFile(editorFile as EditorFileOptions);
  }

}
