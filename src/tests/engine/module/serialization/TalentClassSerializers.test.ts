/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameKey: 'KOTOR',
    SWRuleSet: {
      classes: [],
      feats: [],
      spells: [],
      savingThrowTables: new Map(),
      attackBonusTables: new Map(),
      featGains: undefined,
      spellGains: undefined,
      acBonuses: [],
    },
    TwoDAManager: { datatables: new Map() },
  },
}));

import { CreatureClassSerializer } from '@engine/module/serialization/CreatureClassSerializer';
import { TalentFeatSerializer } from '@engine/module/serialization/TalentFeatSerializer';
import { TalentSkillSerializer } from '@engine/module/serialization/TalentSkillSerializer';

describe('talent and creature class serializers', () => {
  it('round-trips class, feat, and skill list entries', () => {
    const classStruct = new GFFStruct(2);
    classStruct.addField(new GFFField(GFFDataType.INT, 'Class')).setValue(3);
    classStruct.addField(new GFFField(GFFDataType.SHORT, 'ClassLevel')).setValue(12);
    const creatureClass = CreatureClassSerializer.deserialize(classStruct);
    const classOutput = CreatureClassSerializer.serialize(creatureClass);
    expect(classOutput.getFieldByLabel('Class').getValue()).toBe(3);
    expect(classOutput.getFieldByLabel('ClassLevel').getValue()).toBe(12);

    const featStruct = new GFFStruct(1);
    featStruct.addField(new GFFField(GFFDataType.WORD, 'Feat')).setValue(42);
    const feat = TalentFeatSerializer.deserialize(featStruct);
    expect(TalentFeatSerializer.serialize(feat).getFieldByLabel('Feat').getValue()).toBe(42);

    const skillStruct = new GFFStruct(0);
    skillStruct.addField(new GFFField(GFFDataType.BYTE, 'Rank')).setValue(9);
    const skill = TalentSkillSerializer.deserialize(skillStruct, 4);
    expect(skill.id).toBe(4);
    expect(TalentSkillSerializer.serialize(skill).getFieldByLabel('Rank').getValue()).toBe(9);
  });
});
