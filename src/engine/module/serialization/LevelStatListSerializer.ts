import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import { SkillType } from '@core/enums/nwscript/SkillType';
import {
  LevelUpAbilityIndex,
  createEmptyLevelStatRecord,
  type LevelStatRecord,
} from '@engine/rules/level-up';
import type { GffRoot } from '@engine/module/serialization/types';

/**
 * PC LvlStatList ↔ LevelStatRecord[].
 */
export class LevelStatListSerializer {
  static read(root: GffRoot): LevelStatRecord[] {
    if (!root.hasField('LvlStatList')) return [];
    const lvlList = root.getFieldByLabel('LvlStatList').getChildStructs?.() || [];
    const out: LevelStatRecord[] = [];
    for (let i = 0; i < lvlList.length; i++) {
      const ls = lvlList[i];
      const rec = createEmptyLevelStatRecord();
      if (ls.hasField('LvlStatClass')) {
        rec.classId = ls.getFieldByLabel('LvlStatClass').getValue() | 0;
      }
      if (ls.hasField('LvlStatHitDie')) {
        rec.hpChange = ls.getFieldByLabel('LvlStatHitDie').getValue() | 0;
      }
      if (ls.hasField('LvlStatForce')) {
        rec.fpChange = ls.getFieldByLabel('LvlStatForce').getValue() | 0;
      }
      if (ls.hasField('LvlStatAbility')) {
        rec.attributeIndex = ls.getFieldByLabel('LvlStatAbility').getValue() | 0;
      }
      if (ls.hasField('SkillPoints')) {
        rec.skillPointsRemaining = ls.getFieldByLabel('SkillPoints').getValue() | 0;
      }
      if (ls.hasField('SkillList')) {
        const skills = ls.getFieldByLabel('SkillList').getChildStructs?.() || [];
        for (let s = 0; s < SkillType.MAX_SKILLS && s < skills.length; s++) {
          rec.skillRankChanges[s] = skills[s].getFieldByLabel('Rank')?.getValue() | 0;
        }
      }
      if (ls.hasField('FeatList')) {
        const feats = ls.getFieldByLabel('FeatList').getChildStructs?.() || [];
        for (let f = 0; f < feats.length; f++) {
          rec.feats.push(feats[f].getFieldByLabel('Feat')?.getValue() | 0);
        }
      }
      if (ls.hasField('KnownList0')) {
        const known = ls.getFieldByLabel('KnownList0').getChildStructs?.() || [];
        for (let k = 0; k < known.length; k++) {
          rec.spellsAdded.push(known[k].getFieldByLabel('Spell')?.getValue() | 0);
        }
      }
      if (ls.hasField('KnownRemoveList0')) {
        const removed = ls.getFieldByLabel('KnownRemoveList0').getChildStructs?.() || [];
        for (let k = 0; k < removed.length; k++) {
          rec.spellsRemoved.push(removed[k].getFieldByLabel('Spell')?.getValue() | 0);
        }
      }
      out.push(rec);
    }
    return out;
  }

  static serializeRecord(rec: LevelStatRecord, levelIndex: number): GFFStruct {
    const s = new GFFStruct(0);
    if (
      levelIndex > 0 &&
      rec.attributeIndex >= 0 &&
      rec.attributeIndex !== LevelUpAbilityIndex.NONE
    ) {
      s.addField(new GFFField(GFFDataType.BYTE, 'LvlStatAbility')).setValue(rec.attributeIndex | 0);
    }
    s.addField(new GFFField(GFFDataType.BYTE, 'LvlStatHitDie')).setValue(rec.hpChange | 0);
    s.addField(new GFFField(GFFDataType.BYTE, 'LvlStatForce')).setValue(rec.fpChange | 0);
    s.addField(new GFFField(GFFDataType.BYTE, 'LvlStatClass')).setValue(rec.classId | 0);
    if (rec.spellsAdded.length > 0) {
      const known = s.addField(new GFFField(GFFDataType.LIST, 'KnownList0'));
      for (let i = 0; i < rec.spellsAdded.length; i++) {
        const ks = new GFFStruct(0);
        ks.addField(new GFFField(GFFDataType.WORD, 'Spell')).setValue(rec.spellsAdded[i] | 0);
        known.addChildStruct(ks);
      }
    }
    if (rec.spellsRemoved.length > 0) {
      const rem = s.addField(new GFFField(GFFDataType.LIST, 'KnownRemoveList0'));
      for (let i = 0; i < rec.spellsRemoved.length; i++) {
        const rs = new GFFStruct(0);
        rs.addField(new GFFField(GFFDataType.WORD, 'Spell')).setValue(rec.spellsRemoved[i] | 0);
        rem.addChildStruct(rs);
      }
    }
    s.addField(new GFFField(GFFDataType.WORD, 'SkillPoints')).setValue(
      rec.skillPointsRemaining | 0,
    );
    const skillList = s.addField(new GFFField(GFFDataType.LIST, 'SkillList'));
    for (let i = 0; i < SkillType.MAX_SKILLS; i++) {
      const sk = new GFFStruct(0);
      sk.addField(new GFFField(GFFDataType.BYTE, 'Rank')).setValue(
        (rec.skillRankChanges[i] | 0) & 0xff,
      );
      skillList.addChildStruct(sk);
    }
    const featList = s.addField(new GFFField(GFFDataType.LIST, 'FeatList'));
    for (let i = 0; i < rec.feats.length; i++) {
      const fs = new GFFStruct(0);
      fs.addField(new GFFField(GFFDataType.WORD, 'Feat')).setValue(rec.feats[i] | 0);
      featList.addChildStruct(fs);
    }
    return s;
  }

  static writeField(
    parent: { addField: (f: GFFField) => GFFField },
    records: LevelStatRecord[],
  ): void {
    if (!records?.length) return;
    const lvlStatList = parent.addField(new GFFField(GFFDataType.LIST, 'LvlStatList'));
    for (let i = 0; i < records.length; i++) {
      lvlStatList.addChildStruct(LevelStatListSerializer.serializeRecord(records[i], i));
    }
  }
}
