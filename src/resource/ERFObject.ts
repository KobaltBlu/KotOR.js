/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import isBuffer from "is-buffer";
import * as path from "path";
import { BinaryReader } from "../BinaryReader";
import { BinaryWriter } from "../BinaryWriter";
import { AsyncLoop } from "../utility/AsyncLoop";
import { GameFileSystem } from "../utility/GameFileSystem";
import { ResourceTypes } from "./ResourceTypes";

/* @file
 * The ERFObject class.
 */

export interface ERFObjectHeader {
  FileType: string;
  FileVersion: string;
  LanguageCount: number;
  LocalizedStringSize: number;
  EntryCount: number;
  OffsetToLocalizedString: number;
  OffsetToKeyList: number;
  OffsetToResourceList: number;
  BuildYear: number;
  BuildDay: number;
  DescriptionStrRef: number;
  Reserved: Buffer;
}

export interface ERFLanguage {
  LanguageID: number;
  StringSize: number;
  String: string;
}

export interface ERFKeyEntry {
  ResRef: string;
  ResID: number;
  ResType: number;
  Unused: number;
}

export interface ERFResource {
  OffsetToResource: number;
  ResourceSize: number;
  data: Buffer;
}
  
const HeaderSize = 160;

export class ERFObject {
  resource_path: string;
  // file: string | Buffer;
  LocalizedStrings: ERFLanguage[];
  KeyList: ERFKeyEntry[];
  Resources: ERFResource[];
  Header: ERFObjectHeader;
  inMemory: boolean;
  buffer: Buffer;
  pathInfo: path.ParsedPath;
  Reader: BinaryReader;
  erfDataOffset: number;
  group: string = 'erf';

