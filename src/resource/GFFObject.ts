/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { BinaryReader } from "../BinaryReader";
import { BinaryWriter } from "../BinaryWriter";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { CExoLocString } from "./CExoLocString";
import { CExoLocSubString } from "./CExoLocSubString";
import { GFFField } from "./GFFField";
import { GFFStruct } from "./GFFStruct";

import * as THREE from "three";
import * as fs from "fs";
import * as path from "path";
import { GameFileSystem } from "../utility/GameFileSystem";
import { Signal } from "signals";

/* @file
 * The GFFObject class.
 */
export type GFFObjectOnCompleteCallback = (gff: GFFObject) => void;

export class GFFObject {
  BWStructs: BinaryWriter;
  BWFields: BinaryWriter;
  BWFieldData: BinaryWriter;
  BWLabels: BinaryWriter;
  BWFieldIndicies: BinaryWriter;
  BWListIndicies: BinaryWriter;
  FileType: string;
  FileVersion: string;
  StructCount: number;
  FieldCount: number;
  LabelCount: number;
  exportedLabels: string[];
  path: string;
  resourceID: string;
  ext: string;
  signals: { onSaved: any; onUpdated: any; };
  json: any = {};
  RootNode: GFFStruct;
  file: string;
  reader: BinaryReader;
  StructOffset: any;
  FieldOffset: any;
  LabelOffset: any;
  FieldDataOffset: any;
  FieldDataCount: any;
  FieldIndicesOffset: any;
  FieldIndicesCount: any;
  ListIndicesOffset: any;
  ListIndicesCount: any;
  tmpStructArray: any[];
  tmpLabelArray: string[];
  tmpFieldsArray: any[];
  exportedStructs: GFFStruct[];
  exportedFields: GFFField[];

  constructor(file?: string|Buffer, onComplete?: GFFObjectOnCompleteCallback, onError?: Function){

    //START EXPORT VARS

    this.BWStructs;
    this.BWFields;
    this.BWFieldData;
    this.BWLabels;
    this.BWFieldIndicies;
    this.BWListIndicies;

    this.FileType = '';
    this.FileVersion = 'V3.2';

    this.StructCount = 0;
    this.FieldCount = 0;
    this.LabelCount = 0;

    this.exportedLabels = [];

    this.signals = {
      onSaved: new Signal(),
      onUpdated: new Signal()
    }; 

    this.json = {};

    //END EXPORT VARS

    if(file == null){
      this.RootNode = new GFFStruct(-1);
    }else{
      if(typeof file == 'string'){
        try{
          this.file = file;

          let fileInfo = path.parse(this.file);
          this.path = fileInfo.dir;
          this.file = fileInfo.name;
          this.ext = fileInfo.ext.substr(1);

          GameFileSystem.readFile(file).then( (binary) => {
            this.resourceID = file;
            this.Parse(binary, onComplete);
          }).catch( () => {
            if(typeof onError === 'function')
              onError();
          });
        }catch(e){
          if(typeof onError === 'function')
            onError(e);
        }
      }else{
        try{
          //if file is not a string then its a binary array
          this.Parse(file, onComplete);

          let templateResRef = this.RootNode.GetFieldByLabel('TemplateResRef');
          if(templateResRef instanceof GFFField){
            this.file = templateResRef.Value;
          }
        }catch(e){
          if(typeof onError === 'function')
            onError(e);
        }
      }
    }

  }

  AddField(field: GFFField){
    if(this.RootNode instanceof GFFStruct){
      return this.RootNode.AddField(field);
    }
    return undefined;
  }

  RemoveFieldByLabel(label: string = ''){
    if(this.RootNode instanceof GFFStruct){
      return this.RootNode.RemoveFieldByLabel(label);
    }
    return false;
  }

