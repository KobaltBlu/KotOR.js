/**
 * @jest-environment node
 *
 * TPC mip leftovers can glue printable junk onto the first TXI line
 * (fx_static → "1((blending additive"). Without stripping, blending never
 * parses and mine/force-cage bubbles use NormalBlending instead of Additive.
 */
import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import { TXI } from '@core/resource/TXI';
import { TXIBlending } from '@core/enums/graphics/txi/TXIBlending';
import { TPCObject } from '@core/resource/TPCObject';

describe('TXI blending with TPC junk prefix', () => {
  test('parses blending additive when first line has printable mip junk', () => {
    const txi = new TXI('1((blending additive\r\ndecal 1\r\ncompresstexture 0\r\n');
    expect(txi.blending).toBe(TXIBlending.ADDITIVE);
    expect(txi.decal).toBe(1);
  });

  test('sanitizeTxiText slices to first directive keyword', () => {
    const cleaned = TPCObject.sanitizeTxiText('1((blending additive\r\ndecal 1\r\n');
    expect(cleaned.startsWith('blending')).toBe(true);
    expect(cleaned).toContain('decal 1');
  });

  test('fx_static.tpc TXI resolves to additive + decal', () => {
    const path = 'exports/k1/texture/fx_static.tpc';
    if (!fs.existsSync(path)) {
      return; // optional asset
    }
    const buf = new Uint8Array(fs.readFileSync(path));
    const tpc = new TPCObject({ file: buf, filename: 'fx_static' } as any);
    expect(tpc.txi.blending).toBe(TXIBlending.ADDITIVE);
    expect(tpc.txi.decal).toBe(1);
  });

  test('force-cage PLC_FrcDist TXI resolves to additive', () => {
    for (const name of ['plc_frcdist01', 'plc_frcdist02']) {
      const path = `exports/k1/texture/${name}.tpc`;
      if (!fs.existsSync(path)) {
        continue;
      }
      const buf = new Uint8Array(fs.readFileSync(path));
      const tpc = new TPCObject({ file: buf, filename: name } as any);
      expect(tpc.txi.blending).toBe(TXIBlending.ADDITIVE);
    }
  });
});
