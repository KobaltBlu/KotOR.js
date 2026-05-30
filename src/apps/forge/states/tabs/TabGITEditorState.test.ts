import { describe, expect, it, jest } from '@jest/globals';

import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { EditorFile } from '@/apps/forge/EditorFile';
import { TabGITEditorState } from '@/apps/forge/states/tabs/TabGITEditorState';

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
      return this.resref && this.ext ? `${this.resref}.${this.ext}` : 'mock.git';
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

jest.mock('@/apps/forge/components/tabs/tab-git-editor/TabGITEditor', () => ({
  TabGITEditor: function TabGITEditor() {
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
      git: 2023,
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

function buildGitGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'GIT ';
  const root = gff.RootNode;

  const doors = new GFFField(GFFDataType.LIST, 'Door List');

  const firstDoor = new GFFStruct(8);
  firstDoor.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('door_a');
  firstDoor.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('door_a');
  firstDoor.addField(new GFFField(GFFDataType.FLOAT, 'XPosition')).setValue(1);
  firstDoor.addField(new GFFField(GFFDataType.FLOAT, 'YPosition')).setValue(2);
  firstDoor.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).setValue(3);
  firstDoor.addField(new GFFField(GFFDataType.FLOAT, 'Bearing')).setValue(0.25);
  doors.addChildStruct(firstDoor);

  const secondDoor = new GFFStruct(8);
  secondDoor.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('door_b');
  secondDoor.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('door_b');
  secondDoor.addField(new GFFField(GFFDataType.FLOAT, 'XPosition')).setValue(4);
  secondDoor.addField(new GFFField(GFFDataType.FLOAT, 'YPosition')).setValue(5);
  secondDoor.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).setValue(6);
  secondDoor.addField(new GFFField(GFFDataType.FLOAT, 'Bearing')).setValue(0.75);
  doors.addChildStruct(secondDoor);

  root.addField(doors);
  return gff;
}

function getDoorList(state: TabGITEditorState): GFFStruct[] {
  return state.git!.RootNode.getFieldByLabel('Door List').getChildStructs();
}

describe('TabGITEditorState', () => {
  it('openFile loads the GIT gff and updates tab metadata', async () => {
    const buffer = buildGitGff().getExportBuffer();
    const file = new EditorFile({
      resref: 'm03aa',
      ext: 'git',
      reskey: 2023,
      buffer,
    });

    const state = new TabGITEditorState({ editorFile: file });
    await state.openFile();

    expect(state.tabName).toBe('m03aa.git');
    expect(state.git?.FileType).toBe('GIT ');
    expect(state.getResourceID()).toBe('m03aa2023');
  });

  it('addInstanceFromBlueprint creates canonical fields and selects the new instance', () => {
    const state = new TabGITEditorState();
    state.git = buildGitGff();

    expect(state.addInstanceFromBlueprint('wp_new', 'utw')).toBe(true);

    const waypoints = state.git.RootNode.getFieldByLabel('WaypointList').getChildStructs();
    expect(waypoints).toHaveLength(1);
    expect(state.selectedInstance).toBe(waypoints[0]);
    expect(state.selectedInstanceType).toBe('WaypointList');
    expect(state.selectedInstanceIndex).toBe(0);
    expect(waypoints[0].getFieldByLabel('TemplateResRef').getValue()).toBe('wp_new');
    expect(waypoints[0].getFieldByLabel('Tag').getValue()).toBe('wp_new');
    expect(waypoints[0].getFieldByLabel('Bearing').getValue()).toBe(0);
  });

  it('duplicateSelectedInstance clones the struct and rewrites the duplicated tag', () => {
    const state = new TabGITEditorState();
    state.git = buildGitGff();

    const doors = getDoorList(state);
    state.selectInstance(doors[0], 'Door List', 0);

    expect(state.duplicateSelectedInstance()).toBe(true);

    const updatedDoors = getDoorList(state);
    expect(updatedDoors).toHaveLength(3);
    expect(state.selectedInstanceIndex).toBe(1);
    expect(updatedDoors[1].getFieldByLabel('TemplateResRef').getValue()).toBe('door_a');
    expect(updatedDoors[1].getFieldByLabel('Tag').getValue()).toBe('door_a_copy');
  });

  it('moveSelectedInstanceDown and deleteSelectedInstance preserve ordering and selection', () => {
    const state = new TabGITEditorState();
    state.git = buildGitGff();

    const doors = getDoorList(state);
    state.selectInstance(doors[0], 'Door List', 0);

    expect(state.moveSelectedInstanceDown()).toBe(true);
    expect(getDoorList(state).map((door) => door.getFieldByLabel('Tag').getValue())).toEqual(['door_b', 'door_a']);
    expect(state.selectedInstanceIndex).toBe(1);

    expect(state.deleteSelectedInstance()).toBe(true);
    expect(getDoorList(state).map((door) => door.getFieldByLabel('Tag').getValue())).toEqual(['door_b']);
    expect(state.selectedInstanceIndex).toBe(0);
    expect(state.selectedInstance?.getFieldByLabel('Tag').getValue()).toBe('door_b');
  });
});
