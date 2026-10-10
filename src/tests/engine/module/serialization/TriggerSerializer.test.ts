/**
 * TriggerSerializer round-trip of observed GIT/UTT fields.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameObjectManager: {
      RegisterObject: jest.fn(),
    },
    FactionManager: {
      factions: new Map(),
    },
    SWRuleSet: {
      portraits: [],
      traps: [],
    },
    TLKManager: {
      GetStringById: () => ({ Value: '' }),
    },
  },
}));

jest.mock('@engine/nwscript/NWScript', () => ({
  NWScript: {},
}));

import { Trigger } from '@engine/module/Trigger';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { ScriptHook } from '@core/enums/module/ScriptHook';
import { triggerSerializer } from '@engine/module/serialization/TriggerSerializer';

describe('TriggerSerializer', () => {
  function makeTemplate(): GFFObject {
    const gff = new GFFObject();
    gff.RootNode.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x2002);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Commandable')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Cursor')).setValue(3);
    gff.RootNode.addField(new GFFField(GFFDataType.DWORD, 'Faction')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('trig_test');
    gff.RootNode.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('trig_test');
    gff.RootNode.addField(new GFFField(GFFDataType.INT, 'Type')).setValue(0);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XPosition')).setValue(1.5);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YPosition')).setValue(2.5);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).setValue(0.25);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XOrientation')).setValue(0);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YOrientation')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZOrientation')).setValue(0);
    gff.RootNode.addField(new GFFField(GFFDataType.RESREF, ScriptHook.TriggerOnEnter)).setValue('tr_enter');
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectDC')).setValue(12);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'TrapDisarmDC')).setValue(18);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'TrapFlag')).setValue(1);

    const geometry = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'Geometry'));
    const vert = new GFFStruct(3);
    vert.addField(new GFFField(GFFDataType.FLOAT, 'PointX')).setValue(0);
    vert.addField(new GFFField(GFFDataType.FLOAT, 'PointY')).setValue(1);
    vert.addField(new GFFField(GFFDataType.FLOAT, 'PointZ')).setValue(2);
    geometry.addChildStruct(vert);

    return gff;
  }

  it('deserializes PointXYZ geometry and script resrefs', () => {
    const trig = new Trigger(makeTemplate());
    triggerSerializer.deserialize(trig, trig.template);

    expect(trig.id).toBe(0x2002);
    expect(trig.tag).toBe('trig_test');
    expect(trig.vertices.length).toBe(1);
    expect(trig.vertices[0].x).toBeCloseTo(0, 5);
    expect(trig.vertices[0].y).toBeCloseTo(1, 5);
    expect(trig.vertices[0].z).toBeCloseTo(2, 5);
    expect(trig.scriptResRefs[ScriptHook.TriggerOnEnter]).toBe('tr_enter');
    expect(trig.trapDetectDC).toBe(12);
    expect(trig.position.x).toBeCloseTo(1.5, 5);
  });

  it('serializes without TrapDetectDC / TrapDisarmDC / TrapFlag', () => {
    const trig = new Trigger(makeTemplate());
    triggerSerializer.deserialize(trig, trig.template);
    trig.tag = 'trig_mutated';
    trig.vertices[0].set(9, 8, 7);
    trig.scripts[ScriptHook.TriggerOnEnter] = { name: 'tr_enter2' } as any;

    const out = triggerSerializer.serialize(trig);
    expect(out.FileType).toBe('UTT ');
    expect(out.RootNode.type).toBe(1);
    expect(out.RootNode.getFieldByLabel('Tag').getValue()).toBe('trig_mutated');
    expect(out.RootNode.hasField('TrapDetectDC')).toBe(false);
    expect(out.RootNode.hasField('TrapDisarmDC')).toBe(false);
    expect(out.RootNode.hasField('TrapFlag')).toBe(false);

    const verts = out.RootNode.getFieldByLabel('Geometry').getChildStructs();
    expect(verts).toHaveLength(1);
    expect(verts[0].getFieldByLabel('PointX').getValue()).toBeCloseTo(9, 5);
    expect(verts[0].getFieldByLabel('PointY').getValue()).toBeCloseTo(8, 5);
    expect(verts[0].getFieldByLabel('PointZ').getValue()).toBeCloseTo(7, 5);
    expect(out.RootNode.getFieldByLabel(ScriptHook.TriggerOnEnter).getValue()).toBe('tr_enter2');
  });
});
