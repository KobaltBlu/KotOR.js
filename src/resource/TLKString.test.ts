import { describe, expect, it, jest } from '@jest/globals';
import { TLKString } from '@/resource/TLKString';
import { BinaryReader } from '@/utility/binary/BinaryReader';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a BinaryReader whose data window starts with the given string. */
function readerFromString(text: string): BinaryReader {
  const buf = Buffer.from(text, 'binary');
  return new BinaryReader(buf);
}

function makeTLKString(
  overrides: Partial<{
    flags: number;
    SoundResRef: string;
    VolumeVariance: number;
    PitchVariance: number;
    StringOffset: number;
    StringLength: number;
    SoundLength: number;
    Value: string;
  }> = {}
): TLKString {
  return new TLKString(
    overrides.flags ?? 1,
    overrides.SoundResRef ?? 'vo_sound',
    overrides.VolumeVariance ?? 0,
    overrides.PitchVariance ?? 0,
    overrides.StringOffset ?? 0,
    overrides.StringLength ?? 0,
    overrides.SoundLength ?? 0,
    overrides.Value
  );
}

// ---------------------------------------------------------------------------
// Constructor & property defaults
// ---------------------------------------------------------------------------
describe('TLKString', () => {
  describe('constructor', () => {
    it('stores all constructor arguments as public properties', () => {
      const s = new TLKString(3, 'snd_ref', 1, 2, 10, 5, 3, 'Hello');
      expect(s.flags).toBe(3);
      expect(s.SoundResRef).toBe('snd_ref');
      expect(s.VolumeVariance).toBe(1);
      expect(s.PitchVariance).toBe(2);
      expect(s.StringOffset).toBe(10);
      expect(s.StringLength).toBe(5);
      expect(s.SoundLength).toBe(3);
      expect(s.Value).toBe('Hello');
    });

    it('Value defaults to undefined when omitted', () => {
      const s = new TLKString(0, '', 0, 0, 0, 0, 0);
      expect(s.Value).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // GetValue
  // -------------------------------------------------------------------------
  describe('GetValue', () => {
    it('reads the string from the BinaryReader at StringOffset', () => {
      const text = 'Hello KotOR';
      const reader = readerFromString(text);
      const s = makeTLKString({ StringOffset: 0, StringLength: text.length });
      s.GetValue(reader);
      expect(s.Value).toBe(text);
    });

    it('reads a substring at a non-zero StringOffset', () => {
      // reader data: "SKIP_World"
      const prefix = 'SKIP_';
      const payload = 'World';
      const full = prefix + payload;
      const reader = readerFromString(full);
      const s = makeTLKString({
        StringOffset: prefix.length,
        StringLength: payload.length,
      });
      s.GetValue(reader);
      expect(s.Value).toBe(payload);
    });

    it('strips embedded null terminators from the read value', () => {
      const rawText = 'Hi\0there';
      const reader = readerFromString(rawText);
      const s = makeTLKString({ StringOffset: 0, StringLength: rawText.length });
      s.GetValue(reader);
      expect(s.Value).toBe('Hi');
    });

    it('calls the onReturn callback with the resolved value', () => {
      const text = 'Test';
      const reader = readerFromString(text);
      const s = makeTLKString({ StringOffset: 0, StringLength: text.length });
      const cb = jest.fn();
      s.GetValue(reader, cb);
      expect(cb).toHaveBeenCalledWith('Test');
    });

    it('does not call onReturn when Value is already populated', () => {
      const reader = readerFromString('ignored');
      const s = makeTLKString({ Value: 'cached' });
      const cb = jest.fn();
      s.GetValue(reader, cb);
      expect(cb).not.toHaveBeenCalled();
      expect(s.Value).toBe('cached'); // unchanged
    });

    it('restores the reader position after reading', () => {
      const data = 'ABCHello';
      const reader = readerFromString(data);
      reader.seek(3); // advance to some position
      const originalPos = reader.tell();
      const s = makeTLKString({ StringOffset: 3, StringLength: 5 }); // reads "Hello"
      s.GetValue(reader);
      expect(reader.tell()).toBe(originalPos); // position is restored
    });

    it('does not re-read if Value is already set', () => {
      const reader = readerFromString('new data');
      const s = makeTLKString({ Value: 'original', StringOffset: 0, StringLength: 8 });
      s.GetValue(reader);
      expect(s.Value).toBe('original');
    });
  });

  // -------------------------------------------------------------------------
  // ToDB
  // -------------------------------------------------------------------------
  describe('ToDB', () => {
    it('returns a plain object with all expected fields', () => {
      const s = makeTLKString({
        flags: 7,
        SoundResRef: 'vo_test',
        VolumeVariance: 2,
        PitchVariance: 3,
        Value: 'Some text',
      });
      const row = s.ToDB();
      expect(row.flags).toBe(7);
      expect(row.SoundResRef).toBe('vo_test');
      expect(row.VolumeVariance).toBe(2);
      expect(row.PitchVariance).toBe(3);
      expect(row.Value).toBe('Some text');
    });

    it('strips null terminators from Value in the DB row', () => {
      const s = makeTLKString({ Value: 'Hello\0World' });
      expect(s.ToDB().Value).toBe('Hello');
    });

    it('returns empty string for Value when Value is undefined', () => {
      const s = makeTLKString({ Value: undefined });
      expect(s.ToDB().Value).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // FromDB
  // -------------------------------------------------------------------------
  describe('FromDB', () => {
    it('updates all fields from a DB row', () => {
      const s = makeTLKString();
      s.FromDB({
        flags: 5,
        SoundResRef: 'updated_snd',
        VolumeVariance: 10,
        PitchVariance: 20,
        Value: 'New value',
      });
      expect(s.flags).toBe(5);
      expect(s.SoundResRef).toBe('updated_snd');
      expect(s.VolumeVariance).toBe(10);
      expect(s.PitchVariance).toBe(20);
      expect(s.Value).toBe('New value');
    });

    it('strips null terminators from the Value row field', () => {
      const s = makeTLKString();
      s.FromDB({ flags: 0, SoundResRef: '', VolumeVariance: 0, PitchVariance: 0, Value: 'Text\0garbage' });
      expect(s.Value).toBe('Text');
    });
  });

  // -------------------------------------------------------------------------
  // FromDBObj
  // -------------------------------------------------------------------------
  describe('FromDBObj', () => {
    it('creates a new TLKString from a DB row', () => {
      const row = { flags: 2, SoundResRef: 'snd', VolumeVariance: 1, PitchVariance: 1, Value: 'Hello' };
      const s = TLKString.FromDBObj(row);
      expect(s).toBeInstanceOf(TLKString);
      expect(s.flags).toBe(2);
      expect(s.SoundResRef).toBe('snd');
      expect(s.VolumeVariance).toBe(1);
      expect(s.PitchVariance).toBe(1);
      expect(s.Value).toBe('Hello');
    });

    it('sets StringOffset to 0 and StringLength to Value.length', () => {
      const row = { flags: 0, SoundResRef: '', VolumeVariance: 0, PitchVariance: 0, Value: 'Test' };
      const s = TLKString.FromDBObj(row);
      expect(s.StringOffset).toBe(0);
      expect(s.StringLength).toBe('Test'.length);
    });

    it('sets SoundLength to 0', () => {
      const row = { flags: 0, SoundResRef: '', VolumeVariance: 0, PitchVariance: 0, Value: 'x' };
      const s = TLKString.FromDBObj(row);
      expect(s.SoundLength).toBe(0);
    });

    it('round-trips through ToDB → FromDBObj', () => {
      const original = new TLKString(4, 'snd_rt', 5, 6, 0, 9, 0, 'Round trip');
      const row = original.ToDB();
      const restored = TLKString.FromDBObj(row);
      expect(restored.flags).toBe(original.flags);
      expect(restored.SoundResRef).toBe(original.SoundResRef);
      expect(restored.Value).toBe(original.Value);
    });
  });
});
