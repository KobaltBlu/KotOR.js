import { BIFObject } from '@/resource/BIFObject';

describe('BIFObject', () => {
  it('readFromMemory parses minimal BIF buffer and getResourceBuffer returns slice', async () => {
    const bifBuf = new Uint8Array(72);
    const v = new DataView(bifBuf.buffer);
    new TextEncoder().encodeInto('BIFF', new Uint8Array(bifBuf.buffer, 0, 4));
    new TextEncoder().encodeInto('V1  ', new Uint8Array(bifBuf.buffer, 4, 4));
    v.setUint32(8, 1, true);   // variableResourceCount
    v.setUint32(12, 0, true);  // fixedResourceCount
    v.setUint32(16, 20, true); // variableTableOffset
    v.setUint32(20, 1, true);  // Id (first entry, at variable table start)
    v.setUint32(24, 64, true); // offset (past header+table)
    v.setUint32(28, 4, true);  // size
    v.setUint32(32, 0x0f, true); // resType (e.g. 2da)
    bifBuf[64] = 0x61;
    bifBuf[65] = 0x62;
    bifBuf[66] = 0x63;
    bifBuf[67] = 0x64;

    const bif = new BIFObject(bifBuf);
    bif.readFromMemory();
    expect(bif.fileType).toBe('BIFF');
    expect(bif.variableResourceCount).toBe(1);
    expect(bif.resources.length).toBe(1);
    expect(bif.resources[0].Id).toBe(1);
    expect(bif.resources[0].offset).toBe(64);
    expect(bif.resources[0].size).toBe(4);
    expect(bif.resources[0].resType).toBe(0x0f);

    const chunk = await bif.getResourceBuffer(bif.resources[0]);
    expect(chunk.length).toBe(4);
    expect(chunk[0]).toBe(0x61);
    expect(chunk[1]).toBe(0x62);
    expect(chunk[2]).toBe(0x63);
    expect(chunk[3]).toBe(0x64);
  });

  it('readFromMemory throws when buffer too short for header', () => {
    const bif = new BIFObject(new Uint8Array(10));
    expect(() => bif.readFromMemory()).toThrow('BIF buffer too short for header');
  });

  it('readFromMemory throws when not in memory', () => {
    const bif = new BIFObject('/some/path.bif');
    expect(() => bif.readFromMemory()).toThrow('in-memory buffer');
  });

  it('load() populates from buffer when in memory', async () => {
    const bifBuf = new Uint8Array(20);
    new TextEncoder().encodeInto('BIFF', new Uint8Array(bifBuf.buffer, 0, 4));
    new TextEncoder().encodeInto('V1  ', new Uint8Array(bifBuf.buffer, 4, 4));
    const v = new DataView(bifBuf.buffer);
    v.setUint32(8, 0, true);
    v.setUint32(12, 0, true);
    v.setUint32(16, 20, true);

    const bif = new BIFObject(bifBuf);
    await bif.load();
    expect(bif.fileType).toBe('BIFF');
    expect(bif.resources.length).toBe(0);
  });
});
