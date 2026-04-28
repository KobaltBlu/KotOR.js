import {
  detectTwoDAFormat,
  isTwoDAFileVersion,
  readTwoDAFromBuffer,
  TwoDAObject,
  TWO_DA_FILE_TYPE,
  TWO_DA_VERSION_EXPORT,
  writeTwoDAToBuffer,
} from '@/resource/TwoDAObject';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';

const CSV_TEST_DATA = ',col1,col2,col3\n10,abc,def,ghi\n1,def,ghi,123\n2,123,,abc';
const JSON_TEST_DATA = {
  headers: ['col1', 'col2', 'col3'],
  rows: [
    { label: '10', cells: ['abc', 'def', 'ghi'] },
    { label: '1', cells: ['def', 'ghi', '123'] },
    { label: '2', cells: ['123', '', 'abc'] },
  ],
};

describe('TwoDAObject', () => {
  function makeMinimal2DA(version: 'V2.b' | 'V2.0' = TWO_DA_VERSION_EXPORT): Uint8Array {
    const bw = new BinaryWriter();
    bw.writeChars(TWO_DA_FILE_TYPE);
    bw.writeChars(version);
    bw.writeByte('\n'.charCodeAt(0));
    bw.writeChars('col1\t');
    bw.writeByte(0);
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

  it('accepts V2.0 binary 2DAs the same as V2.b', () => {
    const data = makeMinimal2DA('V2.0');
    const two = new TwoDAObject(data);
    expect(two.FileVersion).toBe('V2.0');
    expect(two.RowCount).toBe(2);
    expect(detectTwoDAFormat(data)).toBe('2da');
  });

  it('rejects wrong file type or version', () => {
    const bad = new Uint8Array(64);
    const enc = new TextEncoder();
    bad.set(enc.encode('xxxx'), 0);
    bad.set(enc.encode('V2.b'), 4);
    expect(() => new TwoDAObject(bad)).toThrow('Tried to save or load an unsupported or corrupted file.');

    const bw = new BinaryWriter();
    bw.writeChars(TWO_DA_FILE_TYPE);
    bw.writeChars('V9.9');
    bw.writeByte(10);
    expect(() => new TwoDAObject(bw.buffer)).toThrow('Tried to save or load an unsupported or corrupted file.');
  });

  it('getRow returns TwoDARow with getString/getInteger', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const row0 = two.getRow(0);
    expect(row0).toBeDefined();
    if (!row0) return;
    expect(row0.label()).toBe('0');
    expect(row0.getString('col1')).toBe('a');
    expect(row0.getInteger('col1', -1)).toBe(-1);
    const row1 = two.getRow(1);
    expect(row1).toBeDefined();
    if (!row1) return;
    expect(row1.getString('col1')).toBe('b');
  });

  it('findRow finds by label', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const row = two.findRow('1');
    expect(row).not.toBeNull();
    if (!row) return;
    expect(row.getString('col1')).toBe('b');
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
    const r0 = two.getRow(0);
    expect(r0).toBeDefined();
    expect(r0?.getString('col1')).toBe('new');
  });

  it('addRow adds row and returns index', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const idx = two.addRow('2', { col1: 'c' });
    expect(idx).toBe(2);
    expect(two.getHeight()).toBe(3);
    const f2 = two.findRow('2');
    expect(f2).toBeDefined();
    expect(f2?.getString('col1')).toBe('c');
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

  it('compare returns false on column count mismatch', () => {
    const older = new TwoDAObject();
    older.addColumn('ABC');
    older.addColumn('123');

    const newer = new TwoDAObject();
    newer.addColumn('ABC');

    const logs: string[] = [];
    expect(older.compare(newer, (message) => logs.push(message))).toBe(false);
    expect(logs).toContain('Shape mismatch');
  });

  it('compare returns false on row count mismatch', () => {
    const older = new TwoDAObject();
    older.addColumn('A');
    older.addColumn('B');
    older.addRow('0');
    older.addRow('1');

    const newer = new TwoDAObject();
    newer.addColumn('A');
    newer.addColumn('B');
    newer.addRow('0');

    const logs: string[] = [];
    expect(older.compare(newer, (message) => logs.push(message))).toBe(false);
    expect(logs).toContain('Shape mismatch');
  });

  it('compare returns false on a cell mismatch in otherwise matching tables', () => {
    const older = new TwoDAObject();
    older.addColumn('A');
    older.addColumn('B');
    older.addRow('0');
    older.addRow('1');

    const newer = new TwoDAObject();
    newer.addColumn('A');
    newer.addColumn('B');
    newer.addRow('0');
    newer.addRow('1');
    newer.getRow(0)?.updateValues({ A: 'asdf' });

    const logs: string[] = [];
    expect(older.compare(newer, (message) => logs.push(message))).toBe(false);
    expect(logs.some((message) => message.includes('Cell mismatch'))).toBe(true);
  });

  it('compare returns true for matching populated tables', () => {
    const older = new TwoDAObject();
    older.addColumn('A');
    older.addColumn('B');
    older.addRow('0');
    older.addRow('1');
    older.getRow(0)?.updateValues({ A: 'asdf' });

    const newer = new TwoDAObject();
    newer.addColumn('A');
    newer.addColumn('B');
    newer.addRow('0');
    newer.addRow('1');
    newer.getRow(0)?.updateValues({ A: 'asdf' });

    const logs: string[] = [];
    expect(older.compare(newer, (message) => logs.push(message))).toBe(true);
    expect(logs).toHaveLength(0);
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
    const row0 = two.getRow(0);
    expect(row0).toBeDefined();
    if (!row0) return;
    const idx = two.copyRow(row0, '2', { col1: 'copy' });
    expect(idx).toBe(2);
    const row2 = two.getRow(2);
    expect(row2).toBeDefined();
    if (!row2) return;
    expect(row2.getString('col1')).toBe('copy');
    expect(two.rowIndex(row0)).toBe(0);
    expect(two.rowIndex(row2)).toBe(2);
  });

  it('filterRows', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const filtered = two.filterRows((row) => row.getString('col1') === 'b');
    expect(filtered.getHeight()).toBe(1);
    const fr0 = filtered.getRow(0);
    expect(fr0).toBeDefined();
    expect(fr0?.getString('col1')).toBe('b');
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
    const obj = {
      headers: ['col1'],
      rows: [
        { label: '0', cells: ['a'] },
        { label: '1', cells: ['b'] },
      ],
    };
    const two = TwoDAObject.fromJSON(obj);
    expect(two.getHeight()).toBe(2);
    expect(two.getLabels()).toEqual(['0', '1']);
    const out = two.toJSON();
    expect(out.headers).toEqual(['col1']);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0].label).toBe('0');
    expect(out.rows[0].cells).toEqual(['a']);
  });

  it('parses vendor-style CSV table content with multiple columns and blank cells', () => {
    const two = TwoDAObject.fromCSV(CSV_TEST_DATA);

    expect(two.getLabels()).toEqual(['10', '1', '2']);
    expect(two.getCell(0, 'col1')).toBe('abc');
    expect(two.getCell(0, 'col2')).toBe('def');
    expect(two.getCell(0, 'col3')).toBe('ghi');
    expect(two.getCell(1, 'col1')).toBe('def');
    expect(two.getCell(1, 'col2')).toBe('ghi');
    expect(two.getCell(1, 'col3')).toBe('123');
    expect(two.getCell(2, 'col1')).toBe('123');
    expect(two.getCell(2, 'col2')).toBe('');
    expect(two.getCell(2, 'col3')).toBe('abc');
  });

  it('round-trips vendor-style csv/json data through current serializers', () => {
    const fromCsv = TwoDAObject.fromCSV(CSV_TEST_DATA);
    expect(TwoDAObject.fromCSV(fromCsv.toCSV().trimEnd()).toJSON()).toEqual(fromCsv.toJSON());

    const fromJson = TwoDAObject.fromJSON(JSON_TEST_DATA);
    expect(TwoDAObject.fromJSON(fromJson.toJSON()).toJSON()).toEqual(JSON_TEST_DATA);
  });

  it('round-trips metadata through XML, YAML, and TOML helpers', () => {
    const source = TwoDAObject.fromJSON(JSON_TEST_DATA);

    expect(TwoDAObject.fromXML(source.toXML()).toJSON()).toEqual(source.toJSON());
    expect(TwoDAObject.fromYAML(source.toYAML()).toJSON()).toEqual(source.toJSON());
    expect(TwoDAObject.fromTOML(source.toTOML()).toJSON()).toEqual(source.toJSON());
  });

  it('addColumn backfills existing rows with placeholder values', () => {
    const two = TwoDAObject.fromCSV(CSV_TEST_DATA);

    two.addColumn('added');

    expect(two.getColumn('added')).toEqual(['****', '****', '****']);
    expect(two.ColumnCount).toBe(4);
    expect(two.CellCount).toBe(12);
  });

  it('getByID and getRowByColumnAndValue resolve rows through legacy helpers', () => {
    const two = TwoDAObject.fromCSV(CSV_TEST_DATA);

    expect(two.getByID(10)?.col1).toBe('abc');
    expect(two.getByID(999)).toBeUndefined();
    expect(two.getRowByColumnAndValue('col3', '123')?.__rowlabel).toBe('1');
    expect(two.getRowByColumnAndValue('col2', 'missing')).toBeUndefined();
  });

  it('cellParser and normalizeValue preserve placeholder semantics', () => {
    expect(TwoDAObject.cellParser('****')).toBeNull();
    expect(TwoDAObject.cellParser('abc')).toBe('abc');

    expect(TwoDAObject.normalizeValue('0x10', 'number', 0)).toBe(16);
    expect(TwoDAObject.normalizeValue('12.5', 'number', 0)).toBe(12.5);
    expect(TwoDAObject.normalizeValue('****', 'number', 7)).toBe(7);
    expect(TwoDAObject.normalizeValue('****', 'string', 'fallback')).toBe('fallback');
    expect(TwoDAObject.normalizeValue('abc', 'string', '')).toBe('abc');
    expect(TwoDAObject.normalizeValue('****', 'boolean', true)).toBe(true);
    expect(TwoDAObject.normalizeValue(0, 'boolean', false)).toBe(false);
  });

  it('detectTwoDAFormat returns 2da for binary header', () => {
    const buf = makeMinimal2DA();
    expect(detectTwoDAFormat(buf)).toBe('2da');
  });

  it('isTwoDAFileVersion matches supported version strings only', () => {
    expect(isTwoDAFileVersion('V2.b')).toBe(true);
    expect(isTwoDAFileVersion('V2.0')).toBe(true);
    expect(isTwoDAFileVersion('V3.0')).toBe(false);
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
    const jr0 = two.getRow(0);
    expect(jr0).toBeDefined();
    expect(jr0?.getString('c')).toBe('v');
  });

  it('fromBuffer with explicit format', () => {
    const buf = makeMinimal2DA();
    const two = TwoDAObject.fromBuffer(buf, '2da');
    expect(two.RowCount).toBe(2);
  });

  it('TwoDARow hasString and updateValues', () => {
    const data = makeMinimal2DA();
    const two = new TwoDAObject(data);
    const row = two.getRow(0);
    expect(row).toBeDefined();
    if (!row) return;
    expect(row.hasString('col1')).toBe(true);
    expect(row.hasString('__rowlabel')).toBe(true);
    expect(row.hasString('nonexistent')).toBe(false);
    row.updateValues({ col1: 'updated' });
    expect(row.getString('col1')).toBe('updated');
    expect(two.getRow(0)?.getString('col1')).toBe('updated');
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
    const parsed = JSON.parse(new TextDecoder().decode(json)) as { headers: string[] };
    expect(parsed.headers).toContain('col1');
  });

  it('readTwoDAFromBuffer throws on unsupported data formats', () => {
    expect(() => readTwoDAFromBuffer(new TextEncoder().encode('not a table'))).toThrow(
      'Unsupported 2DA buffer format.'
    );
  });
});
