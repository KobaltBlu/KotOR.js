import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";


export class SpawnEntry{

  spawnResref = '';
  spawnCR = 0;

  save(){
    let struct = new GFFStruct();

    struct.AddField( new GFFField(GFFDataType.RESREF, 'SpawnResRef') ).SetValue(this.spawnResref);
    struct.AddField( new GFFField(GFFDataType.FLOAT, 'SpawnCR') ).SetValue(this.spawnCR);

    return struct;
  }

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let entry = new SpawnEntry();

      if(struct.HasField('SpawnResRef'))
        entry.spawnResref = struct.GetFieldByLabel('SpawnResRef').GetValue();

      if(struct.HasField('SpawnCR'))
        entry.spawnCR = struct.GetFieldByLabel('SpawnCR').GetValue();

      return entry;
    }
    return undefined;
  }

}