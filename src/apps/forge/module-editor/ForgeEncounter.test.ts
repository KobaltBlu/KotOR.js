import { describe, expect, it, jest } from '@jest/globals';

import { CExoLocString } from '@/resource/CExoLocString';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { ForgeEncounter } from '@/apps/forge/module-editor/ForgeEncounter';

jest.mock('@/apps/forge/UI3DRenderer', () => ({
  GroupType: {
    Encounter: 'Encounter',
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

  class EncounterSpawnPointEntry {
    position = { x: 0, y: 0, z: 0 };
    orientation = 0;
    static FromStruct() {
      return new EncounterSpawnPointEntry();
    }
  }

  return {
    CExoLocString,
    GFFDataType,
    GFFField,
    GFFObject,
    GFFStruct,
    EncounterSpawnPointEntry,
    ResourceTypes: {
      ute: 2040,
    },
  };
});

function buildEncounterGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTE ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('G_KATAARNGROUP01');
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName')).setCExoLocString(new CExoLocString(31918));
  root.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('g_kataarngroup01');
  root.addField(new GFFField(GFFDataType.BYTE, 'Active')).setValue(1);
  root.addField(new GFFField(GFFDataType.INT, 'Difficulty')).setValue(1);
  root.addField(new GFFField(GFFDataType.INT, 'DifficultyIndex')).setValue(2);
  root.addField(new GFFField(GFFDataType.DWORD, 'Faction')).setValue(1);
  root.addField(new GFFField(GFFDataType.INT, 'MaxCreatures')).setValue(6);
  root.addField(new GFFField(GFFDataType.BYTE, 'PlayerOnly')).setValue(1);
  root.addField(new GFFField(GFFDataType.INT, 'RecCreatures')).setValue(3);
  root.addField(new GFFField(GFFDataType.BYTE, 'Reset')).setValue(1);
  root.addField(new GFFField(GFFDataType.INT, 'ResetTime')).setValue(60);
  root.addField(new GFFField(GFFDataType.INT, 'Respawns')).setValue(1);
  root.addField(new GFFField(GFFDataType.INT, 'SpawnOption')).setValue(1);
  root.addField(new GFFField(GFFDataType.RESREF, 'OnEntered')).setValue('onentered');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnExit')).setValue('onexit');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnExhausted')).setValue('onexhausted');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnHeartbeat')).setValue('onheartbeat');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnUserDefined')).setValue('onuserdefined');

  const creatureList = new GFFField(GFFDataType.LIST, 'CreatureList');
  const firstCreature = new GFFStruct(0);
  firstCreature.addField(new GFFField(GFFDataType.INT, 'Appearance')).setValue(74);
  firstCreature.addField(new GFFField(GFFDataType.FLOAT, 'CR')).setValue(4.0);
  firstCreature.addField(new GFFField(GFFDataType.RESREF, 'ResRef')).setValue('g_kataarn01');
  firstCreature.addField(new GFFField(GFFDataType.BYTE, 'SingleSpawn')).setValue(1);
  creatureList.addChildStruct(firstCreature);

  const secondCreature = new GFFStruct(0);
  secondCreature.addField(new GFFField(GFFDataType.INT, 'Appearance')).setValue(74);
  secondCreature.addField(new GFFField(GFFDataType.FLOAT, 'CR')).setValue(8.0);
  secondCreature.addField(new GFFField(GFFDataType.RESREF, 'ResRef')).setValue('g_kataarn02');
  secondCreature.addField(new GFFField(GFFDataType.BYTE, 'SingleSpawn')).setValue(1);
  secondCreature.addField(new GFFField(GFFDataType.INT, 'GuaranteedCount')).setValue(1);
  creatureList.addChildStruct(secondCreature);
  root.addField(creatureList);

  root.addField(new GFFField(GFFDataType.BYTE, 'PaletteID')).setValue(7);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment')).setValue('Kashyyyk');

  return gff;
}

function validateEncounter(encounter: ForgeEncounter): void {
  expect(encounter.tag).toBe('G_KATAARNGROUP01');
  expect(encounter.localizedName.getRESREF()).toBe(31918);
  expect(encounter.templateResRef).toBe('g_kataarngroup01');
  expect(encounter.active).toBe(true);
  expect(encounter.difficulty).toBe(1);
  expect(encounter.difficultyIndex).toBe(2);
  expect(encounter.faction).toBe(1);
  expect(encounter.maxCreatures).toBe(6);
  expect(encounter.playerOnly).toBe(true);
  expect(encounter.recCreatures).toBe(3);
  expect(encounter.reset).toBe(true);
  expect(encounter.resetTime).toBe(60);
  expect(encounter.respawns).toBe(1);
  expect(encounter.spawnOption).toBe(1);
  expect(encounter.onEntered).toBe('onentered');
  expect(encounter.onExit).toBe('onexit');
  expect(encounter.onExhausted).toBe('onexhausted');
  expect(encounter.onHeartbeat).toBe('onheartbeat');
  expect(encounter.onUserDefined).toBe('onuserdefined');
  expect(encounter.paletteID).toBe(7);
  expect(encounter.comment).toBe('Kashyyyk');
  expect(encounter.creatureList).toHaveLength(2);
  expect(encounter.creatureList[0]).toEqual({
    appearance: 74,
    resref: 'g_kataarn01',
    cr: 4,
    singleSpawn: true,
    guaranteedCount: undefined,
  });
  expect(encounter.creatureList[1]).toEqual({
    appearance: 74,
    resref: 'g_kataarn02',
    cr: 8,
    singleSpawn: true,
    guaranteedCount: 1,
  });
}

describe('ForgeEncounter (UTE)', () => {
  it('loadFromBlueprint parses the vendor-style UTE fixture', () => {
    const encounter = new ForgeEncounter();
    encounter.blueprint = buildEncounterGff();
    encounter.loadFromBlueprint();
    validateEncounter(encounter);
  });

  it('exportToBlueprint round-trips UTE fields', () => {
    const encounter = new ForgeEncounter();
    encounter.blueprint = buildEncounterGff();
    encounter.loadFromBlueprint();

    const roundTripped = new ForgeEncounter();
    roundTripped.blueprint = encounter.exportToBlueprint();
    roundTripped.loadFromBlueprint();

    validateEncounter(roundTripped);
  });

  it('binary round-trip preserves UTE data', () => {
    const encounter = new ForgeEncounter();
    encounter.blueprint = buildEncounterGff();
    encounter.loadFromBlueprint();

    const binary = encounter.exportToBlueprint().getExportBuffer();
    const roundTripped = new ForgeEncounter(binary);

    validateEncounter(roundTripped);
  });

  it('missing fields use defaults', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTE ';
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('only_tag');

    const encounter = new ForgeEncounter();
    encounter.blueprint = gff;
    encounter.loadFromBlueprint();

    expect(encounter.tag).toBe('only_tag');
    expect(encounter.templateResRef).toBe('');
    expect(encounter.active).toBe(false);
    expect(encounter.playerOnly).toBe(false);
    expect(encounter.reset).toBe(false);
    expect(encounter.creatureList).toHaveLength(0);
    expect(encounter.comment).toBe('');
  });
});