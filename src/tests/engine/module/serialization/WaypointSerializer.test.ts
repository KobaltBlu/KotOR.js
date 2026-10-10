/**
 * WaypointSerializer round-trip of observed GIT/UTW fields.
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
  },
}));

jest.mock('@engine/nwscript/NWScript', () => ({
  NWScript: {},
}));

import { Waypoint } from '@engine/module/Waypoint';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFField } from '@core/resource/GFFField';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { CExoLocString } from '@core/resource/CExoLocString';
import { waypointSerializer } from '@engine/module/serialization/WaypointSerializer';

describe('WaypointSerializer', () => {
  function makeTemplate(): GFFObject {
    const gff = new GFFObject();
    gff.RootNode.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x1001);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Commandable')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'HasMapNote')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'MapNoteEnabled')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('wp_test');
    gff.RootNode.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('wp_test');
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XPosition')).setValue(10.5);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YPosition')).setValue(-2.25);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).setValue(1.0);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XOrientation')).setValue(0.0);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YOrientation')).setValue(1.0);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZOrientation')).setValue(0.0);
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName')).setValue(
      new CExoLocString(0),
    );
    return gff;
  }

  it('deserializes observed fields into a Waypoint', () => {
    const wp = new Waypoint(makeTemplate());
    waypointSerializer.deserialize(wp, wp.template);

    expect(wp.id).toBe(0x1001);
    expect(wp.tag).toBe('wp_test');
    expect(wp.templateResRef).toBe('wp_test');
    expect(wp.hasMapNote).toBe(true);
    expect(wp.mapNoteEnabled).toBe(true);
    expect(wp.position.x).toBeCloseTo(10.5, 5);
    expect(wp.position.y).toBeCloseTo(-2.25, 5);
    expect(wp.position.z).toBeCloseTo(1.0, 5);
    expect(wp.yOrientation).toBeCloseTo(1.0, 5);
  });

  it('round-trips after runtime mutation', () => {
    const wp = new Waypoint(makeTemplate());
    waypointSerializer.deserialize(wp, wp.template);

    wp.tag = 'wp_mutated';
    wp.position.set(3, 4, 5);
    wp.xOrientation = 1;
    wp.yOrientation = 0;
    wp.hasMapNote = false;

    const out = waypointSerializer.serialize(wp);
    expect(out.RootNode.getFieldByLabel('Tag').getValue()).toBe('wp_mutated');
    expect(out.RootNode.getFieldByLabel('XPosition').getValue()).toBeCloseTo(3, 5);
    expect(out.RootNode.getFieldByLabel('YPosition').getValue()).toBeCloseTo(4, 5);
    expect(out.RootNode.getFieldByLabel('ZPosition').getValue()).toBeCloseTo(5, 5);
    expect(out.RootNode.getFieldByLabel('XOrientation').getValue()).toBeCloseTo(1, 5);
    expect(out.RootNode.getFieldByLabel('YOrientation').getValue()).toBeCloseTo(0, 5);
    expect(out.RootNode.hasField('MapNote')).toBe(false);
    expect(out.RootNode.type).toBe(5);
  });
});
