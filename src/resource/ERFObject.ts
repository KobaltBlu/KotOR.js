import * as path from "path";
import { BinaryReader } from "../BinaryReader";
import { BinaryWriter } from "../BinaryWriter";
import { GameFileSystem } from "../utility/GameFileSystem";
import { ResourceTypes } from "./ResourceTypes";
import { IERFLanguage } from "../interface/resource/IERFLanguage";
import { IERFKeyEntry } from "../interface/resource/IERFKeyEntry";
import { IERFResource } from "../interface/resource/IERFResource";
import { IERFObjectHeader } from "../interface/resource/IERFObjectHeader";
  
const ERF_HEADER_SIZE = 160;

/**
 * ERFObject class.
 * 
 * Class representing a ERF archive file in memory.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ERFObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ERFObject {
  resource_path: string;
  buffer: Uint8Array;
  inMemory: boolean = false;
  
  localizedStrings: IERFLanguage[] = [];
  keyList: IERFKeyEntry[] = [];
  resources: IERFResource[] = [];
  header: IERFObjectHeader;
  pathInfo: path.ParsedPath;
  reader: BinaryReader;
  erfDataOffset: number;
  group: string = 'erf';

  constructor(file?: string|Uint8Array){
    this.localizedStrings = [];
    this.keyList = [];
    this.resources = [];

    this.header = {
      fileType: 'MOD ',
      fileVersion: 'V1.0'
    } as IERFObjectHeader;

    if(file instanceof Uint8Array){
      this.inMemory = true;
      this.buffer = file;
    }else if(typeof file === 'string'){
      this.resource_path = file;
      this.inMemory = false;
      this.pathInfo = path.parse(file);
    }
  }

  async load(): Promise<ERFObject> {
    if(!this.inMemory){
      await this.loadFromDisk();
      return this;
    }else{
      await this.loadFromBuffer();
      return this;
    }
  }

  async loadFromDisk(): Promise<void> {
    try{
      const fd = await GameFileSystem.open(this.resource_path, 'r');
      let header = new Uint8Array(ERF_HEADER_SIZE);
      await GameFileSystem.read(fd, header, 0, ERF_HEADER_SIZE, 0);
      this.reader = new BinaryReader(header);

      this.header.fileType = this.reader.readChars(4);
      this.header.fileVersion = this.reader.readChars(4);

      this.header.languageCount = this.reader.readUInt32();
      this.header.localizedStringSize = this.reader.readUInt32();
      this.header.entryCount = this.reader.readUInt32();
      this.header.offsetToLocalizedString = this.reader.readUInt32();
      this.header.offsetToKeyList = this.reader.readUInt32();
      this.header.offsetToResourceList = this.reader.readUInt32();
      this.header.buildYear = this.reader.readUInt32();
      this.header.buildDay = this.reader.readUInt32();
      this.header.DescriptionStrRef = this.reader.readUInt32();
      this.header.reserved = this.reader.readBytes(116);               //Byte 116

      header = new Uint8Array(0);

      //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
      this.erfDataOffset = (this.header.offsetToResourceList + (this.header.entryCount * 8));
      header = new Uint8Array(this.erfDataOffset);
      await GameFileSystem.read(fd, header, 0, this.erfDataOffset, 0);
      this.reader.reuse(header);

      this.reader.seek(this.header.offsetToLocalizedString);

      for (let i = 0; i < this.header.languageCount; i++) {
        let language: IERFLanguage = {} as IERFLanguage;
        language.languageId = this.reader.readUInt32();
        language.stringSize = this.reader.readUInt32();
        language.value = this.reader.readChars(language.stringSize);
        this.localizedStrings.push(language);
      }

      this.reader.seek(this.header.offsetToKeyList);

      for (let i = 0; i < this.header.entryCount; i++) {
        let key: IERFKeyEntry = {} as IERFKeyEntry;
        key.resRef = this.reader.readChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
        key.resId = this.reader.readUInt32();
        key.resType = this.reader.readUInt16();
        key.unused = this.reader.readUInt16();
        this.keyList.push(key);
      }

      this.reader.seek(this.header.offsetToResourceList);

      for (let i = 0; i < this.header.entryCount; i++) {
        let resource: IERFResource = {} as IERFResource;
        resource.offset = this.reader.readUInt32();
        resource.size = this.reader.readUInt32();
        this.resources.push(resource);
      }

      header = new Uint8Array(0);
      this.reader.dispose();

      await GameFileSystem.close(fd);
    }catch(e){
      console.error(e);
    }
  }

  async loadFromBuffer(): Promise<void> {
    let header = new Uint8Array(this.buffer.slice(0, ERF_HEADER_SIZE));
    this.reader = new BinaryReader(header);

    this.header.fileType = this.reader.readChars(4);
    this.header.fileVersion = this.reader.readChars(4);

    this.header.languageCount = this.reader.readUInt32();
    this.header.localizedStringSize = this.reader.readUInt32();
    this.header.entryCount = this.reader.readUInt32();
    this.header.offsetToLocalizedString = this.reader.readUInt32();
    this.header.offsetToKeyList = this.reader.readUInt32();
    this.header.offsetToResourceList = this.reader.readUInt32();
    this.header.buildYear = this.reader.readUInt32();
    this.header.buildDay = this.reader.readUInt32();
    this.header.DescriptionStrRef = this.reader.readUInt32();
    this.header.reserved = this.reader.readBytes(116);                 //Byte 116

    header = new Uint8Array(0);
    this.reader.dispose();

    //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
    this.erfDataOffset = (this.header.offsetToResourceList + (this.header.entryCount * 8));
    header = new Uint8Array(this.buffer.slice(0, this.erfDataOffset));
    this.reader.reuse(header);

    this.reader.seek(this.header.offsetToLocalizedString);

    for (let i = 0; i < this.header.languageCount; i++) {
      let language: IERFLanguage = {} as IERFLanguage;
      language.languageId = this.reader.readUInt32();
      language.stringSize = this.reader.readUInt32();
      language.value = this.reader.readChars(language.stringSize);
      this.localizedStrings.push(language);
    }

    this.reader.seek(this.header.offsetToKeyList);

    for (let i = 0; i < this.header.entryCount; i++) {
      let key: IERFKeyEntry = {} as IERFKeyEntry;
      key.resRef = this.reader.readChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
      key.resId = this.reader.readUInt32();
      key.resType = this.reader.readUInt16();
      key.unused = this.reader.readUInt16();
      this.keyList.push(key);
    }

    this.reader.seek(this.header.offsetToResourceList);

    for (let i = 0; i < this.header.entryCount; i++) {
      let resource: IERFResource = {} as IERFResource;
      resource.offset = this.reader.readUInt32();
      resource.size = this.reader.readUInt32();
      this.resources.push(resource);
    }

    header = new Uint8Array(0);
    this.reader.dispose();
  }

  getResource(resRef: string, resType: number): IERFResource{
    resRef = resRef.toLowerCase();
    for(let i = 0; i < this.keyList.length; i++){
      let key = this.keyList[i];
      if (key.resRef == resRef && key.resType == resType) {
        return this.resources[key.resId];
      }
    };
    return undefined;
  }

  async getResourceBuffer(resource: IERFResource): Promise<Uint8Array> {
    if (typeof resource == 'undefined') {
      return new Uint8Array(0);
    }


    if(!resource.size){
      return new Uint8Array(0);
    }

    const buffer = new Uint8Array(resource.size);

    if(this.inMemory){
      buffer.set(this.buffer.slice(resource.offset, resource.offset + (resource.size - 1)));
      return buffer;
    }else{
      const fd = await GameFileSystem.open(this.resource_path, 'r');
      await GameFileSystem.read(fd, buffer, 0, buffer.length, resource.offset);
      await GameFileSystem.close(fd);
    }

    return buffer;
  }

  async getResourceBufferByResRef(resRef: string, resType: number): Promise<Uint8Array> {
    const resource = this.getResource(resRef, resType);
    if (typeof resource === 'undefined') {
      console.error('getResourceBufferByResRef', resRef, resType, resource);
      return new Uint8Array(0);
    }

    return await this.getResourceBuffer(resource);
  }

  getResourcesByType(resType: number): IERFResource[] {
    const resources: IERFResource[] = [];
    for(let i = 0; i < this.keyList.length; i++){
      const key = this.keyList[i];
      if (key.resType == resType) {
        resources.push(this.resources[key.resId]);
      }
    };
    return resources;
  }

  async exportRawResource(directory: string, resref: string, restype: number = 0x000F): Promise<Uint8Array> {
    if(directory == null){
      return new Uint8Array(0);
    }

    const resource = this.getResource(resref, restype);
    if(!resource){
      return new Uint8Array(0);
    }
    
    if(this.inMemory){
        const buffer = new Uint8Array(this.buffer.slice(resource.offset, resource.offset + (resource.size - 1)));
      await GameFileSystem.writeFile(path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)), buffer);
      return buffer;
    }else{
      let buffer = new Uint8Array(resource.size);
      const fd = await GameFileSystem.open(this.resource_path, 'r');
      await GameFileSystem.read(fd, buffer, 0, resource.size, resource.offset);
      console.log('ERF Export', 'Writing File', path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)));
      await GameFileSystem.writeFile(
        path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)), buffer
      );
      return buffer;
    }
  }

  addResource(resRef: string, resType: number, buffer: Uint8Array){

    const resId = this.resources.push({
      offset: -1,
      size: buffer.length,
      data: buffer
    }) - 1;

    this.keyList.push({
      resRef: resRef,
      resId: resId,
      resType: resType,
      unused: 0
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

    for(let i = 0; i < this.localizedStrings.length; i++){
      locStringsLen += (this.localizedStrings[i].value.length + 8);
    }

    this.header.offsetToLocalizedString = ERF_HEADER_SIZE;
    this.header.languageCount = this.localizedStrings.length;
    this.header.entryCount = this.keyList.length;
    this.header.offsetToKeyList = ERF_HEADER_SIZE + locStringsLen;
    this.header.offsetToResourceList = ERF_HEADER_SIZE + locStringsLen + (this.header.entryCount * keyEleLen);

    //Offset to the beginning of the data block
    let offset = this.header.offsetToResourceList + (this.header.entryCount * resEleLen);
    //Update the resource data offsets
    for(let i = 0; i < this.resources.length; i++){
      this.resources[i].offset = offset;
      offset += this.resources[i].size;
    }

    output.writeString(this.header.fileType);
    output.writeString(this.header.fileVersion);
    output.writeUInt32(this.header.languageCount);
    output.writeUInt32(this.header.localizedStringSize);
    output.writeUInt32(this.header.entryCount);
    output.writeUInt32(this.header.offsetToLocalizedString);
    output.writeUInt32(this.header.offsetToKeyList);
    output.writeUInt32(this.header.offsetToResourceList);
    output.writeUInt32(new Date().getFullYear() - 1900);
    output.writeUInt32(ERFObject.DayOfTheYear());
    output.writeUInt32(0);
    output.writeBytes(new Uint8Array(116));

    //LocalStrings
    for(let i = 0; i < this.localizedStrings.length; i++){
      output.writeUInt32(this.localizedStrings[i].languageId);
      output.writeUInt32(this.localizedStrings[i].stringSize);
      output.writeString(this.localizedStrings[i].value);
    }

    //Key List
    for(let i = 0; i < this.keyList.length; i++){
      output.writeString( this.keyList[i].resRef.padEnd(16, '\0').substr(0, 16) );
      output.writeUInt32( this.keyList[i].resId );
      output.writeUInt16( this.keyList[i].resType );
      output.writeUInt16( 0 );
    }

    //Resource List
    for(let i = 0; i < this.resources.length; i++){
      output.writeUInt32( this.resources[i].offset );
      output.writeUInt32( this.resources[i].size );
    }

    //Data
    for(let i = 0; i < this.resources.length; i++){
      output.writeBytes( this.resources[i].data );
    }

    return output.buffer;
  }
  
  static DayOfTheYear(date?: Date) {
    if(!date){
      date = new Date(Date.now());
    }
  
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
  };

}
