/**
 * SoundSerializer round-trip; save omits TemplateResRef / Priority / Elevation.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameObjectManager: { RegisterObject: jest.fn() },
  },
}));

jest.mock('@engine/nwscript/NWScript', () => ({ NWScript: {} }));

import { Sound } from '@engine/module/Sound';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFField } from '@core/resource/GFFField';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { soundSerializer } from '@engine/module/serialization/SoundSerializer';

describe('SoundSerializer', () => {
  function makeTemplate(): GFFObject {
    const gff = new GFFObject();
    gff.RootNode.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x4004);
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('snd_test');
    gff.RootNode.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('snd_test');
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Active')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Positional')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Volume')).setValue(64);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XPosition')).setValue(8);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YPosition')).setValue(9);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).setValue(10);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Elevation')).setValue(2);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Priority')).setValue(5);
    return gff;
  }

  it('deserializes positional sound fields', () => {
    const sound = new Sound(makeTemplate());
    soundSerializer.deserialize(sound, sound.template);
    expect(sound.id).toBe(0x4004);
    expect(sound.tag).toBe('snd_test');
    expect(sound.active).toBe(true);
    expect(sound.positional).toBe(true);
    expect(sound.volume).toBe(64);
    expect(sound.position.x).toBeCloseTo(8, 5);
  });

  it('serializes save field set without TemplateResRef / Priority / Elevation', () => {
    const sound = new Sound(makeTemplate());
    soundSerializer.deserialize(sound, sound.template);
    sound.tag = 'snd_mut';
    sound.volume = 100;

    const out = soundSerializer.serialize(sound);
    expect(out.FileType).toBe('UTS ');
    expect(out.RootNode.getFieldByLabel('Tag').getValue()).toBe('snd_mut');
    expect(out.RootNode.getFieldByLabel('Volume').getValue()).toBe(100);
    expect(out.RootNode.hasField('TemplateResRef')).toBe(false);
    expect(out.RootNode.hasField('Priority')).toBe(false);
    expect(out.RootNode.hasField('Elevation')).toBe(false);
  });
});
