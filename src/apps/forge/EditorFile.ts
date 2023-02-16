import * as fs from "fs";
import isBuffer from "is-buffer";
import { ForgeState } from "./states/ForgeState";
import { FileLocationType } from "./enum/FileLocationType";
import { EditorFileOptions } from "./interfaces/EditorFileOptions";
import { Project } from "./Project";
import { pathParse } from "./helpers/PathParse";
import { EventListenerModel } from "./EventListenerModel";
import * as KotOR from "../../KotOR";

export type EditorFileEventListenerTypes =
  'onNameChanged'|'onSaveStateChanged'|'onSaved'

export interface EditorFileEventListeners {
  onNameChanged: Function[],
  onSaveStateChanged: Function[],
  onSaved: Function[],
}

export class EditorFile extends EventListenerModel {

  //handle - is for file handling inside the web environment
  handle?: FileSystemFileHandle;
  handle2?: FileSystemFileHandle; //for dual file types like mdl/mdx
  useGameFileSystem: boolean = false;

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

  protected eventListeners: EditorFileEventListeners = {
    onNameChanged: [],
    onSaveStateChanged: [],
    onSaved: [],
  };

  get unsaved_changes(){
    return this._unsaved_changes;
  };

  set unsaved_changes(value){
    this._unsaved_changes = ( value || (this.location == FileLocationType.OTHER) ) ? true : false;
    this.processEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', [this]);
    if(!this.unsaved_changes) this.updateOpenedFiles();
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
      useGameFileSystem: false
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
      let path_obj = pathParse(this.path);

      this.location = FileLocationType.LOCAL;

      //Test for archive file path
      if(this.path.indexOf('?') >= 0){
        let pth = this.path.split('?');
        this.path = pth[1];
        this.archive_path = pth[0];
        this.location = FileLocationType.ARCHIVE;
        path_obj = pathParse(this.path);
      }

      if(path_obj.name){
        this.resref = path_obj.name;
      }

      if(!this.reskey){
        this.reskey = KotOR.ResourceTypes[path_obj.ext.slice(1)];
      }

      this.ext = KotOR.ResourceTypes.getKeyByValue(this.reskey);
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

  async readFile( onLoad?: Function ){

    if(this.reskey == KotOR.ResourceTypes.mdl || this.reskey == KotOR.ResourceTypes.mdx){
      //Mdl / Mdx Special Loader
      if(this.archive_path){
        let archive_path = pathParse(this.archive_path);
        switch(archive_path.ext.slice(1)){
          case 'bif':
            new KotOR.BIFObject(this.archive_path, (archive: KotOR.BIFObject) => {

              if(!isBuffer(this.buffer)){
                archive.GetResourceData(archive.GetResourceByLabel(this.resref, this.reskey), (buffer: Buffer) => {
                  this.buffer = Buffer.from(buffer);
                  let mdl_mdx_key = KotOR.ResourceTypes.mdx;
                  if(this.reskey == KotOR.ResourceTypes.mdx){
                    mdl_mdx_key = KotOR.ResourceTypes.mdl;
                    archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                      this.buffer2 = Buffer.from(buffer);
                      if(typeof onLoad === 'function'){
                        onLoad(buffer, this.buffer);
                      }
                    });
                  }else{
                    archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                      this.buffer2 = Buffer.from(buffer);
                      if(typeof onLoad === 'function'){
                        onLoad(this.buffer, buffer);
                      }
                    });
                  }
                });
              }else{
                let mdl_mdx_key = KotOR.ResourceTypes.mdx;
                if(this.reskey == KotOR.ResourceTypes.mdx){
                  mdl_mdx_key = KotOR.ResourceTypes.mdl;
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                    this.buffer2 = Buffer.from(buffer);
                    if(typeof onLoad === 'function'){
                      onLoad(buffer, this.buffer);
                    }
                  });
                }else{
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                    this.buffer2 = Buffer.from(buffer);
                    if(typeof onLoad === 'function'){
                      onLoad(this.buffer, buffer);
                    }
                  });
                }
              }

            });
          break;
          case 'erf':
          case 'mod':
            new KotOR.ERFObject(this.archive_path, (archive: KotOR.ERFObject) => {

              if(!isBuffer(this.buffer)){
                archive.getRawResource(this.resref, this.reskey, (buffer: Buffer) => {
                  this.buffer = Buffer.from(buffer);
                  let mdl_mdx_key = KotOR.ResourceTypes.mdx;
                  if(this.reskey == KotOR.ResourceTypes.mdx){
                    mdl_mdx_key = KotOR.ResourceTypes.mdl;
                    archive.getRawResource(this.resref, mdl_mdx_key, (buffer: Buffer) => {
                      this.buffer2 = Buffer.from(buffer);
                      if(typeof onLoad === 'function'){
                        onLoad(buffer, this.buffer);
                      }
                    });
                  }else{
                    archive.getRawResource(this.resref, mdl_mdx_key, (buffer: Buffer) => {
                      this.buffer2 = Buffer.from(buffer);
                      if(typeof onLoad === 'function'){
                        onLoad(this.buffer, buffer);
                      }
                    });
                  }
                });
              }else{
                let mdl_mdx_key = KotOR.ResourceTypes.mdx;
                if(this.reskey == KotOR.ResourceTypes.mdx){
                  mdl_mdx_key = KotOR.ResourceTypes.mdl;
                  archive.getRawResource(this.resref, mdl_mdx_key, (buffer: Buffer) => {
                    this.buffer2 = Buffer.from(buffer);
                    if(typeof onLoad === 'function'){
                      onLoad(buffer, this.buffer);
                    }
                  });
                }else{
                  archive.getRawResource(this.resref, mdl_mdx_key, (buffer: Buffer) => {
                    this.buffer2 = Buffer.from(buffer);
                    if(typeof onLoad === 'function'){
                      onLoad(this.buffer, buffer);
                    }
                  });
                }
              }

            });
          break;
          case 'rim':
            new KotOR.RIMObject(this.archive_path, (archive: KotOR.RIMObject) => {

              if(!isBuffer(this.buffer)){
                archive.GetResourceData(archive.GetResourceByLabel(this.resref, this.reskey), (buffer: Buffer) => {
                  this.buffer = buffer;
                  let mdl_mdx_key = KotOR.ResourceTypes.mdx;
                  if(this.reskey == KotOR.ResourceTypes.mdx){
                    mdl_mdx_key = KotOR.ResourceTypes.mdl;
                    archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                      this.buffer2 = Buffer.from(buffer);
                      if(typeof onLoad === 'function'){
                        onLoad(buffer, this.buffer);
                      }
                    });
                  }else{
                    archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                      this.buffer2 = Buffer.from(buffer);
                      if(typeof onLoad === 'function'){
                        onLoad(this.buffer, buffer);
                      }
                    });
                  }
                });
              }else{
                let mdl_mdx_key = KotOR.ResourceTypes.mdx;
                if(this.reskey == KotOR.ResourceTypes.mdx){
                  mdl_mdx_key = KotOR.ResourceTypes.mdl;
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                    this.buffer2 = Buffer.from(buffer);
                    if(typeof onLoad === 'function'){
                      onLoad(buffer, this.buffer);
                    }
                  });
                }else{
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                    this.buffer2 = Buffer.from(buffer);
                    if(typeof onLoad === 'function'){
                      onLoad(this.buffer, buffer);
                    }
                  });
                }
              }

            });
          break;
        }
      }else{
        if(isBuffer(this.buffer)){

          if(isBuffer(this.buffer2)){
            if(typeof onLoad === 'function'){
              onLoad(this.buffer, this.buffer2);
            }
          }else{
            if(typeof onLoad === 'function'){
              this.buffer2 = Buffer.alloc(0);
              onLoad(this.buffer, this.buffer2);
            }
          }

        }else{
          //Load the MDL file
          fs.readFile(this.path, (err, buffer) => {
            if(err) throw err;

            //Load the MDX file
            fs.readFile(this.path2, (err, buffer2) => {
              if(err) throw err;

              if(typeof onLoad === 'function'){
                this.buffer = Buffer.from(buffer);
                this.buffer2 = Buffer.from(buffer2);
                onLoad(this.buffer, this.buffer2);
              }

            });

          });

        }

      }
    }else{
      //Common Loader
      if(isBuffer(this.buffer)){
        if(typeof onLoad === 'function'){
          onLoad(this.buffer);
        }
      }else{

        if(this.archive_path){
          let archive_path = pathParse(this.archive_path);
          console.log(archive_path.ext.slice(1))
          switch(archive_path.ext.slice(1)){
            case 'bif':
              new KotOR.BIFObject(this.archive_path, (archive: KotOR.BIFObject) => {

                archive.GetResourceData(archive.GetResourceByLabel(this.resref, this.reskey), (buffer: Buffer) => {
                  this.buffer = buffer;
                  if(typeof onLoad === 'function'){
                    onLoad(this.buffer);
                  }
                });

              });
            break;
            case 'erf':
            case 'mod':
              new KotOR.ERFObject(this.archive_path, (archive: KotOR.ERFObject) => {

                archive.getRawResource(this.resref, this.reskey, (buffer: Buffer) => {
                  this.buffer = buffer;
                  if(typeof onLoad === 'function'){
                    onLoad(this.buffer);
                  }
                });

              })
            break;
            case 'rim':
              new KotOR.RIMObject(this.archive_path, (archive: KotOR.RIMObject) => {

                archive.GetResourceData(archive.GetResourceByLabel(this.resref, this.reskey), (buffer: Buffer) => {
                  this.buffer = buffer;
                  if(typeof onLoad === 'function'){
                    onLoad(this.buffer);
                  }
                });

              })
            break;
          }
        }else{
          if(typeof this.path === 'string'){
            if(this.useGameFileSystem){
              KotOR.GameFileSystem.readFile(this.path).then( (buffer: Buffer) => {
                this.buffer = buffer;
  
                if(typeof onLoad === 'function'){
                  onLoad(this.buffer);
                }
              }).catch( (err: any) => {
                throw err;
              })
            }else{
              if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
                fs.readFile(this.path, (err, buffer) => {

                  if(err) throw err;

                  this.buffer = Buffer.from(buffer);

                  if(typeof onLoad === 'function'){
                    onLoad(this.buffer);
                  }

                });
              }else{
                if(this.handle){
                  if(await this.handle.queryPermission({mode: 'readwrite'})){
                    let file = await this.handle.getFile();
                    this.buffer = Buffer.from( await file.arrayBuffer() );
                    if(typeof onLoad === 'function'){
                      onLoad(this.buffer);
                    }
                  }else if( await this.handle.requestPermission({mode: 'readwrite'}) ){
                    let file = await this.handle.getFile();
                    this.buffer = Buffer.from( await file.arrayBuffer() );
                    if(typeof onLoad === 'function'){
                      onLoad(this.buffer);
                    }
                  }else{
                    //cannot open file
                  }
                }
              }
            }
          }else{
            this.buffer = Buffer.alloc(0);
            if(typeof onLoad === 'function'){
              onLoad(this.buffer);
            }
          }
        }

      }
    }

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

  updateOpenedFiles(){
    try{
      const recent_files = ForgeState.getRecentFiles();
      //Update the opened files list
      let file_path = this.getPath();
      if(file_path){
        const index = recent_files.findIndex( (file: EditorFile) => {
          return file.getPath() == file_path;
        })
        if (index >= 0) {
          recent_files.splice(index, 1);
        }

        //Append this file to the beginning of the list
        recent_files.unshift(this);
        KotOR.ConfigClient.save(null as any, true); //Save the configuration silently

        //Notify the project we have opened a new file
        if(ForgeState.Project instanceof Project){
          ForgeState.Project.addToOpenFileList(this);
        }
      }
    }catch(e){
      console.error(e);
    }
  }

  save(){
    //stub
  }

  saveAs(){
    //stub
  }

}
