import { BIFObject } from "../resource/BIFObject";
import { ERFObject } from "../resource/ERFObject";
import { ResourceTypes } from "../resource/ResourceTypes";
import { RIMObject } from "../resource/RIMObject";
import { FileLocationType } from "./enum/FileLocationType";

import * as path from "path";
import * as fs from "fs";
import { Forge } from "./Forge";
import { Project } from "./Project";
import { ConfigClient } from "../utility/ConfigClient";
import isBuffer from "is-buffer";
import { ApplicationEnvironment, ApplicationProfile, GameFileSystem } from "../KotOR";

const path_parse = (filepath: string): {root:string, dir: string, base: string, ext: string, name: string} => {
  let parsed: {root:string, dir: string, base: string, ext: string, name: string} = 
    { root: '', dir: '', base: '', ext: '', name: '' };
  let sep = window.navigator.platform.toLocaleLowerCase() == 'win32' ? '\\' : '/';
  let parts = filepath.split(sep);
  let filename = parts.pop();
  let filename_parts = filename.split('.');
  let name = filename_parts[0];
  let ext = '';
  if(filename_parts.length > 1){
    ext = '.'+filename_parts[1];
  }
  parsed.dir = parts.join(sep);
  parsed.base = filename;
  parsed.ext = ext;
  parsed.name = name;
  return parsed;
};

export class EditorFile {

  //handle - is for file handling inside the web environment
  handle: FileSystemFileHandle;
  useGameFileSystem: boolean = false;

  buffer: Buffer;
  path: any;
  archive_path: any;
  location: any;
  onSavedStateChanged: any;
  buffer2: Buffer;
  _unsaved_changes: any;
  _resref: any;
  onNameChanged: any;
  _reskey: any;
  _ext: any;

  constructor( options: any = {} ){

    options = Object.assign({
      path: null,
      handle: this.handle,
      resref: null,
      restype: null,
      ext: null,
      archive_path: null,
      location: FileLocationType.OTHER,
      buffer: [],
      useGameFileSystem: false
    }, options);

    console.log(options);

    this.resref = options.resref;
    this.buffer = options.buffer;
    this.path = options.path;
    this.ext = options.ext;
    this.reskey = options.reskey;
    this.archive_path = options.archive_path;
    this.location = options.location;
    this.unsaved_changes = false;
    this.handle = options.handle;
    this.useGameFileSystem = options.useGameFileSystem;

    if(!this.ext && this.reskey){
      this.ext = ResourceTypes.getKeyByValue(this.reskey);
    }

    this.setPath(this.path);

    if(!this.ext && this.reskey){
      this.ext = ResourceTypes.getKeyByValue(this.reskey);
    }

    if(this.location == FileLocationType.OTHER)
      this.unsaved_changes = true;

    this.onSavedStateChanged = undefined;

  }

