import { describe, expect, it, jest } from '@jest/globals';

import { CExoLocString } from '@/resource/CExoLocString';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { ForgePlaceable } from '@/apps/forge/module-editor/ForgePlaceable';

jest.mock('@/apps/forge/UI3DRenderer', () => ({
  GroupType: {
    Placeable: 'Placeable',
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
      utp: 2044,
    },
    OdysseyModel3D: class OdysseyModel3D {
      static FromMDL = jest.fn();
      removeFromParent() {}
      dispose() {}
      update() {}
    },
    OdysseyWalkMesh: class OdysseyWalkMesh {},
    TwoDAManager: {
      datatables: new Map(),
    },
    MDLLoader: {
      loader: {
        load: jest.fn(),
      },
    },
  };
});

function buildPlaceableGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTP ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('SecLoc');
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName')).setCExoLocString(new CExoLocString(74450));
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Description')).setCExoLocString(new CExoLocString(-1));
  root.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('lockerlg002');
  root.addField(new GFFField(GFFDataType.BYTE, 'AutoRemoveKey')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'CloseLockDC')).setValue(13);
  root.addField(new GFFField(GFFDataType.RESREF, 'Conversation')).setValue('conversation');
  root.addField(new GFFField(GFFDataType.BYTE, 'Interruptable')).setValue(1);
  root.addField(new GFFField(GFFDataType.DWORD, 'Faction')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Plot')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'NotBlastable')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Min1HP')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'KeyRequired')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Lockable')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'Locked')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'OpenLockDC')).setValue(28);
  root.addField(new GFFField(GFFDataType.BYTE, 'OpenLockDiff')).setValue(1);
  root.addField(new GFFField(GFFDataType.CHAR, 'OpenLockDiffMod')).setValue(1);
  root.addField(new GFFField(GFFDataType.WORD, 'PortraitId')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectable')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectDC')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapDisarmable')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'DisarmDC')).setValue(15);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapFlag')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapOneShot')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapType')).setValue(0);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'KeyName')).setValue('somekey');
  root.addField(new GFFField(GFFDataType.BYTE, 'AnimationState')).setValue(2);
  root.addField(new GFFField(GFFDataType.DWORD, 'Appearance')).setValue(67);
  root.addField(new GFFField(GFFDataType.SHORT, 'HP')).setValue(15);
  root.addField(new GFFField(GFFDataType.SHORT, 'CurrentHP')).setValue(15);
  root.addField(new GFFField(GFFDataType.BYTE, 'Hardness')).setValue(5);
  root.addField(new GFFField(GFFDataType.BYTE, 'Fort')).setValue(16);
  root.addField(new GFFField(GFFDataType.BYTE, 'Ref')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'Will')).setValue(0);
  root.addField(new GFFField(GFFDataType.RESREF, 'OnClosed')).setValue('onclosed');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnDamaged')).setValue('ondamaged');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnDeath')).setValue('ondeath');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnDisarm')).setValue('ondisarm');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnHeartbeat')).setValue('onheartbeat');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnLock')).setValue('onlock');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnMeleeAttacked')).setValue('onmeleeattacked');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnOpen')).setValue('onopen');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnSpellCastAt')).setValue('onspellcastat');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnTrapTriggered')).setValue('');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnUnlock')).setValue('onunlock');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnUserDefined')).setValue('onuserdefined');
  root.addField(new GFFField(GFFDataType.BYTE, 'HasInventory')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'PartyInteract')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'BodyBag')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'Static')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Type')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'Useable')).setValue(1);
  root.addField(new GFFField(GFFDataType.RESREF, 'OnEndDialogue')).setValue('onenddialogue');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnInvDisturbed')).setValue('oninvdisturbed');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnUsed')).setValue('onused');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnFailToOpen')).setValue('onfailtoopen');

  const itemList = new GFFField(GFFDataType.LIST, 'ItemList');
  const firstItem = new GFFStruct(0);
  firstItem.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes')).setValue('g_w_iongren01');
  itemList.addChildStruct(firstItem);

  const secondItem = new GFFStruct(1);
  secondItem.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes')).setValue('g_w_iongren02');
  secondItem.addField(new GFFField(GFFDataType.BYTE, 'Dropable')).setValue(1);
  itemList.addChildStruct(secondItem);
  root.addField(itemList);

  root.addField(new GFFField(GFFDataType.BYTE, 'PaletteID')).setValue(6);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment')).setValue('Large standup locker');

  return gff;
}