  static FromStruct(strt?: GFFStruct, type: number = -1){
    let gff = new GFFObject();
    if(strt instanceof GFFStruct){
      gff.RootNode.Type = type;
      gff.RootNode.Fields = strt.Fields;
      gff.json = gff.ToJSON();
    }
    return gff;
  }

  //We use the ResourceID to tell where the file came from
  SetResourceID(resID: string = ''){
    this.resourceID = resID;
  }

  Parse(binary: Buffer, onComplete?: Function){
    this.reader = new BinaryReader(binary);

    this.FileType = this.reader.readChars(4);
    this.FileVersion = this.reader.readChars(4);
    this.StructOffset = this.reader.readUInt32();
    this.StructCount = this.reader.readUInt32();
    this.FieldOffset = this.reader.readUInt32();
    this.FieldCount = this.reader.readUInt32();
    this.LabelOffset = this.reader.readUInt32();
    this.LabelCount = this.reader.readUInt32();
    this.FieldDataOffset = this.reader.readUInt32();
    this.FieldDataCount = this.reader.readUInt32();
    this.FieldIndicesOffset = this.reader.readUInt32();
    this.FieldIndicesCount = this.reader.readUInt32();
    this.ListIndicesOffset = this.reader.readUInt32();
    this.ListIndicesCount = this.reader.readUInt32();

    this.tmpStructArray = [];
    this.tmpLabelArray = [];
    this.tmpFieldsArray = [];

    //Start Structs
    this.reader.seek(this.StructOffset);
    for (let i = 0; i < this.StructCount; i++) {
      this.tmpStructArray[i] = {
        Type: this.reader.readInt32(), 
        DataOrDataOffset: this.reader.readInt32(), 
        FieldCount: this.reader.readInt32()
      };
    }
    //End Structs

    //Start Labels
    this.reader.seek(this.LabelOffset);
    for (let i = 0; i < this.LabelCount; i++) {
      this.tmpLabelArray[i] = this.reader.readChars(16).replace(/\0[\s\S]*$/g,'');
    }
    //End Labels

    //Start Fields
    this.reader.seek(this.FieldOffset);
    for (let i = 0; i < this.FieldCount; i++) {
      this.tmpFieldsArray[i] = {
        Type: this.reader.readInt32(), 
        Label: this.reader.readInt32(), 
        Data: this.reader.readBytes(4), 
        Val: "", Index: i
      };
    }
    //End Fields

    this.RootNode = this.BuildStruct(this.tmpStructArray[0]);

    this.reader = null;
    this.tmpStructArray = [];
    this.tmpLabelArray = [];
    this.tmpFieldsArray = [];

    this.json = this.ToJSON();

    if(typeof onComplete === 'function'){
      onComplete(this, this.RootNode);
    }

  }

  ToJSON(){
    return GFFObject.StructToJSON(this.RootNode);
  }

  static StructToJSON(s: GFFStruct){
    
    let struct: any = {
      type: s.GetType(),
      fields: {}
    };

    for(let i = 0; i < s.Fields.length; i++){
      let f = s.Fields[i];
      struct.fields[f.Label] = GFFObject.FieldToJSON(f);
    }

    return struct;

  }

  static FieldToJSON(f: GFFField){

    let field = {
      type: f.GetType(),
      value: f.GetValue(),
      structs: [] as any[]
    };

    switch (f.GetType()) {
      case GFFDataType.CEXOLOCSTRING:
        field.value = f.GetCExoLocString();
      break;
      case GFFDataType.VOID:
        field.value = f.GetVoid();
      break;
      case GFFDataType.ORIENTATION:
        field.value = f.GetOrientation();
      break;
      case GFFDataType.VECTOR:
        field.value = f.GetVector();
      break;
    }

    let children = f.GetChildStructs();
    for(let i = 0; i < children.length; i++){
      field.structs[i] = GFFObject.StructToJSON(children[i]);
    }

    return field;

  }

