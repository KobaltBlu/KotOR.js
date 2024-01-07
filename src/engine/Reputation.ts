import { GFFStruct } from "../resource/GFFStruct";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";

/**
 * Reputation class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Reputation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Reputation {

  id1 = -1;
  id2 = -1;
  reputation = 100;

  constructor(id1: number = -1, id2: number = -1, reputation: number = 100){
    this.id1 = id1;
    this.id2 = id2;
    this.reputation = reputation;
  }

  toStruct(structIdx: number, id1 = -1, id2 = -1){
    let struct = new GFFStruct(structIdx);

    struct.addField( new GFFField(GFFDataType.DWORD, 'FactionID1') )?.setValue(id1);
    struct.addField( new GFFField(GFFDataType.DWORD, 'FactionID2') )?.setValue(id2);
    struct.addField( new GFFField(GFFDataType.DWORD, 'FactionRep') )?.setValue(this.reputation);

    return struct;
  }

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let reputation = new Reputation();
      if(struct.hasField('FactionID1'))
        reputation.id1 = struct.getFieldByLabel('FactionID1')?.getValue();

      if(struct.hasField('FactionID2'))
        reputation.id2 = struct.getFieldByLabel('FactionID2')?.getValue();

      if(struct.hasField('FactionRep'))
        reputation.reputation = struct.getFieldByLabel('FactionRep')?.getValue();

      return reputation;
    }
    return undefined;
  }

}