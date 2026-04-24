import * as THREE from 'three';
import { describe, expect, it, jest } from '@jest/globals';

import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { EditorFile } from '@/apps/forge/EditorFile';
import { TabGUIEditorState } from '@/apps/forge/states/tabs/TabGUIEditorState';

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
      return this.resref && this.ext ? `${this.resref}.${this.ext}` : 'mock.gui';
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

jest.mock('@/apps/forge/components/tabs/tab-gui-editor/TabGUIEditor', () => ({
  TabGUIEditor: function TabGUIEditor() {
    return null;
  },
}));

jest.mock('@/apps/forge/ForgeFileSystem', () => ({
  supportedFileDialogTypes: [],
  supportedFilePickerTypes: [],
}));

jest.mock('@/apps/forge/UI3DRenderer', () => {
  const THREE = require('three');

  class MockUI3DRenderer {
    scene = {
      add: jest.fn(),
    };
    guiMode = false;
    enabled = false;
    addEventListener = jest.fn();
    render = jest.fn();
  }

  return {
    UI3DRenderer: MockUI3DRenderer,
  };
});

jest.mock('@/apps/forge/KotOR', () => {
  const { GFFDataType } = require('@/enums/resource/GFFDataType');
  const { GFFField } = require('@/resource/GFFField');
  const { GFFObject } = require('@/resource/GFFObject');

  class MockGameMenu {
    voidFill = false;
    bVisible = false;
    context: any;
    tGuiPanel = {
      widget: new THREE.Group(),
    };
    loadBackground = jest.fn(async () => true);
    buildMenu = jest.fn(async (_gff: GFFObject) => true);
    update = jest.fn();
  }

  return {
    ApplicationEnvironment: {
      ELECTRON: 'electron',
      WEB: 'web',
    },
    ApplicationProfile: {
      ENV: 'web',
    },
    GameMenu: MockGameMenu,
    GFFDataType,
    GFFField,
    GFFObject,
  };
});

function buildGuiGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'GUI ';
  gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'SCREEN')).setValue('inventory');
  return gff;
}

describe('TabGUIEditorState', () => {
  it('openFile loads the GUI gff, builds the menu, and updates tab metadata', async () => {
    const buffer = buildGuiGff().getExportBuffer();
    const file = new EditorFile({
      resref: 'inventory_p',
      ext: 'gui',
      reskey: 2047,
      buffer,
    });

    const state = new TabGUIEditorState({ editorFile: file });
    await state.openFile(file);

    expect(state.tabName).toBe('inventory_p.gui');
    expect(state.gff.FileType).toBe('GUI ');
    expect(state.menu.loadBackground).toHaveBeenCalled();
    expect(state.menu.buildMenu).toHaveBeenCalledWith(state.gff);
    expect(state.ui3DRenderer.scene.add).toHaveBeenCalledWith(state.menu.tGuiPanel.widget);
  });

  it('show and hide toggle renderer state and trigger a render on show', () => {
    // TabState.show/hide uses window.addEventListener and requires an attached tab manager.
    // Provide a minimal global window stub for the Node test environment.
    const origWindow = (global as any).window;
    (global as any).window = { addEventListener: jest.fn(), removeEventListener: jest.fn() };

    const mockTabManager = {
      hideAll: jest.fn(),
      currentTab: null as any,
      triggerEventListener: jest.fn(),
      removeTab: jest.fn(),
    };

    const state = new TabGUIEditorState();
    state.attach(mockTabManager as any);

    state.show();
    expect(state.ui3DRenderer.enabled).toBe(true);
    expect(state.ui3DRenderer.render).toHaveBeenCalled();
    expect(mockTabManager.hideAll).toHaveBeenCalled();

    state.hide();
    expect(state.ui3DRenderer.enabled).toBe(false);

    // Restore global
    (global as any).window = origWindow;
  });

  it('animate updates the menu and emits the animation delta', () => {
    const state = new TabGUIEditorState();
    const listener = jest.fn();
    state.menu = new (require('@/apps/forge/KotOR').GameMenu)();
    state.addEventListener('onAnimate', listener);

    state.animate(0.5);

    expect(state.menu.update).toHaveBeenCalledWith(0.5);
    expect(listener).toHaveBeenCalledWith(0.5);
  });

  it('getExportBuffer round-trips the current GUI gff', async () => {
    const state = new TabGUIEditorState();
    state.gff = buildGuiGff();

    const buffer = await state.getExportBuffer();
    const roundTripped = new GFFObject(buffer);

    expect(roundTripped.FileType).toBe('GUI ');
    expect(roundTripped.RootNode.getFieldByLabel('SCREEN').getValue()).toBe('inventory');
  });
});