  setPath(filepath: string){
    this.path = filepath;
    if(typeof this.path === 'string'){
      let path_obj = path_parse(this.path);

      this.location = FileLocationType.LOCAL;

      //Test for archive file path
      if(this.path.indexOf('?') >= 0){
        let pth = this.path.split('?');
        this.path = pth[1];
        this.archive_path = pth[0];
        this.location = FileLocationType.ARCHIVE;
        path_obj = path_parse(this.path);
      }

      if(path_obj.name){
        this.resref = path_obj.name;
      }

      if(!this.reskey){
        this.reskey = ResourceTypes[path_obj.ext.slice(1)];
      }

      this.ext = ResourceTypes.getKeyByValue(this.reskey);
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

    if(this.reskey == ResourceTypes.mdl || this.reskey == ResourceTypes.mdx){
      //Mdl / Mdx Special Loader
      if(this.archive_path){
        let archive_path = path_parse(this.archive_path);
        switch(archive_path.ext.slice(1)){
          case 'bif':
            new BIFObject(this.archive_path, (archive: BIFObject) => {

              if(!isBuffer(this.buffer)){
                archive.GetResourceData(archive.GetResourceByLabel(this.resref, this.reskey), (buffer: Buffer) => {
                  this.buffer = buffer;
                  let mdl_mdx_key = ResourceTypes.mdx;
                  if(this.reskey == ResourceTypes.mdx){
                    mdl_mdx_key = ResourceTypes.mdl;
                    archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                      this.buffer2 = buffer;
                      if(typeof onLoad === 'function'){
                        onLoad(buffer, this.buffer);
                      }
                    });
                  }else{
                    archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                      this.buffer2 = buffer;
                      if(typeof onLoad === 'function'){
                        onLoad(this.buffer, buffer);
                      }
                    });
                  }
                });
              }else{
                let mdl_mdx_key = ResourceTypes.mdx;
                if(this.reskey == ResourceTypes.mdx){
                  mdl_mdx_key = ResourceTypes.mdl;
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                    this.buffer2 = buffer;
                    if(typeof onLoad === 'function'){
                      onLoad(buffer, this.buffer);
                    }
                  });
                }else{
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                    this.buffer2 = buffer;
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
            new ERFObject(this.archive_path, (archive: ERFObject) => {

              if(!isBuffer(this.buffer)){
                archive.getRawResource(this.resref, this.reskey, (buffer: Buffer) => {
                  this.buffer = buffer;
                  let mdl_mdx_key = ResourceTypes.mdx;
                  if(this.reskey == ResourceTypes.mdx){
                    mdl_mdx_key = ResourceTypes.mdl;
                    archive.getRawResource(this.resref, mdl_mdx_key, (buffer: Buffer) => {
                      this.buffer2 = buffer;
                      if(typeof onLoad === 'function'){
                        onLoad(buffer, this.buffer);
                      }
                    });
                  }else{
                    archive.getRawResource(this.resref, mdl_mdx_key, (buffer: Buffer) => {
                      this.buffer2 = buffer;
                      if(typeof onLoad === 'function'){
                        onLoad(this.buffer, buffer);
                      }
                    });
                  }
                });
              }else{
                let mdl_mdx_key = ResourceTypes.mdx;
                if(this.reskey == ResourceTypes.mdx){
                  mdl_mdx_key = ResourceTypes.mdl;
                  archive.getRawResource(this.resref, mdl_mdx_key, (buffer: Buffer) => {
                    this.buffer2 = buffer;
                    if(typeof onLoad === 'function'){
                      onLoad(buffer, this.buffer);
                    }
                  });
                }else{
                  archive.getRawResource(this.resref, mdl_mdx_key, (buffer: Buffer) => {
                    this.buffer2 = buffer;
                    if(typeof onLoad === 'function'){
                      onLoad(this.buffer, buffer);
                    }
                  });
                }
              }

            });
          break;
          case 'rim':
            new RIMObject(this.archive_path, (archive: RIMObject) => {

              if(!isBuffer(this.buffer)){
                archive.GetResourceData(archive.GetResourceByLabel(this.resref, this.reskey), (buffer: Buffer) => {
                  this.buffer = buffer;
                  let mdl_mdx_key = ResourceTypes.mdx;
                  if(this.reskey == ResourceTypes.mdx){
                    mdl_mdx_key = ResourceTypes.mdl;
                    archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                      this.buffer2 = buffer;
                      if(typeof onLoad === 'function'){
                        onLoad(buffer, this.buffer);
                      }
                    });
                  }else{
                    archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                      this.buffer2 = buffer;
                      if(typeof onLoad === 'function'){
                        onLoad(this.buffer, buffer);
                      }
                    });
                  }
                });
              }else{
                let mdl_mdx_key = ResourceTypes.mdx;
                if(this.reskey == ResourceTypes.mdx){
                  mdl_mdx_key = ResourceTypes.mdl;
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                    this.buffer2 = buffer;
                    if(typeof onLoad === 'function'){
                      onLoad(buffer, this.buffer);
                    }
                  });
                }else{
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer: Buffer) => {
                    this.buffer2 = buffer;
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
              onLoad(this.buffer, Buffer.alloc(0));
            }
          }

        }else{
          //Load the MDL file
          fs.readFile(this.path, (err, buffer) => {

            if(err) throw err;

            let root_dir = path_parse(this.path).dir;

            //Load the MDX file
            fs.readFile(path.join(root_dir, this.resref+'.mdx'), (err, buffer2) => {

              if(err) throw err;

              if(typeof onLoad === 'function'){
                this.buffer = buffer;
                this.buffer2 = buffer2;
                onLoad(buffer, buffer2);
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
          let archive_path = path_parse(this.archive_path);
          console.log(archive_path.ext.slice(1))
          switch(archive_path.ext.slice(1)){
            case 'bif':
              new BIFObject(this.archive_path, (archive: BIFObject) => {

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
              new ERFObject(this.archive_path, (archive: ERFObject) => {

                archive.getRawResource(this.resref, this.reskey, (buffer: Buffer) => {
                  this.buffer = buffer;
                  if(typeof onLoad === 'function'){
                    onLoad(this.buffer);
                  }
                });

              })
            break;
            case 'rim':
              new RIMObject(this.archive_path, (archive: RIMObject) => {

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
              GameFileSystem.readFile(this.path).then( (buffer: Buffer) => {
                this.buffer = buffer;
  
                if(typeof onLoad === 'function'){
                  onLoad(this.buffer);
                }
              }).catch( (err) => {
                throw err;
              })
            }else{
              if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
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

  setOnSavedStateChanged( listener: Function ){
    if(typeof listener === 'function') this.onSavedStateChanged = listener;
  }

  updateOpenedFiles(){
    const recent_files = ConfigClient.getRecentFiles();
    //Update the opened files list
    if(this.getPath()){
      const index = recent_files.indexOf(this.getPath());
      if (index >= 0) {
        recent_files.splice(index, 1);
      }

      //Append this file to the beginning of the list
      recent_files.unshift(this.getPath());
      ConfigClient.save(null, true); //Save the configuration silently

      //Notify the project we have opened a new file
      if(Forge.Project instanceof Project){
        Forge.Project.addToOpenFileList(this);
      }
    }
  }

  save(){
    //stub
  }

  saveAs(){
    //stub
  }

  get unsaved_changes(){
    return this._unsaved_changes;
  };

  set unsaved_changes(value){
    this._unsaved_changes = ( value || (this.location == FileLocationType.OTHER) ) ? true : false;
    if(typeof this.onSavedStateChanged === 'function') this.onSavedStateChanged(this);
    if(!this.unsaved_changes) this.updateOpenedFiles();
  }

  get resref(){
    return this._resref;
  }

  set resref(value){
    this._resref = value;
    if(typeof this.onNameChanged === 'function') this.onNameChanged(this);
  }

  get reskey(){
    return this._reskey;
  }

  set reskey(value){
    console.log('reskey', value);
    this._reskey = value;
    this._ext = ResourceTypes.getKeyByValue(this.reskey);
    if(typeof this.onNameChanged === 'function') this.onNameChanged(this);
  }

  get ext(){
    return this._ext;
  }

  set ext(value){
    console.log('ext', value);
    this._ext = value;
    this._reskey = ResourceTypes[value];
    if(typeof this.onNameChanged === 'function') this.onNameChanged(this);
  }

}
