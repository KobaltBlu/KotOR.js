import { describe, expect, it, jest } from '@jest/globals';

import { CExoLocString } from '@/resource/CExoLocString';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { ForgeTrigger } from '@/apps/forge/module-editor/ForgeTrigger';

jest.mock('@/apps/forge/UI3DRenderer', () => ({
  GroupType: {
    Trigger: 'Trigger',
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
      utt: 2045,
    },
    ResourceLoader: {
      loadResource: jest.fn(),
    },
  };
});

function buildTriggerGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTT ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('GenericTrigger001');
  root.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('generictrigge001');
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName')).setCExoLocString(new CExoLocString(42968));
  root.addField(new GFFField(GFFDataType.BYTE, 'AutoRemoveKey')).setValue(1);
  root.addField(new GFFField(GFFDataType.DWORD, 'Faction')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'Cursor')).setValue(1);
  root.addField(new GFFField(GFFDataType.FLOAT, 'HighlightHeight')).setValue(3.0);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'KeyName')).setValue('somekey');
  root.addField(new GFFField(GFFDataType.WORD, 'LoadScreenID')).setValue(0);
  root.addField(new GFFField(GFFDataType.WORD, 'PortraitId')).setValue(0);
  root.addField(new GFFField(GFFDataType.INT, 'Type')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectable')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectDC')).setValue(10);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapDisarmable')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'DisarmDC')).setValue(10);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapFlag')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapOneShot')).setValue(1);
  root.addField(new GFFField(GFFDataType.BYTE, 'TrapType')).setValue(1);
  root.addField(new GFFField(GFFDataType.RESREF, 'OnDisarm')).setValue('ondisarm');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnTrapTriggered')).setValue('ontraptriggered');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnClick')).setValue('onclick');
  root.addField(new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat')).setValue('onheartbeat');
  root.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnEnter')).setValue('onenter');
  root.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnExit')).setValue('onexit');
  root.addField(new GFFField(GFFDataType.RESREF, 'ScriptUserDefine')).setValue('onuserdefined');
  root.addField(new GFFField(GFFDataType.BYTE, 'PaletteID')).setValue(6);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment')).setValue('comment');

  return gff;
}

function validateTrigger(trigger: ForgeTrigger): void {
  expect(trigger.tag).toBe('GenericTrigger001');
  expect(trigger.templateResRef).toBe('generictrigge001');
  expect(trigger.localizedName.getRESREF()).toBe(42968);
  expect(trigger.autoRemoveKey).toBe(true);
  expect(trigger.faction).toBe(1);
  expect(trigger.cursor).toBe(1);
  expect(trigger.highlightHeight).toBeCloseTo(3.0);
  expect(trigger.keyName).toBe('somekey');
  expect(trigger.loadScreenID).toBe(0);
  expect(trigger.portraitId).toBe(0);
  expect(trigger.t_type).toBe(1);
  expect(trigger.trapDetectable).toBe(true);
  expect(trigger.trapDetectDC).toBe(10);
  expect(trigger.trapDisarmable).toBe(true);
  expect(trigger.disarmDC).toBe(10);
  expect(trigger.trapFlag).toBe(true);
  expect(trigger.trapOneShot).toBe(true);
  expect(trigger.trapType).toBe(1);
  expect(trigger.onDisarm).toBe('ondisarm');
  expect(trigger.onTrapTriggered).toBe('ontraptriggered');
  expect(trigger.onClick).toBe('onclick');
  expect(trigger.onHeartbeat).toBe('onheartbeat');
  expect(trigger.onEnter).toBe('onenter');
  expect(trigger.onExit).toBe('onexit');
  expect(trigger.onUserDefined).toBe('onuserdefined');
  expect(trigger.paletteID).toBe(6);
  expect(trigger.comment).toBe('comment');
}

describe('ForgeTrigger (UTT)', () => {
  it('loadFromBlueprint parses the vendor-style UTT fixture', () => {
    const trigger = new ForgeTrigger();
    trigger.blueprint = buildTriggerGff();
    trigger.loadFromBlueprint();
    validateTrigger(trigger);
  });

  it('exportToBlueprint round-trips UTT fields', () => {
    const trigger = new ForgeTrigger();
    trigger.blueprint = buildTriggerGff();
    trigger.loadFromBlueprint();

    const roundTripped = new ForgeTrigger();
    roundTripped.blueprint = trigger.exportToBlueprint();
    roundTripped.loadFromBlueprint();

    validateTrigger(roundTripped);
  });

  it('binary round-trip preserves UTT data', () => {
    const trigger = new ForgeTrigger();
    trigger.blueprint = buildTriggerGff();
    trigger.loadFromBlueprint();

    const binary = trigger.exportToBlueprint().getExportBuffer();
    const roundTripped = new ForgeTrigger(binary);

    validateTrigger(roundTripped);
  });

  it('missing fields use defaults', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTT ';
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('only_tag');

    const trigger = new ForgeTrigger();
    trigger.blueprint = gff;
    trigger.loadFromBlueprint();

    expect(trigger.tag).toBe('only_tag');
    expect(trigger.templateResRef).toBe('');
    expect(trigger.autoRemoveKey).toBe(false);
    expect(trigger.highlightHeight).toBe(0);
    expect(trigger.onHeartbeat).toBe('');
    expect(trigger.onUserDefined).toBe('');
    expect(trigger.trapDetectable).toBe(false);
    expect(trigger.trapDisarmable).toBe(false);
    expect(trigger.comment).toBe('');
  });
});
