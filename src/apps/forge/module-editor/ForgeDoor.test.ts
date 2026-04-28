import { describe, expect, it, jest } from '@jest/globals';

import { CExoLocString } from '@/resource/CExoLocString';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { ForgeDoor } from '@/apps/forge/module-editor/ForgeDoor';

jest.mock('@/apps/forge/UI3DRenderer', () => ({
  GroupType: {
    Door: 'Door',
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

  return {
    CExoLocString,
    GFFDataType,
    GFFField,
    GFFObject,
    ResourceTypes: {
      utd: 2032,
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

function buildDoorGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTD ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('TelosDoor13');
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName')).setCExoLocString(new CExoLocString(123731));
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Description')).setCExoLocString(new CExoLocString(-1));
  root.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('door_tel014');
  root.addField(new GFFField(GFFDataType.BYTE, 'AutoRemoveKey')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'CloseLockDC')).setValue(0);
  root.addField(new GFFField(GFFDataType.RESREF, 'Conversation')).setValue('convoresref');
  root.addField(new GFFField(GFFDataType.BYTE, 'Interruptable')).setValue(1);
  root.addField(new GFFField(GFFDataType.DWORD, 'Faction')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Plot')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'NotBlastable')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Min1HP')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'KeyRequired')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Lockable')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Locked')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'OpenLockDC')).setValue(28);
  root.addField(new GFFField(GFFDataType.BYTE, 'OpenLockDiff')).setValue(1);
  root.addField(new GFFField(GFFDataType.CHAR, 'OpenLockDiffMod')).setValue(1);
  root.addField(new GFFField(GFFDataType.WORD, 'PortraitId')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectable')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectDC')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapDisarmable')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'DisarmDC')).setValue(28);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapFlag')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapOneShot')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapType')).setValue(2);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'KeyName')).setValue('keyname');
  root.addField(new GFFField(GFFDataType.BYTE, 'AnimationState')).setValue(1);
  root.addField(new GFFField(GFFDataType.DWORD, 'Appearance')).setValue(1);
  root.addField(new GFFField(GFFDataType.SHORT, 'HP')).setValue(20);
  root.addField(new GFFField(GFFDataType.SHORT, 'CurrentHP')).setValue(60);
  root.addField(new GFFField(GFFDataType.BYTE, 'Hardness')).setValue(5);
  root.addField(new GFFField(GFFDataType.BYTE, 'Fort')).setValue(28);
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
  root.addField(new GFFField(GFFDataType.RESREF, 'OnTrapTriggered')).setValue('ontraptriggered');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnUnlock')).setValue('onunlock');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnUserDefined')).setValue('onuserdefined');
  root.addField(new GFFField(GFFDataType.WORD, 'LoadScreenID')).setValue(0);
  root.addField(new GFFField(GFFDataType.BYTE, 'GenericType')).setValue(110);
  root.addField(new GFFField(GFFDataType.BYTE, 'Static')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'OpenState')).setValue(1);
  root.addField(new GFFField(GFFDataType.RESREF, 'OnClick')).setValue('onclick');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnFailToOpen')).setValue('onfailtoopen');
  root.addField(new GFFField(GFFDataType.BYTE, 'PaletteID')).setValue(1);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment')).setValue('abcdefg');

  return gff;
}

