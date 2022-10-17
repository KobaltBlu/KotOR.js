/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as fs from "fs";
import * as path from "path";
import { BinaryReader } from "../BinaryReader";
import { BinaryWriter } from "../BinaryWriter";
import { AsyncLoop } from "../utility/AsyncLoop";
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

    if(file instanceof Buffer){
      this.inMemory = true;
      this.buffer = file;
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

          this.Header.FileType = this.Reader.ReadChars(4);
          this.Header.FileVersion = this.Reader.ReadChars(4);

          this.Header.LanguageCount = this.Reader.ReadUInt32();
          this.Header.LocalizedStringSize = this.Reader.ReadUInt32();
          this.Header.EntryCount = this.Reader.ReadUInt32();
          this.Header.OffsetToLocalizedString = this.Reader.ReadUInt32();
          this.Header.OffsetToKeyList = this.Reader.ReadUInt32();
          this.Header.OffsetToResourceList = this.Reader.ReadUInt32();
          this.Header.BuildYear = this.Reader.ReadUInt32();
          this.Header.BuildDay = this.Reader.ReadUInt32();
          this.Header.DescriptionStrRef = this.Reader.ReadUInt32();
          this.Header.Reserved = this.Reader.ReadBytes(116);                 //Byte 116

          header = this.Reader = null;

          //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
          this.erfDataOffset = (this.Header.OffsetToResourceList + (this.Header.EntryCount * 8));
          header = Buffer.from(this.buffer, 0, this.erfDataOffset);
          this.Reader = new BinaryReader(header);

          this.Reader.Seek(this.Header.OffsetToLocalizedString);

          for (let i = 0; i < this.Header.LanguageCount; i++) {
            let language: ERFLanguage = {} as ERFLanguage;
            language.LanguageID = this.Reader.ReadUInt32();
            language.StringSize = this.Reader.ReadUInt32();
            language.String = this.Reader.ReadChars(language.StringSize);
            this.LocalizedStrings.push(language);
          }

          this.Reader.Seek(this.Header.OffsetToKeyList);

          for (let i = 0; i < this.Header.EntryCount; i++) {
            let key: ERFKeyEntry = {} as ERFKeyEntry;
            key.ResRef = this.Reader.ReadChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
            key.ResID = this.Reader.ReadUInt32();
            key.ResType = this.Reader.ReadUInt16();
            key.Unused = this.Reader.ReadUInt16();
            this.KeyList.push(key);
          }

          this.Reader.Seek(this.Header.OffsetToResourceList);

          for (let i = 0; i < this.Header.EntryCount; i++) {
            let resource: ERFResource = {} as ERFResource;
            resource.OffsetToResource = this.Reader.ReadUInt32();
            resource.ResourceSize = this.Reader.ReadUInt32();
            this.Resources.push(resource);
          }

          header = this.Reader = null;

          if(typeof onComplete == 'function')
            onComplete(this);

        }else{
          console.log('erf', this.resource_path);
          fs.open(this.resource_path, 'r', (e, fd) => {
            if (e) {
              console.error('ERFObject', 'ERF Header Read', e);
              if(typeof onError == 'function')
                onError(undefined);
              return;
            }
            let header = Buffer.alloc(HeaderSize);
            fs.read(fd, header, 0, HeaderSize, 0, (e, num, buffer) => {
              this.Reader = new BinaryReader(buffer);

              this.Header.FileType = this.Reader.ReadChars(4);
              this.Header.FileVersion = this.Reader.ReadChars(4);

              this.Header.LanguageCount = this.Reader.ReadUInt32();
              this.Header.LocalizedStringSize = this.Reader.ReadUInt32();
              this.Header.EntryCount = this.Reader.ReadUInt32();
              this.Header.OffsetToLocalizedString = this.Reader.ReadUInt32();
              this.Header.OffsetToKeyList = this.Reader.ReadUInt32();
              this.Header.OffsetToResourceList = this.Reader.ReadUInt32();
              this.Header.BuildYear = this.Reader.ReadUInt32();
              this.Header.BuildDay = this.Reader.ReadUInt32();
              this.Header.DescriptionStrRef = this.Reader.ReadUInt32();
              this.Header.Reserved = this.Reader.ReadBytes(116);               //Byte 116

              header = null;

              //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
              this.erfDataOffset = (this.Header.OffsetToResourceList + (this.Header.EntryCount * 8));
              header = Buffer.alloc(this.erfDataOffset);
              fs.read(fd, header, 0, this.erfDataOffset, 0, (e, num, buffer2) => {
                this.Reader.reuse(buffer2);

                this.Reader.Seek(this.Header.OffsetToLocalizedString);

                for (let i = 0; i < this.Header.LanguageCount; i++) {
                  let language: ERFLanguage = {} as ERFLanguage;
                  language.LanguageID = this.Reader.ReadUInt32();
                  language.StringSize = this.Reader.ReadUInt32();
                  language.String = this.Reader.ReadChars(language.StringSize);
                  this.LocalizedStrings.push(language);
                }

                this.Reader.Seek(this.Header.OffsetToKeyList);

                for (let i = 0; i < this.Header.EntryCount; i++) {
                  let key: ERFKeyEntry = {} as ERFKeyEntry;
                  key.ResRef = this.Reader.ReadChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
                  key.ResID = this.Reader.ReadUInt32();
                  key.ResType = this.Reader.ReadUInt16();
                  key.Unused = this.Reader.ReadUInt16();
                  this.KeyList.push(key);
                }

                this.Reader.Seek(this.Header.OffsetToResourceList);

                for (let i = 0; i < this.Header.EntryCount; i++) {
                  let resource: ERFResource = {} as ERFResource;
                  resource.OffsetToResource = this.Reader.ReadUInt32();
                  resource.ResourceSize = this.Reader.ReadUInt32();
                  this.Resources.push(resource);
                }

                header = this.Reader = null;

                fs.close(fd, (e: any) => {

                  if(typeof onComplete == 'function')
                    onComplete(this);

                  if (e) {
                    console.error('ERFObject', "close error:  " + e.message);
                  } else {
                    console.log('ERFObject', "File was closed!");
                  }
                });

              });

            });

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
          fs.open(this.resource_path, 'r', (e, fd) => {
            let buffer = Buffer.alloc(resource.ResourceSize);
            fs.read(fd, buffer, 0, buffer.length, resource.OffsetToResource, function(err, br, buf) {
              fs.close(fd, function(e) {
                if(typeof onComplete === 'function')
                  onComplete(buf);
              });
            });
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
    let resources = [];
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
      if(resource){
        if(this.inMemory){
          let buffer = Buffer.from(this.buffer, resource.OffsetToResource, resource.OffsetToResource + (resource.ResourceSize - 1));
          fs.writeFile(path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)), buffer, (err) => {
            if (err) console.log(err);

            if(onComplete != null)
              onComplete(buffer);

          });
        }else{
          fs.open(this.resource_path, 'r', function(err, fd) {
            if (err) {
              console.log('ERF Read', err.message);
              return;
            }
            try{
            let buffer = Buffer.alloc(resource.ResourceSize);
              fs.read(fd, buffer, 0, resource.ResourceSize, resource.OffsetToResource, function(err, num, buffer2) {
                console.log('ERF Export', 'Writing File', path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)));
                fs.writeFile(path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)), buffer2, (err) => {
                  if (err) console.log(err);

                  if(onComplete != null)
                    onComplete(buffer);

                });

              });
            }catch(e){
              console.log(resource);
              console.error(e);

              if(onComplete != null)
                onComplete(undefined);
            }
          });
        }
      }else{
        if(onComplete != null)
          onComplete(new ArrayBuffer(0));
      }
    }else{
      if(onComplete != null)
        onComplete(new ArrayBuffer(0));
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
        throw 'Failed to export: Missing file path.';
      }

      let buffer = this.getExportBuffer();

      fs.writeFile( file, buffer, (err) => {
        if (err){
          console.log(err);
          if(typeof onError === 'function')
            onError(err);

          reject();
        }else{
          if(typeof onExport === 'function')
            onExport(err);

          resolve();
        }
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

    output.WriteString(this.Header.FileType);
    output.WriteString(this.Header.FileVersion);
    output.WriteUInt32(this.Header.LanguageCount);
    output.WriteUInt32(this.Header.LocalizedStringSize);
    output.WriteUInt32(this.Header.EntryCount);
    output.WriteUInt32(this.Header.OffsetToLocalizedString);
    output.WriteUInt32(this.Header.OffsetToKeyList);
    output.WriteUInt32(this.Header.OffsetToResourceList);
    output.WriteUInt32(new Date().getFullYear() - 1900);
    output.WriteUInt32(ERFObject.DayOfTheYear());
    output.WriteUInt32(0);
    output.WriteBytes(Buffer.alloc(116));

    //LocalStrings
    for(let i = 0; i < this.LocalizedStrings.length; i++){
      output.WriteUInt32(this.LocalizedStrings[i].LanguageID);
      output.WriteUInt32(this.LocalizedStrings[i].StringSize);
      output.WriteString(this.LocalizedStrings[i].String);
    }

    //Key List
    for(let i = 0; i < this.KeyList.length; i++){
      output.WriteString( this.KeyList[i].ResRef.padEnd(16, '\0').substr(0, 16) );
      output.WriteUInt32( this.KeyList[i].ResID );
      output.WriteUInt16( this.KeyList[i].ResType );
      output.WriteUInt16( 0 );
    }

    //Resource List
    for(let i = 0; i < this.Resources.length; i++){
      output.WriteUInt32( this.Resources[i].OffsetToResource );
      output.WriteUInt32( this.Resources[i].ResourceSize );
    }

    //Data
    for(let i = 0; i < this.Resources.length; i++){
      output.WriteBytes( this.Resources[i].data );
    }

    return output.buffer;
  }

  static _erfCache: any = {};
  
  static DayOfTheYear(date?: Date) {
    if(!date){
      date = new Date(Date.now());
    }
  
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
  };

}