  constructor(file?: string|Buffer, onComplete?: Function, onError?: Function){
    this.LocalizedStrings = [];
    this.KeyList = [];
    this.Resources = [];

    this.Header = {
      FileType: 'MOD ',
      FileVersion: 'V1.0'
    } as ERFObjectHeader;

    if(isBuffer(file)){
      this.inMemory = true;
      this.buffer = file as Buffer;
    }else if(typeof file === 'string'){
      this.resource_path = file;
      this.inMemory = false;
      this.pathInfo = path.parse(file);
    }

    if(typeof file != 'undefined'){
      try{
        if(this.inMemory){

          let header = Buffer.from(this.buffer, 0, HeaderSize);
          this.Reader = new BinaryReader(header);

          this.Header.FileType = this.Reader.readChars(4);
          this.Header.FileVersion = this.Reader.readChars(4);

          this.Header.LanguageCount = this.Reader.readUInt32();
          this.Header.LocalizedStringSize = this.Reader.readUInt32();
          this.Header.EntryCount = this.Reader.readUInt32();
          this.Header.OffsetToLocalizedString = this.Reader.readUInt32();
          this.Header.OffsetToKeyList = this.Reader.readUInt32();
          this.Header.OffsetToResourceList = this.Reader.readUInt32();
          this.Header.BuildYear = this.Reader.readUInt32();
          this.Header.BuildDay = this.Reader.readUInt32();
          this.Header.DescriptionStrRef = this.Reader.readUInt32();
          this.Header.Reserved = this.Reader.readBytes(116);                 //Byte 116

          header = Buffer.allocUnsafe(0);
          this.Reader.dispose();

          //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
          this.erfDataOffset = (this.Header.OffsetToResourceList + (this.Header.EntryCount * 8));
          header = Buffer.from(this.buffer, 0, this.erfDataOffset);
          this.Reader.reuse(header);

          this.Reader.seek(this.Header.OffsetToLocalizedString);

          for (let i = 0; i < this.Header.LanguageCount; i++) {
            let language: ERFLanguage = {} as ERFLanguage;
            language.LanguageID = this.Reader.readUInt32();
            language.StringSize = this.Reader.readUInt32();
            language.String = this.Reader.readChars(language.StringSize);
            this.LocalizedStrings.push(language);
          }

          this.Reader.seek(this.Header.OffsetToKeyList);

          for (let i = 0; i < this.Header.EntryCount; i++) {
            let key: ERFKeyEntry = {} as ERFKeyEntry;
            key.ResRef = this.Reader.readChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
            key.ResID = this.Reader.readUInt32();
            key.ResType = this.Reader.readUInt16();
            key.Unused = this.Reader.readUInt16();
            this.KeyList.push(key);
          }

          this.Reader.seek(this.Header.OffsetToResourceList);

          for (let i = 0; i < this.Header.EntryCount; i++) {
            let resource: ERFResource = {} as ERFResource;
            resource.OffsetToResource = this.Reader.readUInt32();
            resource.ResourceSize = this.Reader.readUInt32();
            this.Resources.push(resource);
          }

          header = Buffer.allocUnsafe(0);
          this.Reader.dispose();

          if(typeof onComplete == 'function')
            onComplete(this);

        }else{
          // console.log('erf', this.resource_path);
          GameFileSystem.open(this.resource_path, 'r').then( (fd) => {
            let header = Buffer.alloc(HeaderSize);
            GameFileSystem.read(fd, header, 0, HeaderSize, 0).then( () => {
              this.Reader = new BinaryReader(header);

              this.Header.FileType = this.Reader.readChars(4);
              this.Header.FileVersion = this.Reader.readChars(4);

              this.Header.LanguageCount = this.Reader.readUInt32();
              this.Header.LocalizedStringSize = this.Reader.readUInt32();
              this.Header.EntryCount = this.Reader.readUInt32();
              this.Header.OffsetToLocalizedString = this.Reader.readUInt32();
              this.Header.OffsetToKeyList = this.Reader.readUInt32();
              this.Header.OffsetToResourceList = this.Reader.readUInt32();
              this.Header.BuildYear = this.Reader.readUInt32();
              this.Header.BuildDay = this.Reader.readUInt32();
              this.Header.DescriptionStrRef = this.Reader.readUInt32();
              this.Header.Reserved = this.Reader.readBytes(116);               //Byte 116

              header = Buffer.allocUnsafe(0);

              //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
              this.erfDataOffset = (this.Header.OffsetToResourceList + (this.Header.EntryCount * 8));
              header = Buffer.alloc(this.erfDataOffset);
              GameFileSystem.read(fd, header, 0, this.erfDataOffset, 0).then( () => {
                this.Reader.reuse(header);

                this.Reader.seek(this.Header.OffsetToLocalizedString);

                for (let i = 0; i < this.Header.LanguageCount; i++) {
                  let language: ERFLanguage = {} as ERFLanguage;
                  language.LanguageID = this.Reader.readUInt32();
                  language.StringSize = this.Reader.readUInt32();
                  language.String = this.Reader.readChars(language.StringSize);
                  this.LocalizedStrings.push(language);
                }

                this.Reader.seek(this.Header.OffsetToKeyList);

                for (let i = 0; i < this.Header.EntryCount; i++) {
                  let key: ERFKeyEntry = {} as ERFKeyEntry;
                  key.ResRef = this.Reader.readChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
                  key.ResID = this.Reader.readUInt32();
                  key.ResType = this.Reader.readUInt16();
                  key.Unused = this.Reader.readUInt16();
                  this.KeyList.push(key);
                }

                this.Reader.seek(this.Header.OffsetToResourceList);

                for (let i = 0; i < this.Header.EntryCount; i++) {
                  let resource: ERFResource = {} as ERFResource;
                  resource.OffsetToResource = this.Reader.readUInt32();
                  resource.ResourceSize = this.Reader.readUInt32();
                  this.Resources.push(resource);
                }

                header = Buffer.allocUnsafe(0);
                this.Reader.dispose();

                GameFileSystem.close(fd).then( () => {
                  if(typeof onComplete == 'function')
                    onComplete(this);

                  // console.log('ERFObject', "File was closed!");
                }).catch( (err) => {
                  if (err) {
                    console.error('ERFObject', "close error:  ", err);
                  }
                });

              }).catch( (err) => {
                console.error(err);
                if(typeof onComplete == 'function')
                  onComplete(undefined);
              });

            }).catch( (err) => {
              console.error(err);
              if(typeof onComplete == 'function')
                onComplete(undefined);
            });

          }).catch( (err) => {
            if (err) {
              console.error('ERFObject', 'ERF Header Read', err);
              if(typeof onError == 'function')
                onError(undefined);
              return;
            }
          });
        }
      }catch(e){
        console.error('ERFObject', 'ERF Open Error', e);
        if(typeof onComplete == 'function')
          onComplete(undefined);
      }
    }else{
      if(typeof onComplete == 'function')
        onComplete(undefined);
    }

  }

