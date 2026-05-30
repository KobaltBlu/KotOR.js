import { TXI } from '@/resource/TXI';

describe('TXI', () => {
  function buildVendorFontTXI(charCount = 256): string {
    const lines = [
      'mipmap 0',
      'filter 0',
      `numchars ${charCount}`,
      'fontheight 0.500000',
      'baselineheight 0.400000',
      'texturewidth 1.000000',
      'fontwidth 1.000000',
      'spacingr 0.002600',
      'spacingb 0.100000',
      'caretindent -0.010000',
      'isdoublebyte 0',
      `upperleftcoords ${charCount}`,
    ];

    for (let index = 0; index < charCount; index++) {
      lines.push(`${index / 16 / 16} ${Math.floor(index / 16) / 8} 0`);
    }

    lines.push(`lowerrightcoords ${charCount}`);

    for (let index = 0; index < charCount; index++) {
      lines.push(`${((index % 16) + 1) / 16} ${(Math.floor(index / 16) + 1) / 8} 0`);
    }

    return lines.join('\n');
  }

  const sampleFontTXI = `
    mipmap 0
    filter 0
    numchars 3
    fontheight 0.500000
    baselineheight 0.400000
    texturewidth 1.000000
    spacingr 0.002600
    spacingb 0.100000
    caretindent -0.010000
    upperleftcoords 3
    0.000000 0.000000 0
    0.062500 0.000000 0
    0.125000 0.000000 0
    lowerrightcoords 3
    0.062500 0.125000 0
    0.125000 0.125000 0
    0.187500 0.125000 0
  `;

  it('parses from string', () => {
    const txi = new TXI('compresstexture 0\nmipmap 1');
    expect(txi.isCompressed).toBe(false);
    expect(txi.mipMap).toBe(1);
  });

  it('parseBlending handles default, additive, and punchthrough variants', () => {
    expect(TXI.parseBlending('default')).toBe(0);
    expect(TXI.parseBlending('DeFaUlT')).toBe(0);
    expect(TXI.parseBlending('DEFAULT')).toBe(0);
    expect(TXI.parseBlending('Default')).toBe(0);
    expect(TXI.parseBlending('additive')).toBe(1);
    expect(TXI.parseBlending('AdDiTiVe')).toBe(1);
    expect(TXI.parseBlending('ADDITIVE')).toBe(1);
    expect(TXI.parseBlending('Additive')).toBe(1);
    expect(TXI.parseBlending('punchthrough')).toBe(2);
    expect(TXI.parseBlending('PUNCHTHROUGH')).toBe(2);
    expect(TXI.parseBlending('Punchthrough')).toBe(2);
    expect(TXI.parseBlending('punch-through')).toBe(2);
    expect(TXI.parseBlending('invalid')).toBe(0);
    expect(TXI.parseBlending('')).toBe(0);
    expect(TXI.parseBlending('blend')).toBe(0);
  });

  it('fromBuffer parses Uint8Array', () => {
    const buf = new TextEncoder().encode('isbumpmap 1\nbumpmapscaling 2.0');
    const txi = TXI.fromBuffer(buf);
    expect(txi.isbumpmap).toBe(true);
    expect(txi.bumpMapScaling).toBe(2);
  });

  it('toString serializes back', () => {
    const txi = new TXI('compresstexture 0\nmipmap 1');
    const str = txi.toString();
    expect(str).toContain('compresstexture 0');
    expect(str).toContain('mipmap 1');
  });

  it('toBuffer and fromBuffer round-trip', () => {
    const txi = new TXI('compresstexture 0\nmipmap 1\nproceduretype cycle\nnumx 2\nnumy 2\nfps 12');
    const buf = txi.toBuffer();
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf.length).toBeGreaterThan(0);
    const txi2 = TXI.fromBuffer(buf);
    expect(txi2.isCompressed).toBe(txi.isCompressed);
    expect(txi2.mipMap).toBe(txi.mipMap);
    expect(txi2.procedureType).toBe(txi.procedureType);
    expect(txi2.numx).toBe(txi.numx);
    expect(txi2.numy).toBe(txi.numy);
    expect(txi2.fps).toBe(txi.fps);
  });

  it('parses indented font coordinate data', () => {
    const txi = new TXI(sampleFontTXI);

    expect(txi.mipMap).toBe(0);
    expect(txi.filter).toBe(0);
    expect(txi.numchars).toBe(3);
    expect(txi.fontheight).toBeCloseTo(0.5);
    expect(txi.baselineheight).toBeCloseTo(0.4);
    expect(txi.texturewidth).toBeCloseTo(1.0);
    expect(txi.upperleftcoords).toHaveLength(3);
    expect(txi.lowerrightcoords).toHaveLength(3);
    expect(txi.upperleftcoords[1]).toEqual({ x: 0.0625, y: 0, z: 0 });
    expect(txi.lowerrightcoords[2]).toEqual({ x: 0.1875, y: 0.125, z: 0 });
  });

  it('toBuffer and fromBuffer preserve font feature counts', () => {
    const txi = new TXI(sampleFontTXI);
    const written = TXI.fromBuffer(txi.toBuffer());

    expect(written.numchars).toBe(txi.numchars);
    expect(written.fontheight).toBeCloseTo(txi.fontheight);
    expect(written.upperleftcoords).toHaveLength(txi.upperleftcoords.length);
    expect(written.lowerrightcoords).toHaveLength(txi.lowerrightcoords.length);
  });

  it('parses vendor-sized font coordinate blocks', () => {
    const txi = new TXI(buildVendorFontTXI());

    expect(txi.numchars).toBe(256);
    expect(txi.fontheight).toBeCloseTo(0.5);
    expect(txi.upperleftcoords).toHaveLength(256);
    expect(txi.lowerrightcoords).toHaveLength(256);
    expect(txi.upperleftcoords[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(txi.lowerrightcoords[255]).toEqual({ x: 1, y: 2, z: 0 });
  });

  it('toBuffer and fromBuffer preserve vendor-sized font metadata', () => {
    const source = new TXI(buildVendorFontTXI());
    const reloaded = TXI.fromBuffer(source.toBuffer());

    expect(reloaded.numchars).toBe(source.numchars);
    expect(reloaded.filter).toBe(source.filter);
    expect(reloaded.fontheight).toBeCloseTo(source.fontheight);
    expect(reloaded.upperleftcoords).toHaveLength(source.upperleftcoords.length);
    expect(reloaded.lowerrightcoords).toHaveLength(source.lowerrightcoords.length);
  });
});
