import { GFFField } from "./GFFField";
import { GFFObject } from "./GFFObject";

export class GFFStruct {
  uuid: string;
  fields: GFFField[];
  type: number;

  index: number = 0;
  fieldCount: number = 0;

  constructor(type = 0){
    this.uuid = crypto.randomUUID();
    this.fields = [];
    this.type = type;
  }

  setType(i: number){
    this.type = i;
    return this;
  }

  addField(field: GFFField){
    if(field instanceof GFFField){
      return this.fields[this.fields.length] = field;
    }
    return undefined;
  }

  removeFieldByLabel(label = ''){
    let field;
    for(let i = 0, len = this.fields.length; i < len; i++){
      field = this.fields[i];
      if(field.label == label){
        this.fields.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  getType(){
    return this.type;
  }

  getFields(){
    return this.fields;
  }

  getFieldByLabel(Label: string): GFFField {

    for(let i = 0; i < this.fields.length; i++){
      let field = this.fields[i];
      if (field.label == Label){
        return field;
      }

      /*if (field.getType() == GFFDataType.LIST || field.getType() == GFFDataType.STRUCT){
        for(let j = 0; j!=field.getChildStructs().length; j++){
          let str = field.getChildStructs()[j];
          let child = str.getFieldByLabel(Label);
          if (child != null){
            return child;
          }
        }
      }*/
    }

    return null;
  }

  mergeStruct(strt: GFFStruct){
    if(strt instanceof GFFStruct){
      for(let i = 0; i < strt.fields.length; i++){
        this.fields.push(strt.fields[i]);
      }
    }
    return this;
  }

  hasField(Label: string){
    for(let i = 0; i < this.fields.length; i++){
      let field = this.fields[i];
      if (field.label == Label)
        return true;
    }
    return false;
  }

  toJSON(){
    return GFFObject.StructToJSON(this);
  }

}