  getResourceBuffer(resource: ERFResource, onComplete?: Function){
    if (typeof resource != 'undefined') {
      if(resource.ResourceSize){
        if(this.inMemory){
          let buffer = Buffer.alloc(resource.ResourceSize);
          this.buffer.copy(buffer, 0, resource.OffsetToResource, resource.OffsetToResource + (resource.ResourceSize - 1));

          if(typeof onComplete == 'function')
            onComplete(buffer);
        }else{
          GameFileSystem.open(this.resource_path, 'r').then( (fd) => {
            let buffer = Buffer.alloc(resource.ResourceSize);
            GameFileSystem.read(fd, buffer, 0, buffer.length, resource.OffsetToResource).then( () => {
              GameFileSystem.close(fd).then( () => {
                if(typeof onComplete === 'function')
                  onComplete(buffer);
              }).catch( (err) => {
                if(typeof onComplete === 'function')
                  onComplete(Buffer.allocUnsafe(0));
              })
            }).catch( (err) => {
              if(typeof onComplete === 'function')
                onComplete(Buffer.allocUnsafe(0));
            })
          }).catch( (err) => {
            if(typeof onComplete === 'function')
              onComplete(Buffer.allocUnsafe(0));
          });
        }
      }else{
        if(typeof onComplete === 'function')
          onComplete(Buffer.allocUnsafe(0));
      }
    }else{
      if(typeof onComplete === 'function')
        onComplete(Buffer.allocUnsafe(0));
    }
  }

  getRawResource(key: string, restype: number, onComplete?: Function) {
    let resource = this.getResourceByKey(key, restype);
    if (typeof resource != 'undefined') {
      this.getResourceBuffer(resource, (buffer: Buffer) => {
        if(typeof onComplete === 'function')
          onComplete(buffer);
      });
    }else{
      if(typeof onComplete === 'function')
        onComplete(Buffer.alloc(0));
    }
  }

  getResourceByKey(key: string, restype: number){
    key = key.toLowerCase();
    for(let i = 0; i < this.KeyList.length; i++){
      let _key = this.KeyList[i];
      if (_key.ResRef == key && _key.ResType == restype) {
        return this.Resources[_key.ResID];
      }
    };
    return undefined;
  }

  getRawResourcesByType( restype: number, onFetch?: Function, onComplete?: Function) {
    let resources = this.getResourcesByType(restype) || [];
    let loop = new AsyncLoop({
      array: resources,
      onLoop: (resource: ERFResource, asyncLoop: AsyncLoop) => {
        this.getResourceBuffer(resource, (buffer: Buffer) => {
          if(typeof onFetch === 'function')
            onFetch(buffer);
        
          asyncLoop.next();
        });
      }
    });
    loop.iterate(() => {
      if(typeof onComplete === 'function')
        onComplete();
    });
  }

  getResourcesByType(restype: number){
    let resources: ERFResource[] = [];
    for(let i = 0; i < this.KeyList.length; i++){
      let _key = this.KeyList[i];
      if (_key.ResType == restype) {
        resources.push(this.Resources[_key.ResID]);
      }
    };
    return resources;
  }

