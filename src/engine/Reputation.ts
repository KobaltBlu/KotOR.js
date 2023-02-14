import { GFFStruct } from "../resource/GFFStruct";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";

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

    struct.AddField( new GFFField(GFFDataType.DWORD, 'FactionID1') )?.SetValue(id1);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'FactionID2') )?.SetValue(id2);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'FactionRep') )?.SetValue(this.reputation);

    return struct;
  }

  // static GetReputationKey(id1 = -1, id2 = -1){
  //   if(id1 >= 0 && id2 >= 0){
  //     if(id1 <= id2){
  //       return id1+''+id2;
  //     }else{
  //       return id2+''+id1;
  //     }
  //   }
  //   return false;
  // }

  static FromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let reputation = new Reputation();
      if(struct.HasField('FactionID1'))
        reputation.id1 = struct.GetFieldByLabel('FactionID1')?.GetValue();

      if(struct.HasField('FactionID2'))
        reputation.id2 = struct.GetFieldByLabel('FactionID2')?.GetValue();

      if(struct.HasField('FactionRep'))
        reputation.reputation = struct.GetFieldByLabel('FactionRep')?.GetValue();

      return reputation;
    }
    return undefined;
  }

}