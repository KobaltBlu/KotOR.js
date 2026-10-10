import { GFFStruct } from '@core/resource/GFFStruct';
import { TalentFeat } from '@engine/talents/TalentFeat';
import { gffRootOf } from '@engine/module/serialization/types';

export class TalentFeatSerializer {
  static deserialize(source: GFFStruct): TalentFeat {
    const root = gffRootOf(source);
    const id = root.hasField('Feat') ? root.getFieldByLabel('Feat').getValue() : 0;
    return new TalentFeat(id);
  }

  static serialize(source: TalentFeat): GFFStruct {
    return source.save();
  }
}
