/**
 * DoorSerializer round-trip of observed Bearing transform fields.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameObjectManager: { RegisterObject: jest.fn() },
    FactionManager: { factions: new Map() },
    AppearanceManager: { GetDoorAppearanceById: () => undefined },
    SWRuleSet: { portraits: [] },
  },
}));

jest.mock('@engine/nwscript/NWScript', () => ({ NWScript: {} }));

import { Door } from '@engine/module/Door';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFField } from '@core/resource/GFFField';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { doorSerializer } from '@engine/module/serialization/DoorSerializer';

describe('DoorSerializer', () => {
  function makeTemplate(): GFFObject {
    const gff = new GFFObject();
    gff.RootNode.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x3003);
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('door_test');
    gff.RootNode.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('door_test');
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'X')).setValue(4);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Y')).setValue(5);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Z')).setValue(6);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Bearing')).setValue(1.25);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Locked')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'OpenLockDC')).setValue(22);
    return gff;
  }

  it('deserializes Bearing transform fields', () => {
    const door = new Door(makeTemplate());
    doorSerializer.deserialize(door, door.template);
    expect(door.id).toBe(0x3003);
    expect(door.tag).toBe('door_test');
    expect(door.position.x).toBeCloseTo(4, 5);
    expect(door.position.y).toBeCloseTo(5, 5);
    expect(door.position.z).toBeCloseTo(6, 5);
    expect(door.bearing).toBeCloseTo(1.25, 5);
    expect(door.locked).toBeTruthy();
  });

  it('round-trips after runtime mutation without reading template', () => {
    const door = new Door(makeTemplate());
    doorSerializer.deserialize(door, door.template);
    door.tag = 'door_mut';
    door.position.set(1, 2, 3);
    door.bearing = 0.5;
    door.locked = 0;

    const out = doorSerializer.serialize(door);
    expect(out.FileType).toBe('UTD ');
    expect(out.RootNode.getFieldByLabel('Tag').getValue()).toBe('door_mut');
    expect(out.RootNode.getFieldByLabel('X').getValue()).toBeCloseTo(1, 5);
    expect(out.RootNode.getFieldByLabel('Y').getValue()).toBeCloseTo(2, 5);
    expect(out.RootNode.getFieldByLabel('Z').getValue()).toBeCloseTo(3, 5);
    expect(out.RootNode.getFieldByLabel('Bearing').getValue()).toBeCloseTo(0.5, 5);
    expect(out.RootNode.getFieldByLabel('Locked').getValue()).toBe(0);
  });
});
