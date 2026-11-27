import { GFFStruct } from '@core/resource/GFFStruct';
import { TalentSkill } from '@engine/talents/TalentSkill';
import { gffRootOf } from '@engine/module/serialization/types';

export class TalentSkillSerializer {
  static deserialize(source: GFFStruct, id = 0, target?: TalentSkill): TalentSkill {
    const root = gffRootOf(source);
    const skill = target || new TalentSkill(id);
    skill.setId(id);
    skill.setRank(root.hasField('Rank') ? root.getFieldByLabel('Rank').getValue() : 0);
    return skill;
  }

  static serialize(source: TalentSkill): GFFStruct {
    return source.save();
  }
}
