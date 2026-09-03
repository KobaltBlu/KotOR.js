/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.config.js src/tests/resource/GFFObject.toJSON.test.ts --coverage=false
 */
import { describe, expect, it } from '@jest/globals';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { CExoLocString } from '@/resource/CExoLocString';
import { CExoLocSubString } from '@/resource/CExoLocSubString';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';

describe('GFFObject.toJSON (OpenKotOR schema)', () => {
  it('exports root __data_type and typed fields', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTC ';
    gff.RootNode = new GFFStruct(-1);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Race', 6));
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag', 'p_bastila'));
    gff.RootNode.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef', 'p_bastila'));
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XPosition', 1.5));
    gff.RootNode.addField(new GFFField(GFFDataType.VECTOR, 'Position', { x: 1, y: 2, z: 3 }));
    gff.RootNode.addField(new GFFField(GFFDataType.ORIENTATION, 'Orientation', { x: 0, y: 0, z: 0, w: 1 }));

    const loc = new CExoLocString(-1);
    loc.addSubString(new CExoLocSubString(0, 'Bastila'));
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName', loc));

    const list = new GFFField(GFFDataType.LIST, 'Equip_ItemList');
    const item = new GFFStruct(0);
    item.addField(new GFFField(GFFDataType.RESREF, 'EquippedRes', 'g1_w_lghtsbr01'));
    list.addChildStruct(item);
    gff.RootNode.addField(list);

    const nested = new GFFField(GFFDataType.STRUCT, 'ClassList');
    const cls = new GFFStruct(2);
    cls.addField(new GFFField(GFFDataType.INT, 'Class', 3));
    nested.addChildStruct(cls);
    gff.RootNode.addField(nested);

    const voidField = new GFFField(GFFDataType.VOID, 'ScriptVar');
    voidField.setData(new Uint8Array([1, 2, 3, 4]));
    gff.RootNode.addField(voidField);

    const json = gff.toJSON();
    expect(json.__data_type).toBe('UTC');
    expect(json.__struct_id).toBeUndefined();
    expect(json.Race).toEqual({ type: 'byte', value: 6 });
    expect(json.Tag).toEqual({ type: 'cexostring', value: 'p_bastila' });
    expect(json.TemplateResRef).toEqual({ type: 'resref', value: 'p_bastila' });
    expect(json.XPosition).toEqual({ type: 'float', value: 1.5 });
    expect(json.Position).toEqual({ type: 'vector', value: { x: 1, y: 2, z: 3 } });
    expect(json.Orientation).toEqual({ type: 'orientation', value: { x: 0, y: 0, z: 0, w: 1 } });
    expect(json.FirstName).toEqual({
      type: 'cexolocstring',
      value: { '0': 'Bastila' },
    });
    expect(json.Equip_ItemList).toEqual({
      type: 'list',
      value: [
        {
          __struct_id: 0,
          EquippedRes: { type: 'resref', value: 'g1_w_lghtsbr01' },
        },
      ],
    });
    expect(json.ClassList).toEqual({
      type: 'struct',
      value: {
        __struct_id: 2,
        Class: { type: 'int', value: 3 },
      },
    });
    expect(json.ScriptVar).toEqual({ type: 'void', value64: 'AQIDBA==' });

    const text = gff.toJSONString();
    expect(text.startsWith('{')).toBe(true);
    expect(JSON.parse(text).__data_type).toBe('UTC');
  });
});
