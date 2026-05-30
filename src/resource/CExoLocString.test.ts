import { describe, expect, it, jest } from '@jest/globals';

// Mock TLKManager before importing CExoLocString to avoid loader chain
jest.mock('@/managers/TLKManager', () => ({
  TLKManager: {
    TLKStrings: Array.from({ length: 1000 }, (_, i) => ({ Value: `TLK_${i}`, SoundResRef: '' })),
    GetStringById: jest.fn((index: number) => ({ Value: `TLK_${index}`, SoundResRef: '' })),
  },
}));

import { CExoLocString } from '@/resource/CExoLocString';
import { CExoLocSubString } from '@/resource/CExoLocSubString';

describe('CExoLocString', () => {
  describe('construction', () => {
    it('defaults to RESREF -1 and an empty strings array', () => {
      const loc = new CExoLocString();
      expect(loc.getRESREF()).toBe(-1);
      expect(loc.stringCount()).toBe(0);
    });

    it('accepts a RESREF in the constructor', () => {
      const loc = new CExoLocString(42);
      expect(loc.getRESREF()).toBe(42);
    });
  });

  describe('setRESREF', () => {
    it('updates the RESREF and returns this for chaining', () => {
      const loc = new CExoLocString();
      const returned = loc.setRESREF(99);
      expect(loc.getRESREF()).toBe(99);
      expect(returned).toBe(loc);
    });
  });

  describe('addSubString', () => {
    it('appends a CExoLocSubString at the next index', () => {
      const loc = new CExoLocString();
      const sub = new CExoLocSubString(0, 'Hello');
      loc.addSubString(sub);
      expect(loc.stringCount()).toBe(1);
      expect(loc.getString(0)).toBe(sub);
    });

    it('wraps a plain string in a new CExoLocSubString', () => {
      const loc = new CExoLocString();
      loc.addSubString('World');
      expect(loc.stringCount()).toBe(1);
      const sub = loc.getString(0);
      expect(sub).toBeInstanceOf(CExoLocSubString);
      expect(sub.str).toBe('World');
    });

    it('inserts at an explicit index', () => {
      const loc = new CExoLocString();
      loc.addSubString('English', 0);
      loc.addSubString('French', 2);
      expect(loc.getString(0).str).toBe('English');
      expect(loc.getString(2).str).toBe('French');
    });

    it('returns this for method chaining', () => {
      const loc = new CExoLocString();
      const returned = loc.addSubString('test');
      expect(returned).toBe(loc);
    });
  });

  describe('getStrings', () => {
    it('returns the full strings array', () => {
      const loc = new CExoLocString();
      loc.addSubString('a');
      loc.addSubString('b');
      const arr = loc.getStrings();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(2);
    });
  });

  describe('getValue', () => {
    it('returns the first substring str when strings are present', () => {
      const loc = new CExoLocString();
      loc.addSubString('Prologue narrator');
      expect(loc.getValue()).toBe('Prologue narrator');
    });

    it('returns an empty string when no strings and RESREF is -1', () => {
      const loc = new CExoLocString(-1);
      expect(loc.getValue()).toBe('');
    });

    it('falls back to TLKStrings[RESREF] when strings are empty and RESREF >= 0', () => {
      const { TLKManager } = require('@/managers/TLKManager');
      TLKManager.TLKStrings[5] = { Value: 'TLK entry five', SoundResRef: '' };

      const loc = new CExoLocString(5);
      expect(loc.getValue()).toBe('TLK entry five');
    });
  });

  describe('getTLKValue', () => {
    it('calls TLKManager.GetStringById and returns the Value string', () => {
      const { TLKManager } = require('@/managers/TLKManager');
      (TLKManager.GetStringById as jest.Mock).mockReturnValueOnce({ Value: 'Mock TLK', SoundResRef: '' });

      const loc = new CExoLocString(7);
      const result = loc.getTLKValue();

      expect(TLKManager.GetStringById).toHaveBeenCalledWith(7);
      expect(result).toBe('Mock TLK');
    });
  });
});

// ---------------------------------------------------------------------------

describe('CExoLocSubString', () => {
  it('encodes language and gender from the composite StringID', () => {
    // StringID = language * 2 + gender
    const sub = new CExoLocSubString(4, 'test'); // language=2, gender=0
    expect(sub.getLanguage()).toBe(2);
    expect(sub.getGender()).toBe(0);
    expect(sub.StringID).toBe(4);
  });

  it('handles odd StringIDs as gender=1', () => {
    const sub = new CExoLocSubString(5); // language=2, gender=1
    expect(sub.getLanguage()).toBe(2);
    expect(sub.getGender()).toBe(1);
  });

  it('GetStringID reconstructs the composite ID', () => {
    const sub = new CExoLocSubString(0);
    sub.setLanguage(3);
    sub.setGender(1);
    expect(sub.GetStringID()).toBe(7); // 3*2 + 1
  });

  it('getString and setString manage the str property', () => {
    const sub = new CExoLocSubString(0);
    sub.setString('Howdy');
    expect(sub.getString()).toBe('Howdy');
  });

  it('defaults str to empty string when no argument is provided', () => {
    const sub = new CExoLocSubString(0);
    expect(sub.getString()).toBe('');
  });
});
