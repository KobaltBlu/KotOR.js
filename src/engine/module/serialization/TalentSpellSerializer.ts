import { GFFStruct } from '@core/resource/GFFStruct';
import { TalentSpell } from '@engine/talents/TalentSpell';
import { gffRootOf } from '@engine/module/serialization/types';

export class TalentSpellSerializer {
  static deserialize(source: GFFStruct): TalentSpell {
    const root = gffRootOf(source);
    const spell = new TalentSpell(
      root.hasField('Spell') ? root.getFieldByLabel('Spell').getValue() : 0,
    );
    if (root.hasField('SpellFlags')) {
      spell.setFlags(root.getFieldByLabel('SpellFlags').getValue());
    }
    if (root.hasField('SpellMetaMagic')) {
      spell.setMetaMagic(root.getFieldByLabel('SpellMetaMagic').getValue());
    }
    return spell;
  }

  static serialize(source: TalentSpell): GFFStruct {
    return source.save();
  }
}