function validateDoor(door: ForgeDoor): void {
  expect(door.tag).toBe('TelosDoor13');
  expect(door.locName.getRESREF()).toBe(123731);
  expect(door.description.getRESREF()).toBe(-1);
  expect(door.templateResRef).toBe('door_tel014');
  expect(door.autoRemoveKey).toBe(true);
  expect(door.closeLockDC).toBe(0);
  expect(door.conversation).toBe('convoresref');
  expect(door.interruptable).toBe(true);
  expect(door.factionId).toBe(1);
  expect(door.plot).toBe(true);
  expect(door.notBlastable).toBe(true);
  expect(door.min1HP).toBe(true);
  expect(door.keyRequired).toBe(true);
  expect(door.lockable).toBe(true);
  expect(door.locked).toBe(true);
  expect(door.openLockDC).toBe(28);
  expect(door.openLockDiff).toBe(1);
  expect(door.openLockDiffMod).toBe(1);
  expect(door.portraitId).toBe(0);
  expect(door.trapDetectable).toBe(true);
  expect(door.trapDetectDC).toBe(0);
  expect(door.trapDisarmable).toBe(true);
  expect(door.disarmDC).toBe(28);
  expect(door.trapFlag).toBe(false);
  expect(door.trapOneShot).toBe(true);
  expect(door.trapType).toBe(2);
  expect(door.keyName).toBe('keyname');
  expect(door.animationState).toBe(1);
  expect(door.appearance).toBe(1);
  expect(door.hp).toBe(20);
  expect(door.currentHP).toBe(60);
  expect(door.hardness).toBe(5);
  expect(door.fort).toBe(28);
  expect(door.ref).toBe(0);
  expect(door.will).toBe(0);
  expect(door.onClosed).toBe('onclosed');
  expect(door.onDamaged).toBe('ondamaged');
  expect(door.onDeath).toBe('ondeath');
  expect(door.onDisarm).toBe('ondisarm');
  expect(door.onHeartbeat).toBe('onheartbeat');
  expect(door.onLock).toBe('onlock');
  expect(door.onMeleeAttacked).toBe('onmeleeattacked');
  expect(door.onOpen).toBe('onopen');
  expect(door.onSpellCastAt).toBe('onspellcastat');
  expect(door.onTrapTriggered).toBe('ontraptriggered');
  expect(door.onUnlock).toBe('onunlock');
  expect(door.onUserDefined).toBe('onuserdefined');
  expect(door.loadScreenID).toBe(0);
  expect(door.genericType).toBe(110);
  expect(door.static).toBe(true);
  expect(door.openState).toBe(1);
  expect(door.onClick).toBe('onclick');
  expect(door.onFailToOpen).toBe('onfailtoopen');
  expect(door.paletteID).toBe(1);
  expect(door.comment).toBe('abcdefg');
}

describe('ForgeDoor (UTD)', () => {
  it('loadFromBlueprint parses the vendor-style UTD fixture', () => {
    const door = new ForgeDoor();
    door.blueprint = buildDoorGff();
    door.loadFromBlueprint();
    validateDoor(door);
  });

  it('exportToBlueprint round-trips UTD fields', () => {
    const door = new ForgeDoor();
    door.blueprint = buildDoorGff();
    door.loadFromBlueprint();

    const roundTripped = new ForgeDoor();
    roundTripped.blueprint = door.exportToBlueprint();
    roundTripped.loadFromBlueprint();

    validateDoor(roundTripped);
  });

  it('binary round-trip preserves UTD data', () => {
    const door = new ForgeDoor();
    door.blueprint = buildDoorGff();
    door.loadFromBlueprint();

    const binary = door.exportToBlueprint().getExportBuffer();
    const roundTripped = new ForgeDoor(binary);

    validateDoor(roundTripped);
  });

  it('missing fields use defaults', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTD ';
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('only_tag');

    const door = new ForgeDoor();
    door.blueprint = gff;
    door.loadFromBlueprint();

    expect(door.tag).toBe('only_tag');
    expect(door.templateResRef).toBe('');
    expect(door.conversation).toBe('');
    expect(door.plot).toBe(false);
    expect(door.notBlastable).toBe(false);
    expect(door.lockable).toBe(false);
    expect(door.locked).toBe(false);
    expect(door.openLockDC).toBe(0);
    expect(door.openLockDiff).toBe(0);
    expect(door.openLockDiffMod).toBe(0);
    expect(door.hp).toBe(0);
    expect(door.comment).toBe('');
  });
});
