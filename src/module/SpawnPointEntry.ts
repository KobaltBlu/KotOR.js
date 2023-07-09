import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import * as THREE from "three";


export class SpawnPointEntry{

  position = new THREE.Vector3();
  orientation = 0.0;

  save(){
    let struct = new GFFStruct();

    struct.addField( new GFFField(GFFDataType.FLOAT, 'X') ).setValue(this.position.x);
    struct.addField( new GFFField(GFFDataType.FLOAT, 'Y') ).setValue(this.position.y);
    struct.addField( new GFFField(GFFDataType.FLOAT, 'Z') ).setValue(this.position.z);
    struct.addField( new GFFField(GFFDataType.FLOAT, 'Orientation') ).setValue(this.orientation);

    return struct;
  }

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let entry = new SpawnPointEntry();
      if(struct.hasField('X'))
        entry.position.x = struct.getFieldByLabel('X').getValue();

      if(struct.hasField('Y'))
        entry.position.y = struct.getFieldByLabel('Y').getValue();

      if(struct.hasField('Z'))
        entry.position.z = struct.getFieldByLabel('Z').getValue();
  
      if(struct.hasField('Orientation'))
        entry.orientation = struct.getFieldByLabel('Orientation').getValue();

      return entry;
    }
    return undefined;
  }

}
