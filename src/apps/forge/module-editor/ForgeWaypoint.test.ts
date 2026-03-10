import { describe, expect, it, jest } from '@jest/globals';

import { CExoLocString } from '@/resource/CExoLocString';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { ForgeWaypoint } from '@/apps/forge/module-editor/ForgeWaypoint';

jest.mock('@/apps/forge/UI3DRenderer', () => ({
  GroupType: {
    Waypoint: 'Waypoint',
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
      utw: 2044,
    },
    ResourceLoader: {
      loadResource: jest.fn(),
    },
  };
});

function buildWaypointGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTW ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.BYTE, 'Appearance')).setValue(1);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo')).setValue('');
  root.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('sw_mapnote011');
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('MN_106PER2');
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName')).setCExoLocString(new CExoLocString(76857));
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Description')).setCExoLocString(new CExoLocString(-1));
  root.addField(new GFFField(GFFDataType.BYTE, 'HasMapNote')).setValue(1);
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'MapNote')).setCExoLocString(new CExoLocString(76858));
  root.addField(new GFFField(GFFDataType.BYTE, 'MapNoteEnabled')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'PaletteID')).setValue(5);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment')).setValue('comment');

  return gff;
}

function validateWaypoint(waypoint: ForgeWaypoint): void {
  expect(waypoint.appearance).toBe(1);
  expect(waypoint.linkedTo).toBe('');
  expect(waypoint.templateResRef).toBe('sw_mapnote011');
  expect(waypoint.tag).toBe('MN_106PER2');
  expect(waypoint.localizedName.getRESREF()).toBe(76857);
  expect(waypoint.description.getRESREF()).toBe(-1);
  expect(waypoint.hasMapNote).toBe(true);
  expect(waypoint.mapNote.getRESREF()).toBe(76858);
  expect(waypoint.mapNoteEnabled).toBe(true);
  expect(waypoint.paletteID).toBe(5);
  expect(waypoint.comment).toBe('comment');
}

describe('ForgeWaypoint (UTW)', () => {
  it('loadFromBlueprint parses the vendor-style UTW fixture', () => {
    const waypoint = new ForgeWaypoint();
    waypoint.blueprint = buildWaypointGff();
    waypoint.loadFromBlueprint();

    validateWaypoint(waypoint);
  });

  it('exportToBlueprint round-trips UTW fields', () => {
    const waypoint = new ForgeWaypoint();
    waypoint.blueprint = buildWaypointGff();
    waypoint.loadFromBlueprint();

    const roundTripped = new ForgeWaypoint();
    roundTripped.blueprint = waypoint.exportToBlueprint();
    roundTripped.loadFromBlueprint();

    validateWaypoint(roundTripped);
  });

  it('binary round-trip preserves UTW data', () => {
    const waypoint = new ForgeWaypoint();
    waypoint.blueprint = buildWaypointGff();
    waypoint.loadFromBlueprint();

    const binary = waypoint.exportToBlueprint().getExportBuffer();
    const roundTripped = new ForgeWaypoint(binary);

    validateWaypoint(roundTripped);
  });

  it('missing fields use defaults', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTW ';
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('only_tag');

    const waypoint = new ForgeWaypoint();
    waypoint.blueprint = gff;
    waypoint.loadFromBlueprint();

    expect(waypoint.tag).toBe('only_tag');
    expect(waypoint.templateResRef).toBe('');
    expect(waypoint.hasMapNote).toBe(false);
    expect(waypoint.mapNoteEnabled).toBe(false);
    expect(waypoint.paletteID).toBe(0);
    expect(waypoint.comment).toBe('');
  });
});
