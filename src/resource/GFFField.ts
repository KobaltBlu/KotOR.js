import { GFFDataType } from "../enums/resource/GFFDataType";
import { CExoLocString } from "./CExoLocString";
import { GFFObject } from "./GFFObject";
import { GFFStruct } from "./GFFStruct";
import * as THREE from "three";

export class GFFField {

  Type: number;
  Label: string;
  Data: Buffer;
  Value: any;
  ChildStructs: GFFStruct[] = [];
  CExoLocString: CExoLocString;
  Vector: THREE.Vector3;
  Orientation: THREE.Quaternion;

  index: number = 0;
  labelIndex: number = 0;

  constructor(Type: number = 0, Label: string = "", Value?: any){
    this.Type = Type;
    this.Label = Label;
    this.Data = Buffer.alloc(0);
    this.Value = Value;
    this.ChildStructs = [];

    switch(this.Type){
      case GFFDataType.CEXOSTRING:
      case GFFDataType.RESREF:
        if(typeof this.Value !== 'string')
          this.Value = '';
      break;
      case GFFDataType.CEXOLOCSTRING:
        this.Value = 0;
        this.CExoLocString = (Value instanceof CExoLocString) ? Value : new CExoLocString();
      break;
      case GFFDataType.ORIENTATION:
        this.Value = 0;
        if(typeof Value == 'object' && typeof Value.x == 'number' && typeof Value.y == 'number' && typeof Value.z == 'number' && typeof Value.w == 'number'){
          this.Orientation = Value;
        }else{
          this.Orientation = new THREE.Quaternion(0, 0, 0, 1);
        }
      break;
      case GFFDataType.VECTOR:
        this.Value = 0;
        if(typeof Value == 'object' && typeof Value.x == 'number' && typeof Value.y == 'number' && typeof Value.z == 'number'){
          this.Vector = Value;
        }else{
          this.Vector = new THREE.Vector3(0, 0, 0);
        }
      break;
      case GFFDataType.STRUCT:
        this.ChildStructs[0] = new GFFStruct();
      break;
      case GFFDataType.VOID:
        this.Data = Buffer.alloc(0);
        this.Value = 0;
      break;
    }

  }

  GetType(): number {
    return this.Type;
  }

  GetLabel(): string {
    return this.Label;
  }

  GetVoid(){
    return this.Data;
  }

  GetValue(){
    switch(this.Type){
      case GFFDataType.CEXOLOCSTRING:
        return this.CExoLocString.GetValue();
      default:
        return this.Value;
    }
  }

  GetVector(){
    return this.Vector;
  }

  GetChildStructs(){
    return this.ChildStructs;
  }

  GetChildStructByType(type = -1){
    for(let i = 0; i < this.ChildStructs.length; i++){
      if(this.ChildStructs[i].Type == type)
        return this.ChildStructs[i];
    }
    return null;
  }

  GetFieldByLabel(Label: string){
    if(this.ChildStructs.length){
      for(let i = 0; i!=this.ChildStructs[0].Fields.length; i++){
        let field = this.ChildStructs[0].Fields[i];
        if (field.Label == Label){
          return field;
        }
      }
    }

    return null;
  }

  GetCExoLocString(){
    return this.CExoLocString;
  }

  GetOrientation(){
    return this.Orientation;
  }

  SetData(data: Buffer){
    this.Data = data;
    return this;
  }

  SetValue(val: any){

    switch(this.Type){
      case GFFDataType.CEXOLOCSTRING:
        if(val instanceof CExoLocString){
          this.CExoLocString = val;
        }else if(typeof val === 'number'){
          this.CExoLocString.SetRESREF(val);
        }else if(typeof val === 'string'){
          this.CExoLocString.AddSubString(val, 0);
        }
      break;
      case GFFDataType.RESREF:
        if(!val)
          val = '';

        if(typeof val !== 'string')
          val = val.toString()
        
        this.Value = val;
      break;
      case GFFDataType.CEXOSTRING:
        if(!val)
          val = '';

        if(typeof val !== 'string')
          val = val.toString()
        
        this.Value = val;
      break;
      case GFFDataType.CHAR:
        if(!val)
          val = '';

        if(typeof val !== 'string')
          val = val.toString()

        this.Value = val.toString();
      break;
      case GFFDataType.BYTE:
        if(typeof val === 'undefined'){
          val = 0;
        }
        
        if(val >= 0 && val <= 255){
          this.Value = val;
        }else{
          console.error('Field.SetValue BYTE OutOfBounds', val, this);
          this.Value = val;
        }
      break;
      case GFFDataType.SHORT:
        if(typeof val === 'undefined'){
          val = 0;
        }
        
        if(val >= -32768 && val <= 32767){
          this.Value = val;
        }else{
          console.error('Field.SetValue SHORT OutOfBounds', val, this);
          this.Value = val;
        }
      break;
      case GFFDataType.INT:
        if(typeof val === 'undefined'){
          val = 0;
        }
        
        if(val >= -2147483648 && val <= 21474836487){
          this.Value = val;
        }else{
          console.error('Field.SetValue INT OutOfBounds', val, this);
          this.Value = val;
        }
      break;
      case GFFDataType.WORD:
        if(typeof val === 'undefined'){
          val = 0;
        }

        if(val >= 0 && val <= 65535){
          this.Value = val;
        }else{
          console.error('Field.SetValue WORD OutOfBounds', val, this);
          this.Value = val;
        }
      break;
      case GFFDataType.DWORD:
        if(typeof val === 'undefined'){
          val = 0;
        }

        if(val >= 0 && val <= 4294967296){
          this.Value = val;
        }else{
          console.error('Field.SetValue DWORD OutOfBounds', val, this);
          this.Value = val;
        }
      break;
      case GFFDataType.VOID:
        if(val instanceof Buffer){
          this.Value = val;
        }else if(val instanceof ArrayBuffer){
          this.Value = Buffer.from(val);
        }
      break;
      default:
        this.Value = val;
      break;
    }
    return this;

  }

  SetType(type: number){
    this.Type = type;
    return this;
  }

  SetLabel(label: string){
    this.Label = label;
    return this;
  }

  SetCExoLocString(val: CExoLocString){
    this.CExoLocString = val;
    return this;
  }

  SetVector(v: THREE.Vector3){
    this.Vector = v;
    return this;
  }

  SetOrientation(v: THREE.Quaternion){
    this.Orientation = v;
    return this;
  }

  AddChildStruct(strt: GFFStruct){
    if(!(strt instanceof GFFStruct)){
      console.log('AddChildStruct invalid type', strt);
      return this;
    }

    switch(this.Type){
      case GFFDataType.LIST:
        this.ChildStructs.push(strt);
      break;
      case GFFDataType.STRUCT:
        this.ChildStructs[0] = strt;
      break;
    }

    return this;
  }

  RemoveChildStruct(strt: GFFStruct){
    let index = this.ChildStructs.indexOf(strt);
    if(index >= 0){
      this.ChildStructs.splice(index, 1);
    }
    return this;
  }

  SetChildStructs(strts: GFFStruct[]){
    this.ChildStructs = strts;
    return this;
  }

  ToJSON(){
    return GFFObject.FieldToJSON(this);
  }

}