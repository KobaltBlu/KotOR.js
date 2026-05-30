import { describe, expect, it } from '@jest/globals';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFStruct } from '@/resource/GFFStruct';

describe('GFFStruct', () => {
  it('constructs with the given type and an empty field array', () => {
    const s = new GFFStruct(0x1234);
    expect(s.getType()).toBe(0x1234);
    expect(s.getFields()).toHaveLength(0);
  });

  it('constructs with type 0 by default', () => {
    const s = new GFFStruct();
    expect(s.getType()).toBe(0);
  });

  it('setType updates the type and returns this for chaining', () => {
    const s = new GFFStruct();
    const returned = s.setType(7);
    expect(s.getType()).toBe(7);
    expect(returned).toBe(s);
  });

  it('generates a non-empty uuid on construction', () => {
    const s1 = new GFFStruct();
    const s2 = new GFFStruct();
    expect(typeof s1.uuid).toBe('string');
    expect(s1.uuid.length).toBeGreaterThan(0);
    // Each instance should have a unique uuid
    expect(s1.uuid).not.toBe(s2.uuid);
  });

  describe('addField', () => {
    it('appends a field and returns it', () => {
      const s = new GFFStruct();
      const f = new GFFField(GFFDataType.CEXOSTRING, 'Name');
      const returned = s.addField(f);
      expect(returned).toBe(f);
      expect(s.getFields()).toHaveLength(1);
    });

    it('ignores null/undefined fields', () => {
      const s = new GFFStruct();
      s.addField(null);
      s.addField(undefined as any);
      expect(s.getFields()).toHaveLength(0);
    });

    it('can hold multiple fields', () => {
      const s = new GFFStruct();
      s.addField(new GFFField(GFFDataType.INT, 'Level'));
      s.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag'));
      s.addField(new GFFField(GFFDataType.FLOAT, 'HP'));
      expect(s.getFields()).toHaveLength(3);
    });
  });

  describe('getFieldByLabel', () => {
    it('returns the correct field by label', () => {
      const s = new GFFStruct();
      const f = new GFFField(GFFDataType.INT, 'MyField');
      s.addField(f);
      expect(s.getFieldByLabel('MyField')).toBe(f);
    });

    it('returns null for a missing label', () => {
      const s = new GFFStruct();
      expect(s.getFieldByLabel('Missing')).toBeNull();
    });

    it('is case-sensitive', () => {
      const s = new GFFStruct();
      s.addField(new GFFField(GFFDataType.INT, 'Tag'));
      expect(s.getFieldByLabel('tag')).toBeNull();
      expect(s.getFieldByLabel('TAG')).toBeNull();
    });
  });

  describe('hasField', () => {
    it('returns true for a field that exists', () => {
      const s = new GFFStruct();
      s.addField(new GFFField(GFFDataType.BYTE, 'Flag'));
      expect(s.hasField('Flag')).toBe(true);
    });

    it('returns false for a field that does not exist', () => {
      const s = new GFFStruct();
      expect(s.hasField('Absent')).toBe(false);
    });
  });

  describe('removeFieldByLabel', () => {
    it('removes a field and returns true', () => {
      const s = new GFFStruct();
      s.addField(new GFFField(GFFDataType.INT, 'Remove'));
      const removed = s.removeFieldByLabel('Remove');
      expect(removed).toBe(true);
      expect(s.getFields()).toHaveLength(0);
    });

    it('returns false when the label is not found', () => {
      const s = new GFFStruct();
      expect(s.removeFieldByLabel('Ghost')).toBe(false);
    });

    it('removes only the matching field and leaves others intact', () => {
      const s = new GFFStruct();
      s.addField(new GFFField(GFFDataType.INT, 'A'));
      s.addField(new GFFField(GFFDataType.INT, 'B'));
      s.addField(new GFFField(GFFDataType.INT, 'C'));

      s.removeFieldByLabel('B');

      expect(s.getFields()).toHaveLength(2);
      expect(s.hasField('A')).toBe(true);
      expect(s.hasField('C')).toBe(true);
      expect(s.hasField('B')).toBe(false);
    });
  });

  describe('mergeStruct', () => {
    it('copies all fields from another struct into this one', () => {
      const base = new GFFStruct();
      base.addField(new GFFField(GFFDataType.INT, 'Base1'));

      const incoming = new GFFStruct();
      incoming.addField(new GFFField(GFFDataType.INT, 'New1'));
      incoming.addField(new GFFField(GFFDataType.INT, 'New2'));

      base.mergeStruct(incoming);

      expect(base.getFields()).toHaveLength(3);
      expect(base.hasField('New1')).toBe(true);
      expect(base.hasField('New2')).toBe(true);
    });

    it('is a no-op for non-GFFStruct arguments', () => {
      const s = new GFFStruct();
      s.addField(new GFFField(GFFDataType.INT, 'X'));
      s.mergeStruct(null as any);
      s.mergeStruct({} as any);
      expect(s.getFields()).toHaveLength(1);
    });

    it('returns this for method chaining', () => {
      const s = new GFFStruct();
      const other = new GFFStruct();
      expect(s.mergeStruct(other)).toBe(s);
    });
  });

  describe('toJSON', () => {
    it('serializes the type and all field labels', () => {
      const s = new GFFStruct(42);
      const f1 = new GFFField(GFFDataType.INT, 'Level');
      f1.setValue(5);
      const f2 = new GFFField(GFFDataType.CEXOSTRING, 'Tag');
      f2.setValue('npc_bandit');
      s.addField(f1);
      s.addField(f2);

      const json = s.toJSON();

      expect(json.type).toBe(42);
      expect(Object.keys(json.fields)).toContain('Level');
      expect(Object.keys(json.fields)).toContain('Tag');
      expect(json.fields['Level'].value).toBe(5);
      expect(json.fields['Tag'].value).toBe('npc_bandit');
    });

    it('produces an empty fields object for an empty struct', () => {
      const s = new GFFStruct(0);
      const json = s.toJSON();
      expect(json.type).toBe(0);
      expect(Object.keys(json.fields)).toHaveLength(0);
    });
  });
});
