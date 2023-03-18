import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";


export class EncounterCreatureEntry{

  appearance = 0;
  resref = '';
  cr = 0;
  singleSpawn = 0;

  save(){
    let struct = new GFFStruct();

    //struct.AddField( new GFFField(GFFDataType.INT, 'Appearance') ).SetValue(this.appearance);
    struct.AddField( new GFFField(GFFDataType.RESREF, 'ResRef') ).SetValue(this.resref);
    struct.AddField( new GFFField(GFFDataType.FLOAT, 'CR') ).SetValue(this.cr);
    struct.AddField( new GFFField(GFFDataType.BYTE, 'SingleSpawn') ).SetValue(this.singleSpawn);

    return struct;
  }

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let entry = new EncounterCreatureEntry();
      if(struct.HasField('Appearance'))
        entry.appearance = struct.GetFieldByLabel('Appearance').GetValue();

      if(struct.HasField('ResRef'))
        entry.resref = struct.GetFieldByLabel('ResRef').GetValue();

      if(struct.HasField('CR'))
        entry.cr = struct.GetFieldByLabel('CR').GetValue();
  
      if(struct.HasField('SingleSpawn'))
        entry.singleSpawn = struct.GetFieldByLabel('SingleSpawn').GetValue();

      return entry;
    }
    return undefined;
  }

}