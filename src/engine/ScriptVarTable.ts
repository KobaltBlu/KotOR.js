import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import EngineLocation from "@/engine/EngineLocation";

/**
 * Retail CSWSScriptVar type constants (SaveVarTable / LoadVarTable).
 */
export enum ScriptVarType {
  Int = 1,
  Float = 2,
  String = 3,
  Object = 4,
  Location = 5,
}

export interface ScriptVarEntry {
  name: string;
  type: ScriptVarType;
  value: number | string | EngineLocation;
}

/**
 * Named VarTable (not SWVarTable) — load/re-export for retail round-trip.
 * KotOR scripts use LocalBoolean/LocalNumber; this preserves engine vars from retail saves.
 */
export class ScriptVarTable {
  entries: ScriptVarEntry[] = [];

  clear(){
    this.entries = [];
  }

  loadFromListField(field: GFFField | undefined){
    this.clear();
    if(!field) return;
    const structs = field.getChildStructs();
    for(let i = 0; i < structs.length; i++){
      const s = structs[i];
      if(!s.hasField('Name') || !s.hasField('Type')) continue;
      const name = s.getFieldByLabel('Name').getValue();
      const type = s.getFieldByLabel('Type').getValue() | 0;
      let value: number | string | EngineLocation = 0;
      if(type === ScriptVarType.Int){
        value = s.hasField('Value') ? (s.getFieldByLabel('Value').getValue() | 0) : 0;
      }else if(type === ScriptVarType.Float){
        value = s.hasField('Value') ? Number(s.getFieldByLabel('Value').getValue()) : 0;
      }else if(type === ScriptVarType.String){
        value = s.hasField('Value') ? String(s.getFieldByLabel('Value').getValue() || '') : '';
      }else if(type === ScriptVarType.Object){
        value = s.hasField('Value') ? (s.getFieldByLabel('Value').getValue() >>> 0) : 0x7F000000;
      }else if(type === ScriptVarType.Location){
        const locStruct = s.hasField('Value') ? s.getFieldByLabel('Value').getChildStructs()?.[0] : undefined;
        if(locStruct){
          value = new EngineLocation(
            locStruct.hasField('PositionX') ? locStruct.getFieldByLabel('PositionX').getValue() : 0,
            locStruct.hasField('PositionY') ? locStruct.getFieldByLabel('PositionY').getValue() : 0,
            locStruct.hasField('PositionZ') ? locStruct.getFieldByLabel('PositionZ').getValue() : 0,
            locStruct.hasField('OrientationX') ? locStruct.getFieldByLabel('OrientationX').getValue() : 0,
            locStruct.hasField('OrientationY') ? locStruct.getFieldByLabel('OrientationY').getValue() : 0,
            locStruct.hasField('OrientationZ') ? locStruct.getFieldByLabel('OrientationZ').getValue() : 0,
          );
        }else{
          value = new EngineLocation(0,0,0,0,0,0);
        }
      }else{
        continue;
      }
      this.entries.push({ name, type, value });
    }
  }

  /**
   * Write entries into an existing LIST field (creates child structs).
   */
  writeToListField(listField: GFFField){
    for(let i = 0; i < this.entries.length; i++){
      const e = this.entries[i];
      const struct = new GFFStruct(0);
      struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'Name')).setValue(e.name);
      struct.addField(new GFFField(GFFDataType.DWORD, 'Type')).setValue(e.type);
      if(e.type === ScriptVarType.Int){
        struct.addField(new GFFField(GFFDataType.INT, 'Value')).setValue(Number(e.value) | 0);
      }else if(e.type === ScriptVarType.Float){
        struct.addField(new GFFField(GFFDataType.FLOAT, 'Value')).setValue(Number(e.value));
      }else if(e.type === ScriptVarType.String){
        struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'Value')).setValue(String(e.value ?? ''));
      }else if(e.type === ScriptVarType.Object){
        struct.addField(new GFFField(GFFDataType.DWORD, 'Value')).setValue(Number(e.value) >>> 0);
      }else if(e.type === ScriptVarType.Location && e.value instanceof EngineLocation){
        const locField = struct.addField(new GFFField(GFFDataType.STRUCT, 'Value'));
        const locStruct = new GFFStruct(0);
        locStruct.addField(new GFFField(GFFDataType.FLOAT, 'OrientationX')).setValue(e.value.rotation.x);
        locStruct.addField(new GFFField(GFFDataType.FLOAT, 'OrientationY')).setValue(e.value.rotation.y);
        locStruct.addField(new GFFField(GFFDataType.FLOAT, 'OrientationZ')).setValue(e.value.rotation.z);
        locStruct.addField(new GFFField(GFFDataType.FLOAT, 'PositionX')).setValue(e.value.position.x);
        locStruct.addField(new GFFField(GFFDataType.FLOAT, 'PositionY')).setValue(e.value.position.y);
        locStruct.addField(new GFFField(GFFDataType.FLOAT, 'PositionZ')).setValue(e.value.position.z);
        locField.addChildStruct(locStruct);
      }
      listField.addChildStruct(struct);
    }
  }
}
