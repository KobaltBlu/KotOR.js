import {
  detectResourceTypeFromBuffer,
  getResourceTypeFromExtension,
  resolveResourceType,
} from './ResourceHeuristics';
import { ResourceTypes } from './ResourceTypes';

describe('ResourceHeuristics', () => {
  describe('getResourceTypeFromExtension', () => {
    it('returns bmp type for .bmp', () => {
      const r = ResourceTypes as Record<string, number>;
      expect(getResourceTypeFromExtension('.bmp')).toBe(r['bmp']);
      expect(getResourceTypeFromExtension('bmp')).toBe(r['bmp']);
    });

    it('returns 2da type for .2da and 2da', () => {
      const r = ResourceTypes as Record<string, number>;
      expect(getResourceTypeFromExtension('.2da')).toBe(r['2da']);
      expect(getResourceTypeFromExtension('2da')).toBe(r['2da']);
    });

    it('returns tpc type for .tpc', () => {
      const r = ResourceTypes as Record<string, number>;
      expect(getResourceTypeFromExtension('.tpc')).toBe(r['tpc']);
      expect(getResourceTypeFromExtension('TPC')).toBe(r['tpc']);
    });

    it('returns wav type for .wav', () => {
      const r = ResourceTypes as Record<string, number>;
      expect(getResourceTypeFromExtension('wav')).toBe(r['wav']);
    });

    it('returns NA for unknown extension', () => {
      expect(getResourceTypeFromExtension('.xyz')).toBe(0xffff);
      expect(getResourceTypeFromExtension('')).toBe(0xffff);
    });
  });

  describe('detectResourceTypeFromBuffer', () => {
    it('detects 2da from binary header', () => {
      const buf = new Uint8Array(32);
      const enc = new TextEncoder();
      enc.encodeInto('2DA ', buf);
      enc.encodeInto('V2.b', buf.subarray(4));
      buf[8] = 0x0a;
      const res = detectResourceTypeFromBuffer(buf);
      expect(res).toBe((ResourceTypes as Record<string, number>)['2da']);
    });

    it('detects wav from RIFF magic', () => {
      const buf = new Uint8Array(16);
      buf[0] = 0x52;
      buf[1] = 0x49;
      buf[2] = 0x46;
      buf[3] = 0x46;
      const res = detectResourceTypeFromBuffer(buf);
      expect(res).toBe((ResourceTypes as Record<string, number>)['wav']);
    });

    it('detects wav from SFX magic', () => {
      const buf = new Uint8Array(8);
      buf[0] = 0xff;
      buf[1] = 0xf3;
      buf[2] = 0x60;
      buf[3] = 0xc4;
      const res = detectResourceTypeFromBuffer(buf);
      expect(res).toBe((ResourceTypes as Record<string, number>)['wav']);
    });

    it('detects bmp from BM magic', () => {
      const buf = new Uint8Array(60);
      buf[0] = 0x42;
      buf[1] = 0x4d;
      const res = detectResourceTypeFromBuffer(buf);
      expect(res).toBe((ResourceTypes as Record<string, number>)['bmp']);
    });

    it('detects txi from keyword in first 256 bytes', () => {
      const buf = new TextEncoder().encode('compresstexture 0\nmipmap 1');
      const res = detectResourceTypeFromBuffer(buf);
      expect(res).toBe((ResourceTypes as Record<string, number>)['txi']);
    });

    it('returns null for too short buffer', () => {
      expect(detectResourceTypeFromBuffer(new Uint8Array(2))).toBeNull();
      expect(detectResourceTypeFromBuffer(new Uint8Array(0))).toBeNull();
    });
  });

  describe('resolveResourceType', () => {
    it('prefers extension when recognized', () => {
      const buf = new Uint8Array(20);
      buf[0] = 0x52;
      buf[1] = 0x49;
      buf[2] = 0x46;
      buf[3] = 0x46;
      const r = ResourceTypes as Record<string, number>;
      expect(resolveResourceType(buf, '.2da')).toBe(r['2da']);
      expect(resolveResourceType(buf, 'txi')).toBe(r['txi']);
    });

    it('falls back to buffer when extension unknown', () => {
      const buf = new Uint8Array(32);
      const enc = new TextEncoder();
      enc.encodeInto('2DA ', buf);
      enc.encodeInto('V2.b', buf.subarray(4));
      buf[8] = 0x0a;
      expect(resolveResourceType(buf, '.xyz')).toBe((ResourceTypes as Record<string, number>)['2da']);
    });

    it('returns NA when both extension and buffer unknown', () => {
      const buf = new Uint8Array(10);
      buf.fill(0xab);
      expect(resolveResourceType(buf, '.xyz')).toBe(0xffff);
    });
  });
});
