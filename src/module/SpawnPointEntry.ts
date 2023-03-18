import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import * as THREE from "three";


export class SpawnPointEntry{

  position = new THREE.Vector3();
  orientation = 0.0;

  save(){
    let struct = new GFFStruct();

    struct.AddField( new GFFField(GFFDataType.FLOAT, 'X') ).SetValue(this.position.x);
    struct.AddField( new GFFField(GFFDataType.FLOAT, 'Y') ).SetValue(this.position.y);
    struct.AddField( new GFFField(GFFDataType.FLOAT, 'Z') ).SetValue(this.position.z);
    struct.AddField( new GFFField(GFFDataType.FLOAT, 'Orientation') ).SetValue(this.orientation);

    return struct;
  }

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let entry = new SpawnPointEntry();
      if(struct.HasField('X'))
        entry.position.x = struct.GetFieldByLabel('X').GetValue();

      if(struct.HasField('Y'))
        entry.position.y = struct.GetFieldByLabel('Y').GetValue();

      if(struct.HasField('Z'))
        entry.position.z = struct.GetFieldByLabel('Z').GetValue();
  
      if(struct.HasField('Orientation'))
        entry.orientation = struct.GetFieldByLabel('Orientation').GetValue();

      return entry;
    }
    return undefined;
  }

}
