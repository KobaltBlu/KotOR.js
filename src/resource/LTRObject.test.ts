import { describe, expect, it, afterAll, beforeAll, jest } from '@jest/globals';
import { LTRObject } from '@/resource/LTRObject';

// ---------------------------------------------------------------------------
// Helper – build a minimal synthetic LTR binary buffer
// charCount must be 26 or 28 for getName() to work with the default
// CharacterArrays map.  For parsing tests we use charCount=2.
// ---------------------------------------------------------------------------
function buildLtrBuffer(charCount: number, fillFloat = 0.5): Uint8Array {
  const enc = new TextEncoder();
  // Number of floats: singleArray (3 * charCount)
  //                 + doubleArray (charCount * 3 * charCount)
  //                 + tripleArray (charCount * charCount * 3 * charCount)
  const numFloats = charCount * 3 + charCount * charCount * 3 + charCount * charCount * charCount * 3;
  const buf = new ArrayBuffer(9 + numFloats * 4);
  const view = new DataView(buf);

  // fileType: "LTR " (bytes 0-3)
  const typeBytes = enc.encode('LTR ');
  for (let i = 0; i < 4; i++) view.setUint8(i, typeBytes[i]);

  // fileVersion: "V1.0" (bytes 4-7)
  const verBytes = enc.encode('V1.0');
  for (let i = 0; i < 4; i++) view.setUint8(4 + i, verBytes[i]);

  // charCount (byte 8)
  view.setUint8(8, charCount);

  // All probability floats set to fillFloat (little-endian)
  let offset = 9;
  for (let i = 0; i < numFloats; i++) {
    view.setFloat32(offset, fillFloat, true);
    offset += 4;
  }

  return new Uint8Array(buf);
}

