import { describe, expect, it } from '@jest/globals';
import { BitWise } from '@/utility/BitWise';

// Representative object-type bit flags that mirror game engine usage
const CREATURE  = 0b0001;
const ITEM      = 0b0010;
const DOOR      = 0b0100;
const PLACEABLE = 0b1000;

describe('BitWise', () => {
  describe('InstanceOf', () => {
    it('returns true when the value exactly matches the mask', () => {
      expect(BitWise.InstanceOf(CREATURE, CREATURE)).toBe(true);
    });

    it('returns true when the value contains all bits of the mask', () => {
      const combined = CREATURE | ITEM;
      expect(BitWise.InstanceOf(combined, CREATURE)).toBe(true);
      expect(BitWise.InstanceOf(combined, ITEM)).toBe(true);
    });

    it('returns false when the value does not contain the mask bits', () => {
      expect(BitWise.InstanceOf(CREATURE, ITEM)).toBe(false);
      expect(BitWise.InstanceOf(CREATURE, DOOR)).toBe(false);
    });

    it('returns false for muliti-bit mask when only some bits match', () => {
      const mask = CREATURE | ITEM;
      expect(BitWise.InstanceOf(CREATURE, mask)).toBe(false);
    });

    it('returns true for mask 0 against any value', () => {
      expect(BitWise.InstanceOf(CREATURE, 0)).toBe(true);
      expect(BitWise.InstanceOf(0, 0)).toBe(true);
    });

    it('returns false when value is undefined', () => {
      expect(BitWise.InstanceOf(undefined as any, CREATURE)).toBe(false);
    });
  });

  describe('InstanceOfObject', () => {
    it('returns the object when objectType matches the mask', () => {
      const obj = { objectType: CREATURE, name: 'Test' };
      expect(BitWise.InstanceOfObject(obj, CREATURE)).toBe(obj);
    });

    it('returns undefined when objectType does not match the mask', () => {
      const obj = { objectType: CREATURE, name: 'Test' };
      expect(BitWise.InstanceOfObject(obj, ITEM)).toBeUndefined();
    });

    it('returns the object when objectType contains all mask bits', () => {
      const obj = { objectType: CREATURE | ITEM | DOOR };
      expect(BitWise.InstanceOfObject(obj, CREATURE | ITEM)).toBe(obj);
    });

    it('returns undefined when only some mask bits are present', () => {
      const obj = { objectType: CREATURE };
      expect(BitWise.InstanceOfObject(obj, CREATURE | ITEM)).toBeUndefined();
    });

    it('returns undefined for null', () => {
      expect(BitWise.InstanceOfObject(null, CREATURE)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(BitWise.InstanceOfObject(undefined, CREATURE)).toBeUndefined();
    });

    it('returns undefined when value is a non-object (string)', () => {
      expect(BitWise.InstanceOfObject('not-an-object' as any, CREATURE)).toBeUndefined();
    });

    it('returns undefined when objectType is 0 and mask is non-zero', () => {
      const obj = { objectType: 0 };
      expect(BitWise.InstanceOfObject(obj, CREATURE)).toBeUndefined();
    });

    it('works with mask=0 (always matches any object with objectType)', () => {
      const obj = { objectType: CREATURE };
      expect(BitWise.InstanceOfObject(obj, 0)).toBe(obj);
    });

    it('is type-safe and returns the same reference type', () => {
      interface GameObj { objectType: number; hp: number }
      const obj: GameObj = { objectType: CREATURE, hp: 100 };
      const result = BitWise.InstanceOfObject(obj, CREATURE);
      // TypeScript: result is `GameObj | undefined`
      expect(result?.hp).toBe(100);
    });
  });

  describe('integration: multi-bit object type patterns', () => {
    it('can combine flags via OR and detect sub-flags', () => {
      const CREATURE_AND_PLACEABLE = CREATURE | PLACEABLE;
      expect(BitWise.InstanceOf(CREATURE_AND_PLACEABLE, CREATURE)).toBe(true);
      expect(BitWise.InstanceOf(CREATURE_AND_PLACEABLE, PLACEABLE)).toBe(true);
      expect(BitWise.InstanceOf(CREATURE_AND_PLACEABLE, ITEM)).toBe(false);
    });
  });
});
