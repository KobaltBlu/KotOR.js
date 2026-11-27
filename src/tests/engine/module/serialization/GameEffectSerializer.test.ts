/**
 * GameEffectSerializer and EffectListSerializer round-trip coverage.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { GFFObject } from '@core/resource/GFFObject';
import type { GameEffect } from '@engine/effects/GameEffect';
import { EffectListSerializer } from '@engine/module/serialization/EffectListSerializer';
import { GameEffectSerializer } from '@engine/module/serialization/GameEffectSerializer';

function makeEffect(skipOnLoad = false): GameEffect {
  const effect = {
    id: 123,
    type: 7,
    subType: 9,
    duration: 12.5,
    skipOnLoad,
    expireDay: 4,
    expireTime: 500,
    creator: { id: 42 },
    spellId: 17,
    isExposed: false,
    numIntegers: 2,
    intList: [11, 22],
    floatList: [1.5, 2.5],
    stringList: ['first', 'second'],
    getSaveType() { return this.type; },
    getSubTypeUnMasked() { return this.subType; },
    getDuration() { return this.duration; },
    getExpireDay() { return this.expireDay; },
    getExpireTime() { return this.expireTime; },
    getSpellId() { return this.spellId; },
    getInt(index: number) { return this.intList[index]; },
    getFloat(index: number) { return this.floatList[index]; },
    getString(index: number) { return this.stringList[index]; },
    getObject(): undefined { return undefined; },
  };
  return effect as unknown as GameEffect;
}

describe('GameEffectSerializer', () => {
  it('serializes scalar fields and fixed nested lists', () => {
    const struct = GameEffectSerializer.serialize(makeEffect());

    expect(struct.type).toBe(2);
    expect(struct.getFieldByLabel('Id').getValue()).toBe(123n);
    expect(struct.getFieldByLabel('Type').getValue()).toBe(7);
    expect(struct.getFieldByLabel('SubType').getValue()).toBe(9);
    expect(struct.getFieldByLabel('Duration').getValue()).toBe(12.5);
    expect(struct.getFieldByLabel('SkipOnLoad').getValue()).toBe(0);
    expect(struct.getFieldByLabel('ExpireDay').getValue()).toBe(4);
    expect(struct.getFieldByLabel('ExpireTime').getValue()).toBe(500);
    expect(struct.getFieldByLabel('CreatorId').getValue()).toBe(42);
    expect(struct.getFieldByLabel('SpellId').getValue()).toBe(17);
    expect(struct.getFieldByLabel('IsExposed').getValue()).toBe(0);
    expect(struct.getFieldByLabel('NumIntegers').getValue()).toBe(2);
    expect(struct.getFieldByLabel('IntList').getChildStructs()).toHaveLength(2);
    expect(struct.getFieldByLabel('FloatList').getChildStructs()).toHaveLength(4);
    expect(struct.getFieldByLabel('StringList').getChildStructs()).toHaveLength(6);
    expect(struct.getFieldByLabel('ObjectList').getChildStructs()).toHaveLength(4);
  });

  it('round-trips EffectList through an injected factory and skips SkipOnLoad', () => {
    const gff = new GFFObject();
    EffectListSerializer.writeField(gff.RootNode, [makeEffect(), makeEffect(true)]);

    const target = { effects: [] as GameEffect[] };
    EffectListSerializer.deserialize(target, gff.RootNode, (struct) => {
      if (struct.getFieldByLabel('SkipOnLoad').getValue()) return undefined;
      return {
        id: Number(struct.getFieldByLabel('Id').getValue()),
        type: struct.getFieldByLabel('Type').getValue(),
        duration: struct.getFieldByLabel('Duration').getValue(),
      } as GameEffect;
    });

    expect(target.effects).toHaveLength(1);
    expect(target.effects[0]).toMatchObject({ id: 123, type: 7, duration: 12.5 });
  });
});
