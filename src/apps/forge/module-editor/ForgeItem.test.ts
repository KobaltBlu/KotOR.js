import { describe, expect, it, jest } from '@jest/globals';

import { GFFDataType } from '@/enums/resource/GFFDataType';
import { CExoLocString } from '@/resource/CExoLocString';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { ForgeItem } from '@/apps/forge/module-editor/ForgeItem';

jest.mock('@/apps/forge/data/InstallationRegistry', () => ({
  InstallationRegistry: {
    BASEITEMS: 'baseitems',
    get2DASync: jest.fn(),
  },
}));

jest.mock('@/apps/forge/states/tabs/TabUTIEditorState', () => ({}));

jest.mock('@/apps/forge/UI3DRenderer', () => ({
  GroupType: {},
  UI3DRenderer: class UI3DRenderer {},
}));

jest.mock('@/apps/forge/states/tabs/TabState', () => ({
  TabState: class TabState {},
}));

jest.mock('@/apps/forge/KotOR', () => {
  const { GFFDataType } = require('@/enums/resource/GFFDataType');
  const { GFFField } = require('@/resource/GFFField');
  const { GFFObject } = require('@/resource/GFFObject');
  const { GFFStruct } = require('@/resource/GFFStruct');
  const { CExoLocString } = require('@/resource/CExoLocString');

  return {
    CExoLocString,
    GFFDataType,
    GFFField,
    GFFObject,
    GFFStruct,
    ResourceTypes: {
      NA: 0,
      uti: 2036,
    },
    MDLLoader: {
      loader: {
        load: jest.fn(),
      },
    },
    OdysseyModel3D: class OdysseyModel3D {
      static FromMDL = jest.fn();
      removeFromParent() {}
      dispose() {}
    },
  };
});

function buildItemGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTI ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('g_a_class4001');
  root.addField(new GFFField(GFFDataType.INT, 'BaseItem')).setValue(38);
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName')).setCExoLocString(new CExoLocString(5632));
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Description')).setCExoLocString(new CExoLocString(456));
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'DescIdentified')).setCExoLocString(new CExoLocString(5633));
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('G_A_CLASS4001');
  root.addField(new GFFField(GFFDataType.BYTE, 'Charges')).setValue(13);
  root.addField(new GFFField(GFFDataType.DWORD, 'Cost')).setValue(50);
  root.addField(new GFFField(GFFDataType.BYTE, 'Stolen')).setValue(1);
  root.addField(new GFFField(GFFDataType.WORD, 'StackSize')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Plot')).setValue(1);
  root.addField(new GFFField(GFFDataType.DWORD, 'AddCost')).setValue(50);
  root.addField(new GFFField(GFFDataType.BYTE, 'Identified')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'BodyVariation')).setValue(3);
  root.addField(new GFFField(GFFDataType.BYTE, 'TextureVar')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'PaletteID')).setValue(1);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment')).setValue('itemo');
  root.addField(new GFFField(GFFDataType.BYTE, 'ModelVariation')).setValue(2);

  const propertiesList = new GFFField(GFFDataType.LIST, 'PropertiesList');
  {
    const property1 = new GFFStruct(0);
    property1.addField(new GFFField(GFFDataType.WORD, 'PropertyName')).setValue(45);
    property1.addField(new GFFField(GFFDataType.WORD, 'Subtype')).setValue(6);
    property1.addField(new GFFField(GFFDataType.BYTE, 'CostTable')).setValue(1);
    property1.addField(new GFFField(GFFDataType.WORD, 'CostValue')).setValue(1);
    property1.addField(new GFFField(GFFDataType.BYTE, 'Param1')).setValue(255);
    property1.addField(new GFFField(GFFDataType.BYTE, 'Param1Value')).setValue(1);
    property1.addField(new GFFField(GFFDataType.BYTE, 'ChanceAppear')).setValue(100);
    propertiesList.addChildStruct(property1);

    const property2 = new GFFStruct(0);
    property2.addField(new GFFField(GFFDataType.WORD, 'PropertyName')).setValue(45);
    property2.addField(new GFFField(GFFDataType.WORD, 'Subtype')).setValue(6);
    property2.addField(new GFFField(GFFDataType.BYTE, 'CostTable')).setValue(1);
    property2.addField(new GFFField(GFFDataType.WORD, 'CostValue')).setValue(1);
    property2.addField(new GFFField(GFFDataType.BYTE, 'Param1')).setValue(255);
    property2.addField(new GFFField(GFFDataType.BYTE, 'Param1Value')).setValue(1);
    property2.addField(new GFFField(GFFDataType.BYTE, 'ChanceAppear')).setValue(100);
    property2.addField(new GFFField(GFFDataType.BYTE, 'UpgradeType')).setValue(24);
    propertiesList.addChildStruct(property2);
  }
  root.addField(propertiesList);

  return gff;
}