  BuildStruct(struct: any){
    let strt = new GFFStruct();

    strt.SetType(struct.Type);
    if (struct.FieldCount == 1){
      let index = struct.DataOrDataOffset;
      strt.AddField(this.BuildField(this.tmpFieldsArray[index]));
    }
    else if(struct.FieldCount != 0){
      let originalPos = this.reader.tell();
      this.reader.seek(this.FieldIndicesOffset + struct.DataOrDataOffset);
      for (let i = 0; i < struct.FieldCount; i++){
        let index = this.reader.readInt32();
        strt.AddField(this.BuildField(this.tmpFieldsArray[index]));
      }
      this.reader.seek(originalPos);
    }

    return strt;
  }

  BuildField(f: any){
    let field = new GFFField(f.Type, this.tmpLabelArray[f.Label]);

    let data = f.Data;
    let offset = data.readUInt32LE();

    let OriginalPos = this.reader.tell();//Store the original position of the reader object
    switch (field.GetType()){
      case GFFDataType.BYTE: //Byte
        field.SetValue(data.readUInt8());
        break;
      case GFFDataType.CHAR: //Char
        field.SetValue(data.readUInt8());
        break;
      case GFFDataType.WORD: //UInt16
        field.SetValue(data.readUInt16LE());
        break;
      case GFFDataType.SHORT: //Int16
        field.SetValue(data.readInt16LE());
        break;
      case GFFDataType.DWORD: //UInt32
        field.SetValue(data.readUInt32LE());
        break;
      case GFFDataType.INT: //Int32
        field.SetValue(data.readInt32LE());
        break;
      case GFFDataType.FLOAT: //Float
        field.SetValue(data.readFloatLE());
        break;
      case GFFDataType.DWORD64: //Dword64
        field.SetData(this.GetDword64(offset));
        break;
      case GFFDataType.INT64: //Int64
        field.SetData(this.GetInt64(offset));
        break;
      case GFFDataType.DOUBLE: //Double
        field.SetValue(this.GetDouble(offset));
        break;
      case GFFDataType.CEXOSTRING:
        field.SetValue(this.GetCExoString(offset));
        break;
      case GFFDataType.RESREF:
        field.SetValue(this.GetRESREF(offset));
        break;
      case GFFDataType.CEXOLOCSTRING:
        field.SetCExoLocString(this.GetCExoLocString(offset));
        break;
      case GFFDataType.VOID:
        field.SetData(this.GetVoid(offset));
        break;
      case GFFDataType.STRUCT:
        field.AddChildStruct(this.BuildStruct(this.tmpStructArray[offset]));
        break;
      case GFFDataType.LIST:
        if (offset != 0xFFFFFFFF){
          this.reader.seek(this.ListIndicesOffset + offset);
          let ListSize = this.reader.readUInt32();//The first 4 bytes indicate the size of the array
          let arr: GFFStruct[] = [];
          for (let i = 0; i < ListSize; i++){
            arr[i] = this.BuildStruct(this.tmpStructArray[this.reader.readInt32()]);
          }

          field.SetChildStructs(arr);
        }
        break;
      case GFFDataType.ORIENTATION:
        field.SetOrientation(this.GetOrientation(offset));
        break;
      case GFFDataType.VECTOR:
        field.SetVector(this.GetVector(offset));
        break;
    }
    this.reader.seek(OriginalPos);//Return the reader position to the original

    return field;
  }

  static TypeValueToString(val: any){
    for (let key in GFFDataType) {
      if (GFFDataType.hasOwnProperty(key)) {
        if(val == GFFDataType[key])
          return String(key);
      }
    }
    return null;
  }

