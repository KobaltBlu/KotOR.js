import { GFFField } from "./GFFField";
import { GFFObject } from "./GFFObject";

export class GFFStruct {

  Fields: GFFField[];
  Type: number;

  index: number = 0;
  fieldCount: number = 0;

  constructor(Type = 0){
    this.Fields = [];
    this.Type = Type;
  }

  SetType(i: number){
    this.Type = i;
    return this;
  }

  AddField(field: GFFField){
    if(field instanceof GFFField){
      return this.Fields[this.Fields.length] = field;
    }
    return undefined;
  }

  RemoveFieldByLabel(label = ''){
    let field;
    for(let i = 0, len = this.Fields.length; i < len; i++){
      field = this.Fields[i];
      if(field.Label == label){
        this.Fields.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  GetType(){
    return this.Type;
  }

  GetFields(){
    return this.Fields;
  }

  GetFieldByLabel(Label: string): GFFField|null {

    for(let i = 0; i!=this.Fields.length; i++){
      let field = this.Fields[i];
      if (field.Label == Label){
        return field;
      }

      /*if (field.GetType() == GFFDataType.LIST || field.GetType() == GFFDataType.STRUCT){
        for(let j = 0; j!=field.GetChildStructs().length; j++){
          let str = field.GetChildStructs()[j];
          let child = str.GetFieldByLabel(Label);
          if (child != null){
            return child;
          }
        }
      }*/
    }

    return null;
  }

  MergeStruct(strt: GFFStruct){
    if(strt instanceof GFFStruct){
      for(let i = 0; i < strt.Fields.length; i++){
        this.Fields.push(strt.Fields[i]);
      }
    }
    return this;
  }

  HasField(Label: string){
    for(let i = 0; i!=this.Fields.length; i++){
      let field = this.Fields[i];
      if (field.Label == Label)
        return true;
    }
    return false;
  }

  ToJSON(){
    return GFFObject.StructToJSON(this);
  }

}




