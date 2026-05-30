import { describe, expect, it, jest } from '@jest/globals';

import { CExoLocString } from '@/resource/CExoLocString';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { ForgeStore } from '@/apps/forge/module-editor/ForgeStore';

jest.mock('@/apps/forge/UI3DRenderer', () => ({
  GroupType: {
    Store: 'Store',
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
      utm: 2045,
    },
    ResourceLoader: {
      loadResource: jest.fn(),
    },
  };
});

function buildStoreGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTM ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.BYTE, 'BuySellFlag')).setValue(3);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment')).setValue('comment');
  root.addField(new GFFField(GFFDataType.BYTE, 'ID')).setValue(5);

  const itemList = new GFFField(GFFDataType.LIST, 'ItemList');
  const firstItem = new GFFStruct(0);
  firstItem.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes')).setValue('g_i_frarmbnds01');
  firstItem.addField(new GFFField(GFFDataType.WORD, 'Repos_PosX')).setValue(0);
  firstItem.addField(new GFFField(GFFDataType.WORD, 'Repos_PosY')).setValue(0);
  itemList.addChildStruct(firstItem);

  const secondItem = new GFFStruct(0);
  secondItem.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes')).setValue('g_i_mask01');
  secondItem.addField(new GFFField(GFFDataType.WORD, 'Repos_PosX')).setValue(1);
  secondItem.addField(new GFFField(GFFDataType.WORD, 'Repos_PosY')).setValue(2);
  itemList.addChildStruct(secondItem);

  root.addField(itemList);
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName')).setCExoLocString(new CExoLocString(74450));
  root.addField(new GFFField(GFFDataType.INT, 'MarkDown')).setValue(25);
  root.addField(new GFFField(GFFDataType.INT, 'MarkUp')).setValue(100);
  root.addField(new GFFField(GFFDataType.RESREF, 'OnOpenStore')).setValue('onopenstore');
  root.addField(new GFFField(GFFDataType.RESREF, 'ResRef')).setValue('dan_droidshop');
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('dan_droid_shop');

  return gff;
}

function buildLegacyStoreGff(): GFFObject {
  const gff = buildStoreGff();
  const root = gff.RootNode;
  const legacyItemList = new GFFField(GFFDataType.LIST, 'ItemList');

  const legacyFirstItem = new GFFStruct(0);
  legacyFirstItem.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes')).setValue('g_i_frarmbnds01');
  legacyFirstItem.addField(new GFFField(GFFDataType.WORD, 'Repos_PosX')).setValue(0);
  legacyFirstItem.addField(new GFFField(GFFDataType.WORD, 'Repos_Posy')).setValue(9);
  legacyItemList.addChildStruct(legacyFirstItem);

  const legacySecondItem = new GFFStruct(0);
  legacySecondItem.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes')).setValue('g_i_mask01');
  legacySecondItem.addField(new GFFField(GFFDataType.WORD, 'Repos_PosX')).setValue(1);
  legacySecondItem.addField(new GFFField(GFFDataType.WORD, 'Repos_Posy')).setValue(2);
  legacyItemList.addChildStruct(legacySecondItem);

  root.fields = root.fields.filter((field) => field.getLabel() !== 'ItemList');
  root.addField(legacyItemList);

  return gff;
}

function validateStore(store: ForgeStore): void {
  expect(store.buySellFlag).toBe(3);
  expect(store.comment).toBe('comment');
  expect(store.id).toBe(5);
  expect(store.itemList).toEqual([
    { inventoryRes: 'g_i_frarmbnds01', reposPosX: 0, reposPosY: 0 },
    { inventoryRes: 'g_i_mask01', reposPosX: 1, reposPosY: 2 },
  ]);
  expect(store.locName.getRESREF()).toBe(74450);
  expect(store.markDown).toBe(25);
  expect(store.markUp).toBe(100);
  expect(store.onOpenStore).toBe('onopenstore');
  expect(store.templateResRef).toBe('dan_droidshop');
  expect(store.resref).toBe('dan_droidshop');
  expect(store.tag).toBe('dan_droid_shop');
}

describe('ForgeStore (UTM)', () => {
  it('loadFromBlueprint parses a vendor-style UTM fixture', () => {
    const store = new ForgeStore();
    store.blueprint = buildStoreGff();
    store.loadFromBlueprint();

    validateStore(store);
  });

  it('exportToBlueprint round-trips UTM fields', () => {
    const store = new ForgeStore();
    store.blueprint = buildStoreGff();
    store.loadFromBlueprint();

    const roundTripped = new ForgeStore();
    roundTripped.blueprint = store.exportToBlueprint();
    roundTripped.loadFromBlueprint();

    validateStore(roundTripped);
  });

  it('binary round-trip preserves UTM data', () => {
    const store = new ForgeStore();
    store.blueprint = buildStoreGff();
    store.loadFromBlueprint();

    const binary = store.exportToBlueprint().getExportBuffer();
    const roundTripped = new ForgeStore(binary);

    validateStore(roundTripped);
  });

  it('loadFromBlueprint supports the legacy Repos_Posy typo', () => {
    const store = new ForgeStore();
    store.blueprint = buildLegacyStoreGff();
    store.loadFromBlueprint();

    expect(store.itemList[0].reposPosY).toBe(9);
  });

  it('missing fields use defaults', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTM ';
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('only_tag');

    const store = new ForgeStore();
    store.blueprint = gff;
    store.loadFromBlueprint();

    expect(store.tag).toBe('only_tag');
    expect(store.templateResRef).toBe('');
    expect(store.buySellFlag).toBe(0);
    expect(store.itemList).toHaveLength(0);
    expect(store.markDown).toBe(0);
    expect(store.markUp).toBe(0);
    expect(store.onOpenStore).toBe('');
    expect(store.comment).toBe('');
  });
});