function validateItem(item: ForgeItem): void {
  expect(item.templateResRef).toBe('g_a_class4001');
  expect(item.baseItem).toBe(38);
  expect(item.locName.getRESREF()).toBe(5632);
  expect(item.description.getRESREF()).toBe(456);
  expect(item.descIdentified.getRESREF()).toBe(5633);
  expect(item.tag).toBe('G_A_CLASS4001');
  expect(item.charges).toBe(13);
  expect(item.cost).toBe(50);
  expect(item.stolen).toBe(true);
  expect(item.stackSize).toBe(1);
  expect(item.plot).toBe(true);
  expect(item.addCost).toBe(50);
  expect(item.bodyVariation).toBe(3);
  expect(item.textureVariation).toBe(1);
  expect(item.modelVariation).toBe(2);
  expect(item.paletteID).toBe(1);
  expect(item.comment).toBe('itemo');
  expect(item.identified).toBe(true);

  expect(item.properties).toHaveLength(2);
  expect(item.properties[0].propertyName).toBe(45);
  expect(item.properties[0].subtype).toBe(6);
  expect(item.properties[0].costTable).toBe(1);
  expect(item.properties[0].costValue).toBe(1);
  expect(item.properties[0].param1).toBe(255);
  expect(item.properties[0].param1Value).toBe(1);
  expect(item.properties[0].chanceAppear).toBe(100);
  expect(item.properties[0].upgradeType).toBeUndefined();
  expect(item.properties[1].upgradeType).toBe(24);
}

describe('ForgeItem (UTI)', () => {
  it('loadFromBlueprint parses the item fixture', () => {
    const item = new ForgeItem();
    item.blueprint = buildItemGff();
    item.loadFromBlueprint();
    validateItem(item);
  });

  it('exportToBlueprint round-trips item fields', () => {
    const item = new ForgeItem();
    item.blueprint = buildItemGff();
    item.loadFromBlueprint();

    const roundTripped = new ForgeItem();
    roundTripped.blueprint = item.exportToBlueprint();
    roundTripped.loadFromBlueprint();

    validateItem(roundTripped);
  });

  it('binary round-trip preserves item fields', () => {
    const item = new ForgeItem();
    item.blueprint = buildItemGff();
    item.loadFromBlueprint();

    const binary = item.exportToBlueprint().getExportBuffer();
    const roundTripped = new ForgeItem(binary);

    validateItem(roundTripped);
  });

  it('missing fields use defaults', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTI ';
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('only_tag');
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'PropertiesList'));

    const item = new ForgeItem();
    item.blueprint = gff;
    item.loadFromBlueprint();

    expect(item.tag).toBe('only_tag');
    expect(item.templateResRef).toBe('');
    expect(item.baseItem).toBe(0);
    expect(item.modelVariation).toBe(1);
    expect(item.textureVariation).toBe(1);
    expect(item.bodyVariation).toBe(0);
    expect(item.identified).toBe(true);
    expect(item.stackSize).toBe(1);
    expect(item.properties).toHaveLength(0);
  });
});
