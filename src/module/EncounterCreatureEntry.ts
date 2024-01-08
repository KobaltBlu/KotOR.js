import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

/**
 * EncounterCreatureEntry class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EncounterCreatureEntry.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EncounterCreatureEntry {

  appearance = 0;
  resref = '';
  cr = 0;
  singleSpawn = 0;

  save(){
    let struct = new GFFStruct();

    //struct.addField( new GFFField(GFFDataType.INT, 'Appearance') ).setValue(this.appearance);
    struct.addField( new GFFField(GFFDataType.RESREF, 'ResRef') ).setValue(this.resref);
    struct.addField( new GFFField(GFFDataType.FLOAT, 'CR') ).setValue(this.cr);
    struct.addField( new GFFField(GFFDataType.BYTE, 'SingleSpawn') ).setValue(this.singleSpawn);

    return struct;
  }

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let entry = new EncounterCreatureEntry();
      if(struct.hasField('Appearance'))
        entry.appearance = struct.getFieldByLabel('Appearance').getValue();

      if(struct.hasField('ResRef'))
        entry.resref = struct.getFieldByLabel('ResRef').getValue();

      if(struct.hasField('CR'))
        entry.cr = struct.getFieldByLabel('CR').getValue();
  
      if(struct.hasField('SingleSpawn'))
        entry.singleSpawn = struct.getFieldByLabel('SingleSpawn').getValue();

      return entry;
    }
    return undefined;
  }

}