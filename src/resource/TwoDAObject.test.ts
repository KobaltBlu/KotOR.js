import { BinaryWriter } from '../utility/binary/BinaryWriter';

import { detectTwoDAFormat, readTwoDAFromBuffer, TwoDAObject, writeTwoDAToBuffer } from './TwoDAObject';

describe('TwoDAObject', () => {
  function makeMinimal2DA(): Uint8Array {
    const bw = new BinaryWriter();
    bw.writeChars('2DA ');
    bw.writeChars('V2.b');
    bw.writeByte(0x0a);
    bw.writeChars('col1\t');
    bw.writeByte(0x00);
    bw.writeUInt32(2);
    bw.writeChars('0\t');
    bw.writeChars('1\t');
    bw.writeUInt16(0);
    bw.writeUInt16(2);
    bw.writeUInt16(4);
    bw.writeChars('a');
    bw.writeByte(0);
    bw.writeChars('b');
    bw.writeByte(0);
    return bw.buffer;
  }

  it('read2DA populates rows and columns', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    expect(two.columns).toContain('__rowlabel');
    expect(two.columns).toContain('col1');
    expect(two.RowCount).toBe(2);
    expect(two.getHeight()).toBe(2);
    expect(two.getWidth()).toBe(1);
  });

  it('getRow returns TwoDARow with getString/getInteger', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const row0 = two.getRow(0);
    expect(row0).toBeDefined();
    expect(row0!.label()).toBe('0');
    expect(row0!.getString('col1')).toBe('a');
    expect(row0!.getInteger('col1', -1)).toBe(-1);
    const row1 = two.getRow(1);
    expect(row1!.getString('col1')).toBe('b');
  });

  it('findRow finds by label', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const row = two.findRow('1');
    expect(row).not.toBeNull();
    expect(row!.getString('col1')).toBe('b');
    expect(two.findRow('99')).toBeNull();
  });

  it('getCellSafe returns default for missing', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    expect(two.getCellSafe(0, 'col1', 'x')).toBe('a');
    expect(two.getCellSafe(5, 'col1', 'def')).toBe('def');
  });

  it('setCell updates value', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    two.setCell(0, 'col1', 'new');
    expect(two.getRow(0)!.getString('col1')).toBe('new');
  });

  it('addRow adds row and returns index', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const idx = two.addRow('2', { col1: 'c' });
    expect(idx).toBe(2);
    expect(two.getHeight()).toBe(3);
    expect(two.findRow('2')!.getString('col1')).toBe('c');
  });

  it('getColumn returns column values', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    expect(two.getColumn('col1')).toEqual(['a', 'b']);
  });

  it('getColumns returns all columns as record', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const cols = two.getColumns();
    expect(cols).toHaveProperty('col1');
    expect(cols.col1).toEqual(['a', 'b']);
  });

  it('compare returns true for identical 2da', () => {
    const data = makeMinimal2DA();
    const a = new TwoDAObject(data);
    const b = new TwoDAObject(data);
    const logs: string[] = [];
    expect(a.compare(b, (m) => logs.push(m))).toBe(true);
    expect(logs).toHaveLength(0);
  });

  it('compare returns false and logs on difference', () => {
    const data = makeMinimal2DA();
    const a = new TwoDAObject(data);
    const b = new TwoDAObject(data);
    b.setCell(0, 'col1', 'x');
    const logs: string[] = [];
    expect(a.compare(b, (m) => logs.push(m))).toBe(false);
    expect(logs.some((m) => m.includes('Cell mismatch'))).toBe(true);
  });

  it('toExportBuffer round-trip', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const out = two.toExportBuffer();
    expect(out.length).toBeGreaterThan(0);
    const two2 = new TwoDAObject(out);
    expect(two2.RowCount).toBe(two.RowCount);
    expect(two2.getColumn('col1')).toEqual(two.getColumn('col1'));
    expect(two2.getLabels()).toEqual(['0', '1']);
  });

  it('getLabels and setLabel', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    expect(two.getLabels()).toEqual(['0', '1']);
    expect(two.getRowLabel(0)).toBe('0');
    two.setLabel(1, 'one');
    expect(two.getRowLabel(1)).toBe('one');
    expect(two.findRow('one')).not.toBeNull();
  });

  it('copyRow and rowIndex', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const row0 = two.getRow(0)!;
    const idx = two.copyRow(row0, '2', { col1: 'copy' });
    expect(idx).toBe(2);
    expect(two.getRow(2)!.getString('col1')).toBe('copy');
    expect(two.rowIndex(row0)).toBe(0);
    expect(two.rowIndex(two.getRow(2)!)).toBe(2);
  });

  it('filterRows', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const filtered = two.filterRows(row => row.getString('col1') === 'b');
    expect(filtered.getHeight()).toBe(1);
    expect(filtered.getRow(0)!.getString('col1')).toBe('b');
  });

  it('columnMax and labelMax', () => {
    const two = new TwoDAObject();
    two.addColumn('id');
    two.addRow('0', { id: '10' });
    two.addRow('1', { id: '5' });
    expect(two.columnMax('id')).toBe(11);
    expect(two.labelMax()).toBe(2);
  });

  it('updateCells batch update', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const updates = new Map<[number, string], string>() as Map<[number, string], string | number>;
    updates.set([0, 'col1'], 'updated');
    two.updateCells(updates);
    expect(two.getCell(0, 'col1')).toBe('updated');
  });

  it('fromCSV and toCSV round-trip', () => {
    const csvWithHeaders = ',col1\n0,a\n1,b';
    const two2 = TwoDAObject.fromCSV(csvWithHeaders);
    expect(two2.getHeight()).toBe(2);
    expect(two2.getLabels()).toEqual(['0', '1']);
    expect(two2.getColumn('col1')).toEqual(['a', 'b']);
    const back = two2.toCSV();
    expect(back).toContain('col1');
    expect(back).toContain('0');
    expect(back).toContain('a');
  });

  it('fromJSON and toJSON round-trip', () => {
    const obj = { headers: ['col1'], rows: [{ label: '0', cells: ['a'] }, { label: '1', cells: ['b'] }] };
    const two = TwoDAObject.fromJSON(obj);
    expect(two.getHeight()).toBe(2);
    expect(two.getLabels()).toEqual(['0', '1']);
    const out = two.toJSON();
    expect(out.headers).toEqual(['col1']);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0].label).toBe('0');
    expect(out.rows[0].cells).toEqual(['a']);
  });

  it('detectTwoDAFormat returns 2da for binary header', () => {
    const buf = makeMinimal2DA();
    expect(detectTwoDAFormat(buf)).toBe('2da');
  });

  it('detectTwoDAFormat returns csv when comma in first 256 bytes', () => {
    const buf = new TextEncoder().encode(',h1\n0,v1');
    expect(detectTwoDAFormat(buf)).toBe('csv');
  });

  it('detectTwoDAFormat returns json when brace in first 256 bytes', () => {
    const buf = new TextEncoder().encode('{"headers":["x"],"rows":[]}');
    expect(detectTwoDAFormat(buf)).toBe('json');
  });

  it('detectTwoDAFormat returns invalid for short or unknown', () => {
    expect(detectTwoDAFormat(new Uint8Array(2))).toBe('invalid');
    expect(detectTwoDAFormat(new Uint8Array([0, 0, 0, 0]))).toBe('invalid');
  });

  it('fromBuffer auto-detects binary 2da', () => {
    const buf = makeMinimal2DA();
    const two = TwoDAObject.fromBuffer(buf);
    expect(two.RowCount).toBe(2);
    expect(two.getColumn('col1')).toEqual(['a', 'b']);
  });

  it('fromBuffer auto-detects CSV', () => {
    const buf = new TextEncoder().encode(',col1\n0,a\n1,b');
    const two = TwoDAObject.fromBuffer(buf);
    expect(two.getHeight()).toBe(2);
    expect(two.getColumn('col1')).toEqual(['a', 'b']);
  });

  it('fromBuffer auto-detects JSON', () => {
    const buf = new TextEncoder().encode(JSON.stringify({ headers: ['c'], rows: [{ label: '0', cells: ['v'] }] }));
    const two = TwoDAObject.fromBuffer(buf);
    expect(two.getHeight()).toBe(1);
    expect(two.getRow(0)!.getString('c')).toBe('v');
  });

  it('fromBuffer with explicit format', () => {
    const buf = makeMinimal2DA();
    const two = TwoDAObject.fromBuffer(buf, '2da');
    expect(two.RowCount).toBe(2);
  });

  it('TwoDARow hasString and updateValues', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const row = two.getRow(0)!;
    expect(row.hasString('col1')).toBe(true);
    expect(row.hasString('__rowlabel')).toBe(true);
    expect(row.hasString('nonexistent')).toBe(false);
    row.updateValues({ col1: 'updated' });
    expect(row.getString('col1')).toBe('updated');
    expect(two.getRow(0)!.getString('col1')).toBe('updated');
  });

  it('readTwoDAFromBuffer and writeTwoDAToBuffer round-trip csv/json', () => {
    const data = makeMinimal2DA();
    const two = readTwoDAFromBuffer(data);
    expect(two.RowCount).toBe(2);
    const csvBuf = writeTwoDAToBuffer(two, 'csv');
    const two2 = readTwoDAFromBuffer(csvBuf, 'csv');
    expect(two2.getHeight()).toBe(two.getHeight());
    expect(two2.getColumn('col1')).toEqual(two.getColumn('col1'));
    const jsonBuf = writeTwoDAToBuffer(two, 'json');
    const two3 = readTwoDAFromBuffer(jsonBuf, 'json');
    expect(two3.getHeight()).toBe(two.getHeight());
    expect(two3.getColumn('col1')).toEqual(two.getColumn('col1'));
  });

  it('toBuffer(format) returns csv/json bytes', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const csv = two.toBuffer('csv');
    expect(new TextDecoder().decode(csv)).toContain('col1');
    const json = two.toBuffer('json');
    expect(JSON.parse(new TextDecoder().decode(json)).headers).toContain('col1');
  });
});