  GetFieldByLabel(Label: string, Fields?:GFFField[]): GFFField|any {
    if (Fields == null)
      Fields = this.RootNode.GetFields();

    let listFields:GFFField[] = [];

    for(let i = 0; i < Fields.length; i++){
      let field = Fields[i];
      if (field.Label == Label){
        return field;
      }

      if (field.GetType() == GFFDataType.LIST || field.GetType() == GFFDataType.STRUCT){
        listFields.push(field);
      }
    }

    for(let i = 0, len = listFields.length; i < len; i++){
      let field = listFields[i];
      for(let j = 0; j!=field.GetChildStructs().length; j++){
        let str = field.GetChildStructs()[j];
        let child = this.GetFieldByLabel(Label, str.GetFields());
        if (child != null){
          return child;
        }
      }
    }

    return undefined;
  }

  /*
  COMPLEXDATATYPE GETTERS
  */
  //Gets data from the FieldDataHeader
  GetRESREF(offset: number){
    let RESREF = "";
    let OriginalPos = this.reader.tell();//Store the original position of the reader object
    this.reader.seek(this.FieldDataOffset + offset);

    let length = this.reader.readByte();// Get the length of the string
    if (length != 0)
      RESREF = this.reader.readChars(length);

    this.reader.seek(OriginalPos);//Return the reader position to the original
    return RESREF;
  }

  //Gets data from the FieldDataHeader
  GetCExoLocString(offset: number){
    //console.log('GetCExoLocString', offset);
    let data = new CExoLocString(-1);

    let OriginalPos = this.reader.tell();//Store the original position of the reader object
    this.reader.seek(this.FieldDataOffset + offset);

    let length = this.reader.readInt32();// Get the length of the string
    data.SetRESREF(this.reader.readInt32());
    let stringCount = this.reader.readInt32()

    for (let i = 0; i < stringCount; i++) {
      let stringID = this.reader.readInt32();
      let stringLength = this.reader.readInt32();
      let subString = new CExoLocSubString(stringID, this.reader.readChars(stringLength));
      data.AddSubString(subString);
    }

    //if (length != 0)
      //RESREF = new string(Reader.readChars(length));

    this.reader.seek(OriginalPos);//Return the reader position to the original
    return data;
  }

  //Gets data from the FieldDataHeader
  GetCExoString(offset: number){
    let str = "";
    let OriginalPos = this.reader.tell();//Store the original position of the reader object
    this.reader.seek(this.FieldDataOffset + offset);
    //console.log('GetCExoString', this.FieldDataOffset + offset, this.FieldDataOffset, offset)
    let length = this.reader.readInt32();// Get the length of the string
    if (length != 0)
      str = this.reader.readChars(length);

    this.reader.seek(OriginalPos);//Return the reader position to the original
    return str;
  }

  //Gets data from the FieldDataHeader
  GetDword64(offset: number){
    let OriginalPos = this.reader.tell();//Store the original position of the reader object
    this.reader.seek(this.FieldDataOffset + offset);
    let Dword64 = this.reader.readUInt64();
    this.reader.seek(OriginalPos);//Return the reader position to the original
    return Dword64;
  }

  //Gets data from the FieldDataHeader
  GetInt64(offset: number){
    let OriginalPos = this.reader.tell();//Store the original position of the reader object
    this.reader.seek(this.FieldDataOffset + offset);
    let value = this.reader.readInt64();
    this.reader.seek(OriginalPos);//Return the reader position to the original
    return value;
  }

  //Gets data from the FieldDataHeader
  GetDouble(offset: number){
    let OriginalPos = this.reader.tell();//Store the original position of the reader object
    this.reader.seek(this.FieldDataOffset + offset);
    let Double = this.reader.readDouble();
    this.reader.seek(OriginalPos);//Return the reader position to the original
    return Double;
  }

  //Gets data from the FieldDataHeader
  GetOrientation(offset: number): THREE.Quaternion{
    let OriginalPos = this.reader.tell();//Store the original position of the reader object
    this.reader.seek(this.FieldDataOffset + offset);
    let o = new THREE.Quaternion(this.reader.readSingle(), this.reader.readSingle(), this.reader.readSingle(), this.reader.readSingle());
    this.reader.seek(OriginalPos);//Return the reader position to the original
    return o;
  }