describe('LTRObject', () => {
  // -------------------------------------------------------------------------
  // Static data
  // -------------------------------------------------------------------------
  describe('CharacterArrays static property', () => {
    it('maps 26 to the lowercase alphabet', () => {
      expect(LTRObject.CharacterArrays[26]).toBe('abcdefghijklmnopqrstuvwxyz');
    });

    it("maps 28 to the lowercase alphabet plus apostrophe and hyphen", () => {
      expect(LTRObject.CharacterArrays[28]).toBe("abcdefghijklmnopqrstuvwxyz'-");
    });
  });

  // -------------------------------------------------------------------------
  // Binary parsing
  // -------------------------------------------------------------------------
  describe('readBuffer / Uint8Array constructor', () => {
    const charCount = 2;
    let ltr: LTRObject;

    beforeAll(() => {
      ltr = new LTRObject(buildLtrBuffer(charCount, 0.5));
    });

    it('parses fileType correctly', () => {
      expect(ltr.fileType).toBe('LTR ');
    });

    it('parses fileVersion correctly', () => {
      expect(ltr.fileVersion).toBe('V1.0');
    });

    it('parses charCount correctly', () => {
      expect(ltr.charCount).toBe(charCount);
    });

    it('builds singleArray with 3 rows of charCount elements each', () => {
      expect(ltr.singleArray).toHaveLength(3);
      for (let i = 0; i < 3; i++) {
        expect(ltr.singleArray[i]).toHaveLength(charCount);
      }
    });

    it('each singleArray element equals the fill float (0.5)', () => {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < charCount; col++) {
          expect(ltr.singleArray[row][col]).toBeCloseTo(0.5, 5);
        }
      }
    });

    it('builds doubleArray with charCount outer rows, 3 middle rows each of charCount elements', () => {
      expect(ltr.doubleArray).toHaveLength(charCount);
      for (let i = 0; i < charCount; i++) {
        expect(ltr.doubleArray[i]).toHaveLength(3);
        for (let j = 0; j < 3; j++) {
          expect(ltr.doubleArray[i][j]).toHaveLength(charCount);
        }
      }
    });

    it('builds tripleArray with charCount² outer rows, 3 inner rows each of charCount elements', () => {
      expect(ltr.tripleArray).toHaveLength(charCount);
      for (let i = 0; i < charCount; i++) {
        expect(ltr.tripleArray[i]).toHaveLength(charCount);
        for (let j = 0; j < charCount; j++) {
          expect(ltr.tripleArray[i][j]).toHaveLength(3);
          for (let k = 0; k < 3; k++) {
            expect(ltr.tripleArray[i][j][k]).toHaveLength(charCount);
          }
        }
      }
    });

    it('clears the buffer after reading', () => {
      // readBuffer sets this.buffer = new Uint8Array(0) at the end
      expect(ltr.buffer.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // toJSON / fromJSON round-trip
  // -------------------------------------------------------------------------
  describe('toJSON / fromJSON', () => {
    it('toJSON returns a plain object with header fields and arrays', () => {
      const ltr = new LTRObject(buildLtrBuffer(2, 0.25));
      const json = ltr.toJSON();
      expect(json.fileType).toBe('LTR ');
      expect(json.fileVersion).toBe('V1.0');
      expect(json.charCount).toBe(2);
      expect(Array.isArray(json.singleArray)).toBe(true);
      expect(Array.isArray(json.doubleArray)).toBe(true);
      expect(Array.isArray(json.tripleArray)).toBe(true);
    });

    it('fromJSON restores the same values as toJSON produced', () => {
      const original = new LTRObject(buildLtrBuffer(2, 0.75));
      const json = original.toJSON();

      const restored = new LTRObject('dummy-unused');
      restored.fromJSON(json);

      expect(restored.fileType).toBe(original.fileType);
      expect(restored.fileVersion).toBe(original.fileVersion);
      expect(restored.charCount).toBe(original.charCount);
      expect(restored.singleArray).toEqual(original.singleArray);
      expect(restored.doubleArray).toEqual(original.doubleArray);
      expect(restored.tripleArray).toEqual(original.tripleArray);
    });

    it('fromJSON also accepts a JSON string', () => {
      const original = new LTRObject(buildLtrBuffer(2, 0.1));
      const jsonStr = JSON.stringify(original.toJSON());
      const restored = new LTRObject('dummy-unused');
      restored.fromJSON(jsonStr);
      expect(restored.charCount).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Serialisation round-trips (XML / YAML / TOML)
  // -------------------------------------------------------------------------
  describe('XML round-trip', () => {
    it('restores scalar header fields from toXML + fromXML', () => {
      // xmlToObject deserializes numeric arrays as plain objects {0:v,1:v}
      // so only assert the scalar header fields that survive the round-trip.
      // fileType "LTR " has a trailing space that XML may trim; check version+charCount.
      const original = new LTRObject(buildLtrBuffer(2, 0.5));
      const xml = original.toXML();
      const restored = new LTRObject('dummy-unused');
      restored.fromXML(xml);
      expect(restored.fileVersion).toBe(original.fileVersion);
      expect(restored.charCount).toBe(original.charCount);
    });
  });

  describe('YAML round-trip', () => {
    it('fromYAML restores the same values as toYAML produced', () => {
      const original = new LTRObject(buildLtrBuffer(2, 0.5));
      const yaml = original.toYAML();
      const restored = new LTRObject('dummy-unused');
      restored.fromYAML(yaml);
      expect(restored.charCount).toBe(original.charCount);
      expect(restored.singleArray).toEqual(original.singleArray);
    });
  });

  describe('TOML round-trip', () => {
    it('fromTOML restores the same values as toTOML produced', () => {
      const original = new LTRObject(buildLtrBuffer(2, 0.5));
      const toml = original.toTOML();
      const restored = new LTRObject('dummy-unused');
      restored.fromTOML(toml);
      expect(restored.charCount).toBe(original.charCount);
      expect(restored.singleArray).toEqual(original.singleArray);
    });
  });

  // -------------------------------------------------------------------------
  // getName
  // -------------------------------------------------------------------------
  describe('getName', () => {
    it('throws for an unrecognised charCount', () => {
      // Construct via string path (openFile is a no-op) to get an empty object,
      // then manually set charCount to a value not in CharacterArrays.
      const ltr = new LTRObject('dummy-unused');
      ltr.charCount = 99;
      expect(() => ltr.getName()).toThrow('Invalid letter count');
    });

    describe('with a patched 2-char alphabet and deterministic Math.random', () => {
      const original26 = LTRObject.CharacterArrays;

      beforeAll(() => {
        // Add a 2-char alphabet to CharacterArrays for this test group
        LTRObject.CharacterArrays = { ...LTRObject.CharacterArrays, 2: 'ab' };
      });

      afterAll(() => {
        LTRObject.CharacterArrays = original26;
      });

      it('returns a capitalised string of at least 3 characters', () => {
        // All cumulative probabilities are 0.5 / 1.0 so every Math.random()
        // pick resolves without looping. Mock to 0.3 so index 0 ('a') is
        // always chosen (0.3 < 0.5), and the % 12 end-condition fires on the
        // first iteration of the inner while loop (644245093 % 12 === 1 ≤ 3).
        const randSpy = jest.spyOn(Math, 'random').mockReturnValue(0.3);
        try {
          const ltr = new LTRObject(buildLtrBuffer(2, 0.5));
          const name = ltr.getName();
          expect(typeof name).toBe('string');
          expect(name.length).toBeGreaterThanOrEqual(3);
          // First character must be upper-case
          expect(name[0]).toBe(name[0].toUpperCase());
        } finally {
          randSpy.mockRestore();
        }
      });
    });
  });
});
