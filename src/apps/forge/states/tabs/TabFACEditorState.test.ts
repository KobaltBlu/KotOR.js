import { describe, expect, it, jest } from '@jest/globals';

import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { EditorFile } from '@/apps/forge/EditorFile';
import { TabFACEditorState } from '@/apps/forge/states/tabs/TabFACEditorState';

jest.mock('@/apps/forge/EditorFile', () => ({
  EditorFile: class EditorFile {
    resref?: string;
    reskey?: string;
    ext?: string;
    buffer?: Uint8Array;

    constructor(options: any = {}) {
      Object.assign(this, options);
    }

    addEventListener() {}

    getFilename() {
      return this.resref && this.ext ? `${this.resref}.${this.ext}` : 'mock.fac';
    }

    async readFile() {
      return { buffer: this.buffer ?? new Uint8Array(0) };
    }
  },
}));

jest.mock('@/apps/forge/managers/EditorTabManager', () => ({
  EditorTabManager: class EditorTabManager {
    static __tabId = 0;

    static GetNewTabID() {
      return this.__tabId++;
    }
  },
}));

jest.mock('@/apps/forge/components/tabs/tab-fac-editor/TabFACEditor', () => ({
  TabFACEditor: function TabFACEditor() {
    return null;
  },
}));

jest.mock('@/apps/forge/ForgeFileSystem', () => ({
  supportedFileDialogTypes: [],
  supportedFilePickerTypes: [],
}));

jest.mock('@/apps/forge/KotOR', () => {
  const { GFFDataType } = require('@/enums/resource/GFFDataType');
  const { GFFField } = require('@/resource/GFFField');
  const { GFFObject } = require('@/resource/GFFObject');
  const { GFFStruct } = require('@/resource/GFFStruct');

  return {
    ApplicationEnvironment: {
      ELECTRON: 'electron',
      WEB: 'web',
    },
    ApplicationProfile: {
      ENV: 'web',
    },
    GFFDataType,
    GFFField,
    GFFObject,
    GFFStruct,
    ResourceTypes: {
      fac: 2005,
      getKeyByValue: jest.fn(),
    },
  };
});

jest.mock('@/utility/Logger', () => ({
  LogScope: {
    Forge: 'Forge',
  },
  createScopedLogger: () => ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

function buildFacGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'FAC ';
  const root = gff.RootNode;

  const factions = new GFFField(GFFDataType.LIST, 'FactionList');
  const pc = new GFFStruct(0);
  pc.addField(new GFFField(GFFDataType.CEXOSTRING, 'FactionName')).setValue('PC');
  pc.addField(new GFFField(GFFDataType.WORD, 'FactionGlobal')).setValue(0);
  pc.addField(new GFFField(GFFDataType.DWORD, 'FactionParentID')).setValue(0xffffffff);
  factions.addChildStruct(pc);

  const hostile = new GFFStruct(0);
  hostile.addField(new GFFField(GFFDataType.CEXOSTRING, 'FactionName')).setValue('Hostile');
  hostile.addField(new GFFField(GFFDataType.WORD, 'FactionGlobal')).setValue(1);
  hostile.addField(new GFFField(GFFDataType.DWORD, 'FactionParentID')).setValue(0xffffffff);
  factions.addChildStruct(hostile);

  root.addField(factions);

  const reputations = new GFFField(GFFDataType.LIST, 'RepList');
  const rep = new GFFStruct(0);
  rep.addField(new GFFField(GFFDataType.DWORD, 'FactionID1')).setValue(1);
  rep.addField(new GFFField(GFFDataType.DWORD, 'FactionID2')).setValue(0);
  rep.addField(new GFFField(GFFDataType.DWORD, 'FactionRep')).setValue(5);
  reputations.addChildStruct(rep);
  root.addField(reputations);

  return gff;
}

describe('TabFACEditorState', () => {
  it('openFile loads the FAC gff and updates tab metadata', async () => {
    const buffer = buildFacGff().getExportBuffer();
    const file = new EditorFile({
      resref: 'globalfac',
      ext: 'fac',
      reskey: 2005,
      buffer,
    });

    const state = new TabFACEditorState({ editorFile: file });
    await state.openFile();

    expect(state.tabName).toBe('globalfac.fac');
    expect(state.fac?.FileType).toBe('FAC ');
    expect(state.getResourceID()).toBe('globalfac2005');
  });

  it('selectFaction tracks the selected faction struct and index', () => {
    const state = new TabFACEditorState();
    state.fac = buildFacGff();

    const faction = state.fac.RootNode.getFieldByLabel('FactionList').getChildStructs()[1];
    state.selectFaction(faction, 1);

    expect(state.selectedFaction).toBe(faction);
    expect(state.selectedFactionIndex).toBe(1);
    expect(faction.getFieldByLabel('FactionName').getValue()).toBe('Hostile');
  });

  it('getExportBuffer round-trips the current FAC data', async () => {
    const state = new TabFACEditorState();
    state.fac = buildFacGff();

    const buffer = await state.getExportBuffer();
    const roundTripped = new GFFObject(buffer);
    const factions = roundTripped.RootNode.getFieldByLabel('FactionList').getChildStructs();
    const reputations = roundTripped.RootNode.getFieldByLabel('RepList').getChildStructs();

    expect(roundTripped.FileType).toBe('FAC ');
    expect(factions).toHaveLength(2);
    expect(factions[0].getFieldByLabel('FactionName').getValue()).toBe('PC');
    expect(reputations[0].getFieldByLabel('FactionRep').getValue()).toBe(5);
  });

  it('returns an empty buffer when no FAC is loaded', async () => {
    const state = new TabFACEditorState();
    await expect(state.getExportBuffer()).resolves.toEqual(new Uint8Array(0));
  });
});