  //Gets data from the FieldDataHeader
  GetVector(offset: number): THREE.Vector3{
    let OriginalPos = this.reader.tell();//Store the original position of the reader object
    this.reader.seek(this.FieldDataOffset + offset);
    let v = new THREE.Vector3(this.reader.readSingle(), this.reader.readSingle(), this.reader.readSingle());
    this.reader.seek(OriginalPos);//Return the reader position to the original
    return v;
  }

  GetVoid(offset: number){
    let OriginalPos = this.reader.tell();//Store the original position of the reader object
    this.reader.seek(this.FieldDataOffset + offset);
    let size =  this.reader.readUInt32();
    let bytes = this.reader.readBytes(size);
    this.reader.seek(OriginalPos);//Return the reader position to the original
    return bytes;
  }

  DeleteField(field: GFFField, strt?: GFFStruct){
    if(strt == null){
      strt = this.RootNode;
    }
    const fields = strt.GetFields();
    let fieldLength = fields.length;
    let cField: GFFField;
    for(let i = 0, len = fields.length; i < len ; i++){
      cField = fields[i];
      if(cField === field){
        strt.GetFields().splice(i, 1);
        return;
      }
      let childStructs = cField.GetChildStructs();
      for(let j = 0, len2 = childStructs.length; j < len2; j++){
        this.DeleteField(field, childStructs[i]);
      }
    }
  }

  DeleteStruct(s: GFFStruct, rootStruct?: GFFStruct){
    if(!rootStruct){
      rootStruct = this.RootNode;
    }

    let fields = rootStruct.GetFields();
    let field: GFFField;
    for(let i = 0, len = fields.length; i < len; i++){
      field = fields[i];
      let structs = field.GetChildStructs();
      let struct: GFFStruct;
      for(let j = 0, len2 = structs.length; j < len2; j++){
        struct = structs[j];
        if(struct === s){
          field.GetChildStructs().splice(j, 1);
          return;
        }

        this.DeleteStruct(s, struct);
      }
    }
  }

  Merge(gff: GFFObject){
    if(gff instanceof GFFObject){
      this.RootNode.MergeStruct(gff.RootNode);
    }
  }

  Save(file: string, onExport?: Function, onError?: Function){
    this.Export(file, onExport, onError);
  }

  Export(file: string, onExport?: Function, onError?: Function){
    return new Promise( (resolve, reject) => {
      let savePath: string = file ? file : this.file;

      if(!savePath){
        console.error('Export GFF: Missing Export Path');
        return;
      }

      console.log('Export GFF', savePath, this);
      let fileInfo = path.parse(savePath);

      //Update the TemplateResRef field if it exists
      let templateResRef = this.RootNode.GetFieldByLabel('TemplateResRef');
      if(templateResRef instanceof GFFField){
        fileInfo.name = templateResRef.Value = fileInfo.name.substr(0, 16);
        //fileInfo.base = fileInfo.name + '.'+this.FileType.substr(0, 3).toLowerCase();
        fileInfo.base = fileInfo.name + fileInfo.ext;
      }

      let buffer = this.GetExportBuffer();

      console.log('Export GFF', fileInfo, this);

      GameFileSystem.writeFile( path.join(fileInfo.dir, fileInfo.base), buffer ).then( () => {
        if(typeof onExport === 'function')
          onExport();
        resolve(this);
      }).catch( (err) => {
        if(typeof onError === 'function')
          onError(err);
        reject(err);

      });

      // this.signals.onSaved.dispatch( this );
      // this.signals.onUpdated.dispatch( this );
    });
  }

