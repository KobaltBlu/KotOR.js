import { describe, expect, it, jest } from '@jest/globals';

import { CExoLocString } from '@/resource/CExoLocString';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { EditorFile } from '@/apps/forge/EditorFile';
import { TabAREEditorState } from '@/apps/forge/states/tabs/TabAREEditorState';

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
      return this.resref && this.ext ? `${this.resref}.${this.ext}` : 'mock.are';
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

jest.mock('@/apps/forge/components/tabs/tab-are-editor/TabAREEditor', () => ({
  TabAREEditor: function TabAREEditor() {
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
      are: 2012,
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

function buildAreGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'ARE ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Name')).setCExoLocString(new CExoLocString(75101));
  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('tar_m03aa');
  root.addField(new GFFField(GFFDataType.RESREF, 'OnEnter')).setValue('k_tar_enter');
  root.addField(new GFFField(GFFDataType.FLOAT, 'NorthAxis')).setValue(0);
  root.addField(new GFFField(GFFDataType.WORD, 'Flags')).setValue(1);

  const rooms = new GFFField(GFFDataType.LIST, 'Rooms');
  const room = new GFFStruct(0);
  room.addField(new GFFField(GFFDataType.RESREF, 'RoomName')).setValue('m03aa_01a');
  rooms.addChildStruct(room);
  root.addField(rooms);

  return gff;
}

describe('TabAREEditorState', () => {
  it('openFile loads the ARE gff and updates tab metadata', async () => {
    const buffer = buildAreGff().getExportBuffer();
    const file = new EditorFile({
      resref: 'tar_m03aa',
      ext: 'are',
      reskey: 2012,
      buffer,
    });

    const state = new TabAREEditorState({ editorFile: file });
    await state.openFile();

    expect(state.tabName).toBe('tar_m03aa.are');
    expect(state.are?.FileType).toBe('ARE ');
    expect(state.getResourceID()).toBe('tar_m03aa2012');
  });

  it('setActiveTab updates state and emits the new tab key', () => {
    const state = new TabAREEditorState();
    const listener = jest.fn();
    state.addEventListener('onTabChange', listener);

    state.setActiveTab('map');

    expect(state.activeTab).toBe('map');
    expect(listener).toHaveBeenCalledWith('map');
  });

  it('getExportBuffer round-trips the current ARE data', async () => {
    const state = new TabAREEditorState();
    state.are = buildAreGff();

    const buffer = await state.getExportBuffer();
    const roundTripped = new GFFObject(buffer);
    const rooms = roundTripped.RootNode.getFieldByLabel('Rooms').getChildStructs();

    expect(roundTripped.FileType).toBe('ARE ');
    expect(roundTripped.RootNode.getFieldByLabel('Tag').getValue()).toBe('tar_m03aa');
    expect(roundTripped.RootNode.getFieldByLabel('OnEnter').getValue()).toBe('k_tar_enter');
    expect(rooms).toHaveLength(1);
    expect(rooms[0].getFieldByLabel('RoomName').getValue()).toBe('m03aa_01a');
  });

  it('returns an empty buffer when no ARE is loaded', async () => {
    const state = new TabAREEditorState();
    await expect(state.getExportBuffer()).resolves.toEqual(new Uint8Array(0));
  });
});
