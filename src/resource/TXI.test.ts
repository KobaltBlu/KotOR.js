import { TXI } from '@/resource/TXI';

describe('TXI', () => {
  it('parses from string', () => {
    const txi = new TXI('compresstexture 0\nmipmap 1');
    expect(txi.isCompressed).toBe(false);
    expect(txi.mipMap).toBe(1);
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
});
