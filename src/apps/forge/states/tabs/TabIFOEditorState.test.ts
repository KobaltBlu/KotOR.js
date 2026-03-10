import { describe, expect, it, jest } from '@jest/globals';

import { CExoLocString } from '@/resource/CExoLocString';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { EditorFile } from '@/apps/forge/EditorFile';
import { TabIFOEditorState } from '@/apps/forge/states/tabs/TabIFOEditorState';

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
      return this.resref && this.ext ? `${this.resref}.${this.ext}` : 'mock.ifo';
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

jest.mock('@/apps/forge/components/tabs/tab-ifo-editor/TabIFOEditor', () => ({
  TabIFOEditor: function TabIFOEditor() {
    return null;
  },
}));

jest.mock('@/apps/forge/ForgeFileSystem', () => ({
  supportedFileDialogTypes: [],
  supportedFilePickerTypes: [],
}));

jest.mock('@/apps/forge/KotOR', () => {
  const { CExoLocString } = require('@/resource/CExoLocString');
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
    CExoLocString,
    GFFDataType,
    GFFField,
    GFFObject,
    GFFStruct,
    ResourceTypes: {
      ifo: 2014,
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

function buildIfoGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'IFO ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.VOID, 'Mod_ID')).setValue(Uint8Array.from([82, 58, 229, 158]));
  root.addField(new GFFField(GFFDataType.INT, 'Mod_Creator_ID')).setValue(2);
  root.addField(new GFFField(GFFDataType.DWORD, 'Mod_Version')).setValue(3);
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Mod_VO_ID')).setValue('262');
  root.addField(new GFFField(GFFDataType.WORD, 'Expansion_Pack')).setValue(0);
  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name')).setCExoLocString(new CExoLocString(83947));
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag')).setValue('262TEL');
  root.addField(new GFFField(GFFDataType.RESREF, 'Mod_Entry_Area')).setValue('262tel');
  root.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_X')).setValue(2.5811009407043457);
  root.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Y')).setValue(41.46979522705078);
  root.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Z')).setValue(21.372770309448242);
  root.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnHeartbeat')).setValue('heartbeat');
  root.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnModLoad')).setValue('load');

  const areas = new GFFField(GFFDataType.LIST, 'Mod_Area_list');
  const area = new GFFStruct(6);
  area.addField(new GFFField(GFFDataType.RESREF, 'Area_Name')).setValue('262tel');
  areas.addChildStruct(area);
  root.addField(areas);

  return gff;
}

describe('TabIFOEditorState', () => {
  it('openFile loads the IFO gff and updates tab metadata', async () => {
    const buffer = buildIfoGff().getExportBuffer();
    const file = new EditorFile({
      resref: 'module',
      ext: 'ifo',
      reskey: 2014,
      buffer,
    });

    const state = new TabIFOEditorState({ editorFile: file });
    await state.openFile();

    expect(state.tabName).toBe('module.ifo');
    expect(state.ifo?.FileType).toBe('IFO ');
    expect(state.getResourceID()).toBe('module2014');
  });

  it('setActiveTab updates state and emits the new tab key', () => {
    const state = new TabIFOEditorState();
    const listener = jest.fn();
    state.addEventListener('onTabChange', listener);

    state.setActiveTab('scripts');

    expect(state.activeTab).toBe('scripts');
    expect(listener).toHaveBeenCalledWith('scripts');
  });

  it('getExportBuffer round-trips the current IFO data', async () => {
    const state = new TabIFOEditorState();
    state.ifo = buildIfoGff();

    const buffer = await state.getExportBuffer();
    const roundTripped = new GFFObject(buffer);
    const areas = roundTripped.RootNode.getFieldByLabel('Mod_Area_list').getChildStructs();

    expect(roundTripped.FileType).toBe('IFO ');
    expect(roundTripped.RootNode.getFieldByLabel('Mod_Tag').getValue()).toBe('262TEL');
    expect(roundTripped.RootNode.getFieldByLabel('Mod_Entry_Area').getValue()).toBe('262tel');
    expect(areas).toHaveLength(1);
    expect(areas[0].getFieldByLabel('Area_Name').getValue()).toBe('262tel');
  });

  it('returns an empty buffer when no IFO is loaded', async () => {
    const state = new TabIFOEditorState();
    await expect(state.getExportBuffer()).resolves.toEqual(new Uint8Array(0));
  });
});