  exportRawResource(directory: string, resref: string, restype: number = 0x000F, onComplete?: Function) {
    if(directory != null){
      let resource = this.getResourceByKey(resref, restype);
      if(!!resource){
        if(this.inMemory){
          let buffer = Buffer.from(this.buffer, resource.OffsetToResource, resource.OffsetToResource + (resource.ResourceSize - 1));
          GameFileSystem.writeFile(path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)), buffer).then( () => {
            if(typeof onComplete === 'function')
              onComplete(buffer);
          }).catch((err) => {
            console.error(err);
          });
        }else{
          GameFileSystem.open(this.resource_path, 'r').then( (fd) => {
            try{
              if(resource){
                let buffer = Buffer.alloc(resource.ResourceSize);
                GameFileSystem.read(fd, buffer, 0, resource.ResourceSize, resource.OffsetToResource).then( () => {
                  console.log('ERF Export', 'Writing File', path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)));
                  
                  GameFileSystem.writeFile(
                    path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)), buffer
                  ).then( () => {
                    if(typeof onComplete === 'function')
                      onComplete(buffer);
                  }).catch( (err) => {
                    console.error(err);
                  })
                }).catch( (err) => {
                  console.error(err);
                });
              }else{
                if(typeof onComplete === 'function')
                  onComplete(undefined);
              }
            }catch(e){
              console.log(resource);
              console.error(e);

              if(typeof onComplete === 'function')
                onComplete(undefined);
            }
          }).catch( (err) => {
            console.error('ERF Read', err.message);
          });
        }
      }else{
        if(typeof onComplete === 'function')
          onComplete(Buffer.alloc(0));
      }
    }else{
      if(typeof onComplete === 'function')
        onComplete(Buffer.alloc(0));
    }
  }

  addResource(resref: string, reskey: number, data: Buffer){

    let resId = this.Resources.push({
      OffsetToResource: -1,
      ResourceSize: data.length,
      data: data
    }) - 1;

    this.KeyList.push({
      ResRef: resref,
      ResID: resId,
      ResType: reskey,
      Unused: 0
    });

  }

  export( file: string, onExport?: Function, onError?: Function ){
    return new Promise( (resolve: Function, reject: Function) => {

      if(!file){
        reject('Failed to export: Missing file path.');
        return;
      }

      let buffer = this.getExportBuffer();
      GameFileSystem.writeFile( file, buffer ).then( () => {
        if(typeof onExport === 'function')
          onExport();

        resolve();
      }).catch( (err) => {
        console.error(err);
        if(typeof onError === 'function')
          onError(err);
        reject();
      });

    });
  }

  getExportBuffer(){

    let output = new BinaryWriter();

    let keyEleLen = 24;
    let resEleLen = 8;
    let locStringsLen = 0;

    for(let i = 0; i < this.LocalizedStrings.length; i++){
      locStringsLen += (this.LocalizedStrings[i].String.length + 8);
    }

    this.Header.OffsetToLocalizedString = HeaderSize;
    this.Header.LanguageCount = this.LocalizedStrings.length;
    this.Header.EntryCount = this.KeyList.length;
    this.Header.OffsetToKeyList = HeaderSize + locStringsLen;
    this.Header.OffsetToResourceList = HeaderSize + locStringsLen + (this.Header.EntryCount * keyEleLen);

    //Offset to the beginning of the data block
    let offset = this.Header.OffsetToResourceList + (this.Header.EntryCount * resEleLen);
    //Update the resource data offsets
    for(let i = 0; i < this.Resources.length; i++){
      this.Resources[i].OffsetToResource = offset;
      offset += this.Resources[i].ResourceSize;
    }

    output.writeString(this.Header.FileType);
    output.writeString(this.Header.FileVersion);
    output.writeUInt32(this.Header.LanguageCount);
    output.writeUInt32(this.Header.LocalizedStringSize);
    output.writeUInt32(this.Header.EntryCount);
    output.writeUInt32(this.Header.OffsetToLocalizedString);
    output.writeUInt32(this.Header.OffsetToKeyList);
    output.writeUInt32(this.Header.OffsetToResourceList);
    output.writeUInt32(new Date().getFullYear() - 1900);
    output.writeUInt32(ERFObject.DayOfTheYear());
    output.writeUInt32(0);
    output.writeBytes(Buffer.alloc(116));

    //LocalStrings
    for(let i = 0; i < this.LocalizedStrings.length; i++){
      output.writeUInt32(this.LocalizedStrings[i].LanguageID);
      output.writeUInt32(this.LocalizedStrings[i].StringSize);
      output.writeString(this.LocalizedStrings[i].String);
    }

    //Key List
    for(let i = 0; i < this.KeyList.length; i++){
      output.writeString( this.KeyList[i].ResRef.padEnd(16, '\0').substr(0, 16) );
      output.writeUInt32( this.KeyList[i].ResID );
      output.writeUInt16( this.KeyList[i].ResType );
      output.writeUInt16( 0 );
    }

    //Resource List
    for(let i = 0; i < this.Resources.length; i++){
      output.writeUInt32( this.Resources[i].OffsetToResource );
      output.writeUInt32( this.Resources[i].ResourceSize );
    }

    //Data
    for(let i = 0; i < this.Resources.length; i++){
      output.writeBytes( this.Resources[i].data );
    }

    return output.buffer;
  }

  getResourceByKeyAsync(key: ERFKeyEntry): Promise<Buffer> {
    return new Promise<Buffer>( (resolve, reject) => {
      this.getRawResource(key.ResRef, key.ResType, resolve);
    });
  }

  getResourceDataAsync(resref: string, restype: number): Promise<Buffer> {
    return new Promise<Buffer>( (resolve, reject) => {
      this.getRawResource(resref, restype, resolve);
    });
  }

  static _erfCache: any = {};
  
  static DayOfTheYear(date?: Date) {
    if(!date){
      date = new Date(Date.now());
    }
  
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
  };

}
