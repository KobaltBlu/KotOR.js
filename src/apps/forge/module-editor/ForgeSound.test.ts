import { describe, expect, it, jest } from '@jest/globals';

import { CExoLocString } from '@/resource/CExoLocString';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { ForgeSound } from '@/apps/forge/module-editor/ForgeSound';

jest.mock('@/apps/forge/UI3DRenderer', () => ({
  GroupType: {
    Sound: 'Sound',
  },
  UI3DRenderer: class UI3DRenderer {},
}));

jest.mock('@/apps/forge/states/tabs/TabState', () => ({
  TabState: class TabState {},
}));

jest.mock('@/apps/forge/KotOR', () => {
  const { CExoLocString } = require('@/resource/CExoLocString');
  const { GFFDataType } = require('@/enums/resource/GFFDataType');
  const { GFFField } = require('@/resource/GFFField');
  const { GFFObject } = require('@/resource/GFFObject');
  const { GFFStruct } = require('@/resource/GFFStruct');

  return {
    CExoLocString,
    GFFDataType,
    GFFField,
    GFFObject,
    GFFStruct,
    ResourceTypes: {
      NA: 0,
      uts: 2042,
    },
    ResourceLoader: {
      loadResource: jest.fn(),
    },
  };
});

function buildSoundGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTS ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('3Csounds');
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName')).setCExoLocString(new CExoLocString(128551));
  root.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('3csounds');
  root.addField(new GFFField(GFFDataType.BYTE, 'Active')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Continuous')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Looping')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Positional')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'RandomPosition')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Random')).setValue(1);
  root.addField(new GFFField(GFFDataType.FLOAT, 'Elevation')).setValue(1.5);
  root.addField(new GFFField(GFFDataType.FLOAT, 'MaxDistance')).setValue(8.0);
  root.addField(new GFFField(GFFDataType.FLOAT, 'MinDistance')).setValue(5.0);
  root.addField(new GFFField(GFFDataType.FLOAT, 'RandomRangeX')).setValue(0.10000000149011612);
  root.addField(new GFFField(GFFDataType.FLOAT, 'RandomRangeY')).setValue(0.20000000298023224);
  root.addField(new GFFField(GFFDataType.DWORD, 'Interval')).setValue(4000);
  root.addField(new GFFField(GFFDataType.DWORD, 'IntervalVrtn')).setValue(100);
  root.addField(new GFFField(GFFDataType.FLOAT, 'PitchVariation')).setValue(0.10000000149011612);
  root.addField(new GFFField(GFFDataType.BYTE, 'Priority')).setValue(22);
  root.addField(new GFFField(GFFDataType.DWORD, 'Hours')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'Times')).setValue(3);
  root.addField(new GFFField(GFFDataType.BYTE, 'Volume')).setValue(120);
  root.addField(new GFFField(GFFDataType.BYTE, 'VolumeVrtn')).setValue(7);

  const soundsField = new GFFField(GFFDataType.LIST, 'Sounds');
  for (const sound of ['c_drdastro_dead', 'c_drdastro_atk1', 'p_t3-m4_dead', 'c_drdastro_atk2']) {
    const soundStruct = new GFFStruct(0);
    soundStruct.addField(new GFFField(GFFDataType.RESREF, 'Sound')).setValue(sound);
    soundsField.addChildStruct(soundStruct);
  }
  root.addField(soundsField);

  root.addField(new GFFField(GFFDataType.BYTE, 'PaletteID')).setValue(6);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment')).setValue('comment');

  return gff;
}

function validateSound(sound: ForgeSound): void {
  expect(sound.tag).toBe('3Csounds');
  expect(sound.locName.getRESREF()).toBe(128551);
  expect(sound.templateResRef).toBe('3csounds');
  expect(sound.active).toBe(true);
  expect(sound.continuous).toBe(true);
  expect(sound.looping).toBe(true);
  expect(sound.positional).toBe(true);
  expect(sound.randomPosition).toBe(true);
  expect(sound.random).toBe(true);
  expect(sound.elevation).toBeCloseTo(1.5);
  expect(sound.maxDistance).toBeCloseTo(8.0);
  expect(sound.minDistance).toBeCloseTo(5.0);
  expect(sound.randomRangeX).toBeCloseTo(0.10000000149011612);
  expect(sound.randomRangeY).toBeCloseTo(0.20000000298023224);
  expect(sound.interval).toBe(4000);
  expect(sound.intervalVariation).toBe(100);
  expect(sound.pitchVariation).toBeCloseTo(0.10000000149011612);
  expect(sound.priority).toBe(22);
  expect(sound.hours).toBe(0);
  expect(sound.times).toBe(3);
  expect(sound.volume).toBe(120);
  expect(sound.volumeVariation).toBe(7);
  expect(sound.paletteID).toBe(6);
  expect(sound.comment).toBe('comment');
  expect(sound.soundResRefs).toEqual(['c_drdastro_dead', 'c_drdastro_atk1', 'p_t3-m4_dead', 'c_drdastro_atk2']);
}

describe('ForgeSound (UTS)', () => {
  it('loadFromBlueprint parses the vendor-style UTS fixture', () => {
    const sound = new ForgeSound();
    sound.blueprint = buildSoundGff();
    sound.loadFromBlueprint();
    validateSound(sound);
  });

  it('exportToBlueprint round-trips UTS fields without clobbering stored priority', () => {
    const sound = new ForgeSound();
    sound.blueprint = buildSoundGff();
    sound.loadFromBlueprint();

    const roundTripped = new ForgeSound();
    roundTripped.blueprint = sound.exportToBlueprint();
    roundTripped.loadFromBlueprint();

    validateSound(roundTripped);
  });

  it('binary round-trip preserves UTS data', () => {
    const sound = new ForgeSound();
    sound.blueprint = buildSoundGff();
    sound.loadFromBlueprint();

    const binary = sound.exportToBlueprint().getExportBuffer();
    const roundTripped = new ForgeSound(binary);

    validateSound(roundTripped);
  });

  it('calculatePriority still updates derived priority when toggles change', () => {
    const sound = new ForgeSound();

    sound.looping = true;
    sound.positional = false;
    sound.calculatePriority();
    expect(sound.priority).toBe(4);

    sound.positional = true;
    sound.calculatePriority();
    expect(sound.priority).toBe(5);

    sound.looping = false;
    sound.positional = false;
    sound.calculatePriority();
    expect(sound.priority).toBe(21);

    sound.positional = true;
    sound.calculatePriority();
    expect(sound.priority).toBe(22);
  });

  it('missing fields use defaults', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTS ';
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('only_tag');

    const sound = new ForgeSound();
    sound.blueprint = gff;
    sound.loadFromBlueprint();

    expect(sound.tag).toBe('only_tag');
    expect(sound.templateResRef).toBe('');
    expect(sound.active).toBe(false);
    expect(sound.continuous).toBe(false);
    expect(sound.looping).toBe(false);
    expect(sound.positional).toBe(false);
    expect(sound.priority).toBe(0);
    expect(sound.soundResRefs).toHaveLength(0);
    expect(sound.comment).toBe('');
  });
});