  GetExportBuffer(){

    //console.log('GetExportBuffer', this);

    this.BWStructs = new BinaryWriter();
    this.BWFields = new BinaryWriter();
    this.BWFieldData = new BinaryWriter();
    this.BWLabels = new BinaryWriter();
    this.BWFieldIndicies = new BinaryWriter();
    this.BWListIndicies = new BinaryWriter();

    this.exportedLabels = [];
    this.exportedStructs = [];
    this.exportedFields = [];

    this.StructCount = 0;
    this.FieldCount = 0;
    this.LabelCount = 0;

    let bw = new BinaryWriter();

    this.WalkStruct(this.RootNode);

    for(let i = 0; i < this.exportedStructs.length; i++){
      this.ExportStruct(this.exportedStructs[i]);
    }
    this.StructCount = this.exportedStructs.length;

    for(let i = 0; i < this.exportedFields.length; i++){
      this.ExportField(this.exportedFields[i]);
    }
    this.FieldCount = this.exportedFields.length;

    for(let i = 0; i < this.exportedLabels.length; i++){
      this.ExportLabel(this.exportedLabels[i]);
    }
    this.LabelCount = this.exportedLabels.length;

    //this.ExportStruct(this.RootNode);

    let StructsLength = this.BWStructs.length;
    let FieldsLength = this.BWFields.length;
    let LabelsLength = this.BWLabels.length;
    let FieldDataLength = this.BWFieldData.length;
    let FieldIndiciesLength = this.BWFieldIndicies.length;
    let ListIndiciesLength = this.BWListIndicies.length;

    let _header = {
      FileType : this.FileType,
      FileVersion : this.FileVersion,
      StructOffset: 0, //(uint32)
      StructCount : this.StructCount, //(uint32)
      FieldOffset: 0, //(uint32)
      FieldCount : this.FieldCount, //(uint32)
      LabelOffset: 0, //(uint32)
      LabelCount : this.LabelCount, //(uint32)
      FieldDataOffset: 0, //(uint32)
      FieldDataCount : FieldDataLength, //(uint32)
      FieldIndicesOffset: 0, //(uint32)
      FieldIndicesCount : FieldIndiciesLength, //(uint32)
      ListIndicesOffset: 0, //(uint32)
      ListIndicesCount : ListIndiciesLength, //(uint32)
    };

    //Write the Structs data
    _header.StructOffset = 56;
    bw.position = _header.StructOffset;
    bw.write(this.BWStructs.buffer);

    //Write the Fields data
    _header.FieldOffset = (_header.StructOffset + StructsLength); //(uint)
    bw.position = _header.FieldOffset;
    bw.write(this.BWFields.buffer);

    //Write the Labels data
    _header.LabelOffset = (_header.FieldOffset + FieldsLength); //(uint)
    bw.position = _header.LabelOffset;
    bw.write(this.BWLabels.buffer);

    //Write the FieldData data
    _header.FieldDataOffset = (_header.LabelOffset + LabelsLength); //(uint)
    bw.position = _header.FieldDataOffset;
    bw.write(this.BWFieldData.buffer);

    //Write the FieldIndicies data
    _header.FieldIndicesOffset = (_header.FieldDataOffset + FieldDataLength); //(uint)
    bw.position = _header.FieldIndicesOffset;
    bw.write(this.BWFieldIndicies.buffer);

    //Write the ListIndicies data
    _header.ListIndicesOffset = (_header.FieldIndicesOffset + FieldIndiciesLength); //(uint)
    bw.position = _header.ListIndicesOffset;
    bw.write(this.BWListIndicies.buffer);

    bw.position = 0;

    bw.writeChars(this.PadRight(_header.FileType, '\0', 4).substr(0, 4));
    bw.writeChars(this.PadRight(_header.FileVersion, '\0', 4).substr(0, 4));
    bw.writeUInt32(_header.StructOffset);
    bw.writeUInt32(_header.StructCount);
    bw.writeUInt32(_header.FieldOffset);
    bw.writeUInt32(_header.FieldCount);
    bw.writeUInt32(_header.LabelOffset);
    bw.writeUInt32(_header.LabelCount);
    bw.writeUInt32(_header.FieldDataOffset);
    bw.writeUInt32(_header.FieldDataCount);
    bw.writeUInt32(_header.FieldIndicesOffset);
    bw.writeUInt32(_header.FieldIndicesCount);
    bw.writeUInt32(_header.ListIndicesOffset);
    bw.writeUInt32(_header.ListIndicesCount);

    bw.close();

    this.BWStructs.dispose();
    this.BWFields.dispose();
    this.BWFieldData.dispose();
    this.BWLabels.dispose();
    this.BWFieldIndicies.dispose();
    this.BWListIndicies.dispose();

    return bw.buffer;
  }

  WalkStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      struct.index = this.StructCount;
      this.exportedStructs[struct.index] = struct;
      this.StructCount++;

      struct.fieldCount = struct.GetFields().length;
      for(let i = 0; i < struct.fieldCount; i++){
        let field = struct.Fields[i];
        field.index = this.FieldCount;
        this.exportedFields[field.index] = field;
        this.FieldCount++;

        let labelSearchIndex = this.exportedLabels.indexOf(field.GetLabel());
        field.labelIndex = labelSearchIndex >= 0 ? labelSearchIndex : this.exportedLabels.push(field.GetLabel()) - 1;   

        let childStructs = field.GetChildStructs() || [];
        let childStructCount = childStructs.length;
        for(let j = 0; j < childStructCount; j++){
          this.WalkStruct(childStructs[j]);
        }
      }
    }

  }

  ExportStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      //console.log('Export Struct', struct);
      this.BWStructs.writeUInt32(struct.GetType() == -1 ? 0xFFFFFFFF : struct.GetType() );
      if(struct.GetFields().length == 1){
        this.BWStructs.writeUInt32( struct.GetFields()[0].index );
      }else if(struct.GetFields().length){
        this.BWStructs.writeUInt32( this.BWFieldIndicies.position );
        for(let i = 0; i < struct.GetFields().length; i++){
          this.BWFieldIndicies.writeUInt32( struct.GetFields()[i].index );
        }
      }else{
        this.BWStructs.writeUInt32( 0 );
      }

      this.BWStructs.writeUInt32(struct.GetFields().length);
    }
  }

  //The method returns the exported fields index in the FieldsArray
  ExportField(field: GFFField){
    if(field instanceof GFFField){
      this.BWFields.writeUInt32(field.GetType());
      this.BWFields.writeUInt32(field.labelIndex);
      try{
        switch (field.GetType()) {
          case GFFDataType.BYTE:
            this.BWFields.writeUInt32(field.Value);
            break;
          case GFFDataType.CEXOLOCSTRING:
            this.BWFields.writeUInt32(this.BWFieldData.position);
            //Calculate the total length of the CExoLocString structure
            let CExoLocStringTotalSize = 8;//the size of two DWORDS
            for(let i = 0; i < field.GetCExoLocString().GetStrings().length; i++){
              //the size of two DWORDS plus the string length
              CExoLocStringTotalSize += (8 + field.GetCExoLocString().GetStrings()[i].getString().length);
            }

            this.BWFieldData.writeUInt32(CExoLocStringTotalSize);
            this.BWFieldData.writeUInt32(field.GetCExoLocString().GetRESREF() == -1 ? 0xFFFFFFFF : field.GetCExoLocString().GetRESREF() );
            this.BWFieldData.writeUInt32(field.GetCExoLocString().GetStrings().length);

            for(let i = 0; i < field.GetCExoLocString().GetStrings().length; i++){
              let sub = field.GetCExoLocString().GetStrings()[i];
              this.BWFieldData.writeUInt32(sub.GetStringID());
              this.BWFieldData.writeUInt32(sub.getString().length);
              this.BWFieldData.writeChars(sub.getString());
            }

            break;
          case GFFDataType.CEXOSTRING:
            this.BWFields.writeUInt32(this.BWFieldData.position);
            this.BWFieldData.writeUInt32(field.Value.length);
            this.BWFieldData.writeChars(field.Value);
            break;
          case GFFDataType.CHAR:
            this.BWFields.writeUInt32(field.Value.charCodeAt());
            break;
          case GFFDataType.DOUBLE:
            this.BWFields.writeUInt32(this.BWFieldData.position);
            this.BWFieldData.writeDouble(field.Value);
            break;
          case GFFDataType.DWORD:
            this.BWFields.writeUInt32(field.Value);
            break;
          case GFFDataType.DWORD64:
            //console.log('DWORD64', field);
            this.BWFields.writeUInt32(this.BWFieldData.position);
            this.BWFieldData.writeBytes(field.Data);
            break;
          case GFFDataType.FLOAT:
            this.BWFields.writeSingle(field.Value);
            break;
          case GFFDataType.INT:
            this.BWFields.writeInt32(field.Value);
            break;
          case GFFDataType.INT64:
            //console.log('INT64', field);
            this.BWFields.writeUInt32(this.BWFieldData.position);
            this.BWFieldData.writeBytes(field.Data);
            break;
          case GFFDataType.LIST:
            if (field.GetChildStructs().length == 0){
              this.BWFields.writeUInt32(0xFFFFFFFF);
            }
            else {
              this.BWFields.writeUInt32(this.BWListIndicies.position);
              this.BWListIndicies.writeUInt32(field.GetChildStructs().length);
              for(let i = 0; i < field.GetChildStructs().length; i++){
                this.BWListIndicies.writeUInt32(field.GetChildStructs()[i].index);
              }
            }
            break;
          case GFFDataType.ORIENTATION:
            //Export the Orientation data to the FieldData block and record the offset with the field
            this.BWFields.writeUInt32(this.BWFieldData.position);
            this.BWFieldData.writeSingle(field.GetOrientation().x);
            this.BWFieldData.writeSingle(field.GetOrientation().y);
            this.BWFieldData.writeSingle(field.GetOrientation().z);
            this.BWFieldData.writeSingle(field.GetOrientation().w);
            break;
          case GFFDataType.RESREF:
            this.BWFields.writeUInt32(this.BWFieldData.position);
            this.BWFieldData.writeByte(field.Value.length);
            this.BWFieldData.writeChars(field.Value);
            break;
          case GFFDataType.SHORT:
            this.BWFields.writeInt32(field.Value);
            break;
          case GFFDataType.STRUCT:
            this.BWFields.writeUInt32( field.GetChildStructs()[0].index );//Write the struct index value
            break;
          case GFFDataType.VECTOR:
            //Export the vector data to the FieldData block and record the offset with the field
            this.BWFields.writeUInt32(this.BWFieldData.position);
            this.BWFieldData.writeSingle(field.GetVector().x);
            this.BWFieldData.writeSingle(field.GetVector().y);
            this.BWFieldData.writeSingle(field.GetVector().z);
            break;
          case GFFDataType.VOID:
            this.BWFields.writeUInt32(this.BWFieldData.position);
            this.BWFieldData.writeUInt32(field.GetVoid().length);
            this.BWFieldData.writeBytes(field.GetVoid());
            break;
          case GFFDataType.WORD:
            this.BWFields.writeUInt32(field.Value);
            break;
          default:
            throw('Unknown');
        }
      }catch(e){
        console.error('GFFObject Write Field Error', e);
        throw e;
      }
    }
  }

  ExportLabel(label = ""){
    //PadRight is not implemented in JavaScript
    let newLabel = this.PadRight(label, '\0', 16);
    this.BWLabels.writeChars(newLabel.substr(0, 16));
  }

  PadRight(str = "", pad = '\0', count = 16){
    let newLabel = str;
    while(newLabel.length < count){
      newLabel+=pad;
    }
    return newLabel;
  }

}
