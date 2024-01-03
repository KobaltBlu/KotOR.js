import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";


export class EncounterSpawnEntry {

  spawnResref = '';
  spawnCR = 0;

  save(){
    let struct = new GFFStruct();

    struct.addField( new GFFField(GFFDataType.RESREF, 'SpawnResRef') ).setValue(this.spawnResref);
    struct.addField( new GFFField(GFFDataType.FLOAT, 'SpawnCR') ).setValue(this.spawnCR);

    return struct;
  }

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let entry = new EncounterSpawnEntry();

      if(struct.hasField('SpawnResRef'))
        entry.spawnResref = struct.getFieldByLabel('SpawnResRef').getValue();

      if(struct.hasField('SpawnCR'))
        entry.spawnCR = struct.getFieldByLabel('SpawnCR').getValue();

      return entry;
    }
    return undefined;
  }

}