import { describe, expect, it } from '@jest/globals';
import { BinaryReader } from '@/utility/binary/BinaryReader';
import {
  clampResRefForGffWrite,
  normalizeResRefFromArchiveSlot,
  readGffResRefPayload,
  RESREF_FIXED_SLOT_BYTES,
  RESREF_GFF_MAX_PAYLOAD,
} from '@/resource/resRefLayout';

function readerFromBytes(bytes: number[]) {
  return new BinaryReader(Uint8Array.from(bytes));
}

describe('resRefLayout', () => {
  it('exposes a 16-byte fixed slot and GFF max payload of 16', () => {
    expect(RESREF_FIXED_SLOT_BYTES).toBe(16);
    expect(RESREF_GFF_MAX_PAYLOAD).toBe(16);
  });

  describe('normalizeResRefFromArchiveSlot', () => {
    it('strips trailing null padding', () => {
      expect(normalizeResRefFromArchiveSlot('foo\0\0\0')).toBe('foo');
    });

    it('returns empty for nullish', () => {
      expect(normalizeResRefFromArchiveSlot(null as unknown as string)).toBe('');
    });

    it('preserves a full 16-character name without truncation', () => {
      const sixteen = 'abcdefghijklmnop';
      expect(normalizeResRefFromArchiveSlot(sixteen)).toBe(sixteen);
    });
  });

  describe('clampResRefForGffWrite', () => {
    it('truncates to max payload length', () => {
      const long = 'a'.repeat(20);
      expect(clampResRefForGffWrite(long).length).toBe(RESREF_GFF_MAX_PAYLOAD);
    });

    it('strips trailing NUL tail before clamping', () => {
      expect(clampResRefForGffWrite('abc\0defghijklmnopqrs')).toBe('abc');
    });

    it('maps nullish to empty string', () => {
      expect(clampResRefForGffWrite(null)).toBe('');
      expect(clampResRefForGffWrite(undefined)).toBe('');
    });
  });

  describe('readGffResRefPayload', () => {
    it('returns empty when length byte is 0', () => {
      const r = readerFromBytes([0]);
      expect(readGffResRefPayload(r)).toBe('');
      expect(r.tell()).toBe(1);
    });

    it('reads a normal length-prefixed string', () => {
      const r = readerFromBytes([3, 0x61, 0x62, 0x63]); // len 3, "abc"
      expect(readGffResRefPayload(r)).toBe('abc');
      expect(r.tell()).toBe(4);
    });

    it('caps payload when length byte exceeds GFF max and skips overflow bytes', () => {
      const payload = Array.from({ length: 20 }, (_, i) => 0x61 + (i % 26)); // 20 letters
      const r = readerFromBytes([20, ...payload]);
      expect(readGffResRefPayload(r)).toBe('abcdefghijklmnop');
      // 1 (length) + 20 (declared; we read 16 and skip 4) = 21
      expect(r.tell()).toBe(21);
    });

    it('stops at embedded NUL inside the capped region', () => {
      const r = readerFromBytes([4, 0x78, 0x00, 0x79, 0x7a]);
      expect(readGffResRefPayload(r)).toBe('x');
    });
  });
});
