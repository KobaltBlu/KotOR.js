import { describe, expect, it, jest } from '@jest/globals';

import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { EditorFile } from '@/apps/forge/EditorFile';
import { TabDLGEditorState } from '@/apps/forge/states/tabs/TabDLGEditorState';

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
      return this.resref && this.ext ? `${this.resref}.${this.ext}` : 'mock.dlg';
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

jest.mock('@/apps/forge/components/tabs/tab-dlg-editor/TabDLGEditor', () => ({
  TabDLGEditor: function TabDLGEditor() {
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

  class MockDLGObject {
    gff: GFFObject;
    entryList: any[];
    replyList: any[];
    startingList: any[];

    constructor(gff: GFFObject) {
      this.gff = gff;
      this.entryList = [];
      this.replyList = [];
      this.startingList = [];
    }

    static FromGFFObject(gff: GFFObject) {
      return new MockDLGObject(gff);
    }
  }

  return {
    ApplicationEnvironment: {
      ELECTRON: 'electron',
      WEB: 'web',
    },
    ApplicationProfile: {
      ENV: 'web',
    },
    DLGObject: MockDLGObject,
    GFFDataType,
    GFFField,
    GFFObject,
    GFFStruct,
    ResourceTypes: {
      dlg: 2029,
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

function buildDlgGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'DLG ';
  const root = gff.RootNode;

  root.addField(new GFFField(GFFDataType.CEXOSTRING, 'VO_ID')).setValue('tar03');
  root.addField(new GFFField(GFFDataType.BYTE, 'ConversationType')).setValue(0);

  root.addField(new GFFField(GFFDataType.LIST, 'EntryList'));
  root.addField(new GFFField(GFFDataType.LIST, 'ReplyList'));

  const startingList = new GFFField(GFFDataType.LIST, 'StartingList');
  const startingNode = new GFFStruct(0);
  startingNode.addField(new GFFField(GFFDataType.INT, 'Index')).setValue(0);
  startingList.addChildStruct(startingNode);
  root.addField(startingList);

  return gff;
}

describe('TabDLGEditorState', () => {
  it('openFile loads the dialog object and updates tab metadata', async () => {
    const buffer = buildDlgGff().getExportBuffer();
    const file = new EditorFile({
      resref: 'tar03_dialog',
      ext: 'dlg',
      reskey: 2029,
      buffer,
    });

    const state = new TabDLGEditorState({ editorFile: file });
    await state.openFile();

    expect(state.tabName).toBe('tar03_dialog.dlg');
    expect(state.dlg?.gff.FileType).toBe('DLG ');
    expect(state.getResourceID()).toBe('tar03_dialog2029');
  });

  it('selectNode tracks the selected node, index, and type', () => {
    const state = new TabDLGEditorState();
    const listener = jest.fn();
    const node = { text: 'Mock line' } as any;
    state.addEventListener('onNodeSelected', listener);

    state.selectNode(node, 2, 'entry');

    expect(state.selectedNode).toBe(node);
    expect(state.selectedNodeIndex).toBe(2);
    expect(state.selectedNodeType).toBe('entry');
    expect(listener).toHaveBeenCalledWith(node, 2, 'entry');
  });

  it('getExportBuffer round-trips the current dialog gff', async () => {
    const state = new TabDLGEditorState();
    state.dlg = { gff: buildDlgGff() } as any;

    const buffer = await state.getExportBuffer();
    const roundTripped = new GFFObject(buffer);

    expect(roundTripped.FileType).toBe('DLG ');
    expect(roundTripped.RootNode.getFieldByLabel('VO_ID').getValue()).toBe('tar03');
    expect(roundTripped.RootNode.getFieldByLabel('StartingList').getChildStructs()).toHaveLength(1);
  });

  it('returns an empty buffer when no dialog is loaded', async () => {
    const state = new TabDLGEditorState();
    await expect(state.getExportBuffer()).resolves.toEqual(new Uint8Array(0));
  });
});