function validatePlaceable(placeable: ForgePlaceable): void {
  expect(placeable.tag).toBe('SecLoc');
  expect(placeable.locName.getRESREF()).toBe(74450);
  expect(placeable.description.getRESREF()).toBe(-1);
  expect(placeable.templateResRef).toBe('lockerlg002');
  expect(placeable.autoRemoveKey).toBe(true);
  expect(placeable.closeLockDC).toBe(13);
  expect(placeable.conversation).toBe('conversation');
  expect(placeable.interruptable).toBe(true);
  expect(placeable.faction).toBe(1);
  expect(placeable.plot).toBe(true);
  expect(placeable.notBlastable).toBe(true);
  expect(placeable.min1HP).toBe(true);
  expect(placeable.keyRequired).toBe(true);
  expect(placeable.lockable).toBe(false);
  expect(placeable.locked).toBe(true);
  expect(placeable.openLockDC).toBe(28);
  expect(placeable.openLockDiff).toBe(1);
  expect(placeable.openLockDiffMod).toBe(1);
  expect(placeable.portraitId).toBe(0);
  expect(placeable.trapDetectable).toBe(true);
  expect(placeable.trapDetectDC).toBe(0);
  expect(placeable.trapDisarmable).toBe(true);
  expect(placeable.disarmDC).toBe(15);
  expect(placeable.trapFlag).toBe(false);
  expect(placeable.trapOneShot).toBe(true);
  expect(placeable.trapType).toBe(0);
  expect(placeable.keyName).toBe('somekey');
  expect(placeable.animationState).toBe(2);
  expect(placeable.appearance).toBe(67);
  expect(placeable.hp).toBe(15);
  expect(placeable.currentHP).toBe(15);
  expect(placeable.hardness).toBe(5);
  expect(placeable.fort).toBe(16);
  expect(placeable.ref).toBe(0);
  expect(placeable.will).toBe(0);
  expect(placeable.onClosed).toBe('onclosed');
  expect(placeable.onDamaged).toBe('ondamaged');
  expect(placeable.onDeath).toBe('ondeath');
  expect(placeable.onDisarm).toBe('ondisarm');
  expect(placeable.onHeartbeat).toBe('onheartbeat');
  expect(placeable.onLock).toBe('onlock');
  expect(placeable.onMeleeAttacked).toBe('onmeleeattacked');
  expect(placeable.onOpen).toBe('onopen');
  expect(placeable.onSpellCastAt).toBe('onspellcastat');
  expect(placeable.onTrapTriggered).toBe('');
  expect(placeable.onUnlock).toBe('onunlock');
  expect(placeable.onUserDefined).toBe('onuserdefined');
  expect(placeable.hasInventory).toBe(true);
  expect(placeable.partyInteract).toBe(true);
  expect(placeable.bodyBag).toBe(false);
  expect(placeable.static).toBe(true);
  expect(placeable.t_type).toBe(0);
  expect(placeable.useable).toBe(true);
  expect(placeable.onEndDialogue).toBe('onenddialogue');
  expect(placeable.onInvDisturbed).toBe('oninvdisturbed');
  expect(placeable.onUsed).toBe('onused');
  expect(placeable.onFailToOpen).toBe('onfailtoopen');
  expect(placeable.paletteID).toBe(6);
  expect(placeable.comment).toBe('Large standup locker');
  expect(placeable.itemList).toHaveLength(2);
  expect(placeable.itemList[0]).toEqual({ inventoryRes: 'g_w_iongren01', droppable: false });
  expect(placeable.itemList[1]).toEqual({ inventoryRes: 'g_w_iongren02', droppable: true });
}

describe('ForgePlaceable (UTP)', () => {
  it('loadFromBlueprint parses the vendor-style UTP fixture', () => {
    const placeable = new ForgePlaceable();
    placeable.blueprint = buildPlaceableGff();
    placeable.loadFromBlueprint();
    validatePlaceable(placeable);
  });

  it('exportToBlueprint round-trips UTP fields', () => {
    const placeable = new ForgePlaceable();
    placeable.blueprint = buildPlaceableGff();
    placeable.loadFromBlueprint();

    const roundTripped = new ForgePlaceable();
    roundTripped.blueprint = placeable.exportToBlueprint();
    roundTripped.loadFromBlueprint();

    validatePlaceable(roundTripped);
  });

  it('binary round-trip preserves UTP data', () => {
    const placeable = new ForgePlaceable();
    placeable.blueprint = buildPlaceableGff();
    placeable.loadFromBlueprint();

    const binary = placeable.exportToBlueprint().getExportBuffer();
    const roundTripped = new ForgePlaceable(binary);

    validatePlaceable(roundTripped);
  });

  it('missing fields use defaults', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTP ';
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('only_tag');

    const placeable = new ForgePlaceable();
    placeable.blueprint = gff;
    placeable.loadFromBlueprint();

    expect(placeable.tag).toBe('only_tag');
    expect(placeable.templateResRef).toBe('');
    expect(placeable.conversation).toBe('');
    expect(placeable.plot).toBe(false);
    expect(placeable.notBlastable).toBe(false);
    expect(placeable.lockable).toBe(false);
    expect(placeable.locked).toBe(false);
    expect(placeable.openLockDC).toBe(0);
    expect(placeable.openLockDiff).toBe(0);
    expect(placeable.openLockDiffMod).toBe(0);
    expect(placeable.hasInventory).toBe(false);
    expect(placeable.itemList).toHaveLength(0);
    expect(placeable.comment).toBe('');
  });
});