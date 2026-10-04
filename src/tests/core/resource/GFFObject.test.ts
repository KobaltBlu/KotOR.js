/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFStruct } from '@core/resource/GFFStruct';

describe('GFFObject round-trip', () => {
  it('exports and reloads a tiny UTC-like struct', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTC ';
    gff.FileVersion = 'V3.2';
    gff.RootNode = new GFFStruct(-1);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Race', 6));
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag', 'p_bastila'));
    gff.RootNode.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef', 'p_bastila'));
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XPosition', 1.5));

    const buf = gff.getExportBuffer();
    expect(buf.length).toBeGreaterThanOrEqual(GFFObject.HEADER_SIZE);

    const loaded = new GFFObject(buf);
    expect(loaded.FileType).toBe('UTC ');
    expect(loaded.FileVersion).toBe('V3.2');
    expect(loaded.getFieldByLabel('Race')?.getValue()).toBe(6);
    expect(loaded.getFieldByLabel('Tag')?.getValue()).toBe('p_bastila');
    expect(loaded.getFieldByLabel('TemplateResRef')?.getValue()).toBe('p_bastila');
    expect(loaded.getFieldByLabel('XPosition')?.getValue()).toBeCloseTo(1.5, 5);
  });

  it('leaves RootNode empty when buffer is shorter than the header', () => {
    const gff = new GFFObject(new Uint8Array(8));
    expect(gff.RootNode).toBeTruthy();
    expect(gff.RootNode.fields.length).toBe(0);
  });
});
