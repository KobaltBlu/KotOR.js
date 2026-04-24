import { describe, expect, it } from '@jest/globals';
import { DeepObject } from '@/utility/DeepObject';

describe('DeepObject', () => {
  // -------------------------------------------------------------------------
  // _isObject
  // -------------------------------------------------------------------------
  describe('_isObject', () => {
    it('returns true for a plain object literal', () => {
      expect(DeepObject._isObject({})).toBe(true);
    });

    it('returns true for a non-empty plain object', () => {
      expect(DeepObject._isObject({ a: 1 })).toBe(true);
    });

    it('returns false for null', () => {
      expect(DeepObject._isObject(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(DeepObject._isObject(undefined)).toBe(false);
    });

    it('returns false for an array', () => {
      expect(DeepObject._isObject([])).toBe(false);
    });

    it('returns false for a string', () => {
      expect(DeepObject._isObject('hello')).toBe(false);
    });

    it('returns false for a number', () => {
      expect(DeepObject._isObject(42)).toBe(false);
    });

    it('returns false for a boolean', () => {
      expect(DeepObject._isObject(true)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Merge – shallow / scalar values
  // -------------------------------------------------------------------------
  describe('Merge – scalar overwrite', () => {
    it('copies a scalar property from source to target', () => {
      const target = { a: 1 };
      const result = DeepObject.Merge(target, { a: 2 });
      expect(result.a).toBe(2);
    });

    it('merges new scalar properties onto target', () => {
      const target: any = {};
      const result: any = DeepObject.Merge(target, { x: 10, y: 20 });
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
    });

    it('preserves target properties not present in source', () => {
      const target: any = { keep: true, overwrite: 1 };
      const result: any = DeepObject.Merge(target, { overwrite: 99 });
      expect(result.keep).toBe(true);
      expect(result.overwrite).toBe(99);
    });

    it('returns the same target object reference', () => {
      const target: any = {};
      const result = DeepObject.Merge(target, { a: 1 });
      expect(result).toBe(target);
    });
  });

  // -------------------------------------------------------------------------
  // Merge – nested / deep merging
  // -------------------------------------------------------------------------
  describe('Merge – deep nested objects', () => {
    it('deep-merges nested plain objects without overwriting sibling keys', () => {
      const target: any = { nested: { a: 1, b: 2 } };
      const result: any = DeepObject.Merge(target, { nested: { b: 99, c: 3 } });
      expect(result.nested.a).toBe(1); // not overwritten
      expect(result.nested.b).toBe(99); // merged
      expect(result.nested.c).toBe(3); // added
    });

    it('recursively deep-merges three levels', () => {
      const target: any = { a: { b: { c: 1 } } };
      const result: any = DeepObject.Merge(target, { a: { b: { c: 2, d: 3 } } });
      expect(result.a.b.c).toBe(2);
      expect(result.a.b.d).toBe(3);
    });

    it('a non-object source value overwrites a nested target object', () => {
      const target: any = { data: { x: 1, y: 2 } };
      const result: any = DeepObject.Merge(target, { data: 'primitive' });
      expect(result.data).toBe('primitive');
    });

    it('a source nested object overwrites a target scalar', () => {
      const target: any = { data: 'old' };
      const result: any = DeepObject.Merge(target, { data: { x: 1 } });
      expect(result.data).toEqual({ x: 1 });
    });
  });

  // -------------------------------------------------------------------------
  // Merge – multiple sources
  // -------------------------------------------------------------------------
  describe('Merge – multiple sources', () => {
    it('applies multiple sources left-to-right', () => {
      const target: any = {};
      const result: any = DeepObject.Merge(target, { a: 1 }, { b: 2 }, { a: 3 });
      expect(result.a).toBe(3); // last source wins
      expect(result.b).toBe(2);
    });

    it('correctly processes three sources with nested objects', () => {
      const target: any = { x: { v: 0 } };
      const result: any = DeepObject.Merge(target, { x: { v: 1, w: 'foo' } }, { x: { w: 'bar' } });
      expect(result.x.v).toBe(1);
      expect(result.x.w).toBe('bar');
    });

    it('no sources returns target unchanged', () => {
      const target: any = { a: 1 };
      const result: any = DeepObject.Merge(target);
      expect(result.a).toBe(1);
    });
  });
});
