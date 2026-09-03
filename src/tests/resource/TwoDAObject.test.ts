/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { TwoDAObject } from '@/resource/TwoDAObject';

describe('TwoDAObject', () => {
  it('round-trips a minimal table via CSV export buffer', () => {
    const a = TwoDAObject.fromCSV('__rowlabel,label\n0,foo\n1,bar\n');
    expect(a.columns).toEqual(['__rowlabel', 'label']);
    expect(a.RowCount).toBe(2);
    expect(a.rows[0].label).toBe('foo');

    const buf = a.toExportBuffer();
    const b = new TwoDAObject(buf);
    expect(b.FileType).toBe('2DA ');
    expect(b.FileVersion).toBe('V2.b');
    expect(b.columns).toEqual(['__rowlabel', 'label']);
    expect(b.RowCount).toBe(2);
    expect(b.getRowByIndex(0).label).toBe('foo');
    expect(b.getByID(1).label).toBe('bar');
  });

  it('treats **** cells as null via cellParser', () => {
    expect(TwoDAObject.cellParser('****')).toBeNull();
    expect(TwoDAObject.cellParser('keep')).toBe('keep');
  });
});
