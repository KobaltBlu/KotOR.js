import * as THREE from 'three';
import { describe, expect, it, jest } from '@jest/globals';

import { EditorFile } from '@/apps/forge/EditorFile';
import { INDOOR_DUPLICATE_OFFSET_X, INDOOR_DUPLICATE_OFFSET_Y, INDOOR_DUPLICATE_OFFSET_Z } from '@/apps/forge/data/IndoorBuilderConstants';
import { Kit, KitComponent, KitComponentHook, KitDoor } from '@/apps/forge/data/IndoorKit';
import { IndoorMapRoom } from '@/apps/forge/data/IndoorMap';
import { loadKits } from '@/apps/forge/data/IndoorKitLoader';
import { IndoorBuilderViewMode, TabIndoorBuilderState } from '@/apps/forge/states/tabs/TabIndoorBuilderState';

jest.mock('@/apps/forge/EditorFile', () => ({
  EditorFile: class EditorFile {
    resref?: string;
    ext?: string;
    buffer?: Uint8Array;
    unsaved_changes = false;

    constructor(options: any = {}) {
      Object.assign(this, options);
    }

    addEventListener() {}

    getFilename() {
      return this.resref && this.ext ? `${this.resref}.${this.ext}` : 'mock.indoor';
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

jest.mock('@/apps/forge/components/tabs/tab-indoor-builder/TabIndoorBuilder', () => ({
  TabIndoorBuilder: function TabIndoorBuilder() {
    return null;
  },
}));

jest.mock('@/apps/forge/ForgeFileSystem', () => ({
  supportedFileDialogTypes: [],
  supportedFilePickerTypes: [],
}));

jest.mock('@/apps/forge/KotOR', () => {
  const THREE = require('three');

  return {
    OdysseyWalkMesh: class OdysseyWalkMesh {
      mat4 = new THREE.Matrix4();
      geometry = { dispose: jest.fn() };
      mesh = { geometry: { dispose: jest.fn() }, material: {}, removeFromParent: jest.fn() };
      faces: any[] = [];
      vertices: any[] = [];

      constructor() {}

      toExportBuffer() {
        return new Uint8Array([1, 2, 3]);
      }

      updateMatrix() {}
      buildBufferedGeometry() {}
    },
  };
});

jest.mock('@/apps/forge/UI3DRenderer', () => ({
  UI3DRenderer: class UI3DRenderer {
    enabled = false;
    scene = { add: jest.fn() };
    render = jest.fn();
    destroy = jest.fn();
  },
}));

jest.mock('@/apps/forge/helpers/IndoorMap3DScene', () => ({
  IndoorMap3DScene: class IndoorMap3DScene {
    syncRooms = jest.fn(async () => undefined);
    dispose = jest.fn();
  },
}));

jest.mock('@/apps/forge/data/IndoorKitLoader', () => ({
  loadKits: jest.fn(async () => []),
}));

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

function createComponent(kitId = 'test_kit', componentId = 'room_a'): KitComponent {
  const kit = new Kit('Test Kit', kitId);
  const door = new KitDoor('door_k1', 'door_k2', new Uint8Array(0), new Uint8Array(0), 2, 3);
  kit.doors.push(door);

  const component = new KitComponent(
    kit,
    'Room A',
    componentId,
    { toExportBuffer: () => new Uint8Array([1, 2, 3]) } as any,
    new Uint8Array([1, 2, 3]),
    new Uint8Array([4]),
    new Uint8Array([5])
  );
  component.hooks.push(
    new KitComponentHook(new THREE.Vector3(0, 0, 0), 0, 0, door),
    new KitComponentHook(new THREE.Vector3(2, 0, 0), 90, 1, door)
  );
  kit.components.push(component);
  return component;
}

describe('TabIndoorBuilderState', () => {
  it('setKits keeps the embedded kit last and preserves an existing selection', () => {
    const component = createComponent();
    const state = new TabIndoorBuilderState();

    state.setKits([component.kit]);

    expect(state.kits).toHaveLength(2);
    expect(state.kits[0]).toBe(component.kit);
    expect(state.kits[1]).toBe(state.embeddedKit);
    expect(state.selectedKit).toBe(state.embeddedKit);
  });

  it('setKits chooses the first real kit when no kit is already selected', () => {
    const component = createComponent('fresh_kit', 'fresh_room');
    const state = new TabIndoorBuilderState();
    state.selectedKit = null;

    state.setKits([component.kit]);

    expect(state.selectedKit).toBe(component.kit);
  });

  it('loadKitsFromPath delegates to the loader and installs the returned kits', async () => {
    const component = createComponent('loaded_kit', 'loaded_room');
    (loadKits as jest.MockedFunction<typeof loadKits>).mockResolvedValueOnce([component.kit]);
    const state = new TabIndoorBuilderState();

    await state.loadKitsFromPath('C:/kits');

    expect(loadKits).toHaveBeenCalledWith('C:/kits');
    expect(state.kits[0]).toBe(component.kit);
    expect(state.kits.at(-1)).toBe(state.embeddedKit);
  });

  it('addRoomAt creates a room, selects it, marks the file dirty, and syncs 3D', async () => {
    const component = createComponent();
    const state = new TabIndoorBuilderState();
    const file = { unsaved_changes: false } as any;
    state.file = file;
    state.selectedComponent = component;

    state.addRoomAt(new THREE.Vector3(10, 20, 30));

    expect(state.map.rooms).toHaveLength(1);
    expect(state.selectedRooms).toHaveLength(1);
    expect(state.selectedRooms[0].component).toBe(component);
    expect(state.selectedRooms[0].position.toArray()).toEqual([10, 20, 30]);
    expect(file.unsaved_changes).toBe(true);
    expect((state.scene3D.syncRooms as jest.Mock)).toHaveBeenCalledWith(state.map.rooms);
  });

  it('duplicateSelectedRooms offsets clones and deleteSelectedRooms removes them cleanly', () => {
    const component = createComponent();
    const state = new TabIndoorBuilderState();
    state.file = { unsaved_changes: false } as any;
    state.selectedComponent = component;
    state.addRoomAt(new THREE.Vector3(1, 2, 3));

    const original = state.selectedRooms[0];
    state.duplicateSelectedRooms();

    expect(state.map.rooms).toHaveLength(2);
    expect(state.selectedRooms).toHaveLength(1);
    const clone = state.selectedRooms[0];
    expect(clone).not.toBe(original);
    expect(clone.position.toArray()).toEqual([
      1 + INDOOR_DUPLICATE_OFFSET_X,
      2 + INDOOR_DUPLICATE_OFFSET_Y,
      3 + INDOOR_DUPLICATE_OFFSET_Z,
    ]);

    state.deleteSelectedRooms();

    expect(state.map.rooms).toHaveLength(1);
    expect(state.selectedRooms).toHaveLength(0);
    expect(state.map.rooms[0]).toBe(original);
  });

  it('rotateSelectedRooms and flipSelectedRooms update the selected room flags', () => {
    const component = createComponent();
    const state = new TabIndoorBuilderState();
    state.file = { unsaved_changes: false } as any;
    state.selectedComponent = component;
    state.addRoomAt(new THREE.Vector3(0, 0, 0));

    state.rotateSelectedRooms(90);
    state.flipSelectedRooms(true, false);
    state.flipSelectedRooms(false, true);

    expect(state.selectedRooms[0].rotation).toBe(90);
    expect(state.selectedRooms[0].flipX).toBe(true);
    expect(state.selectedRooms[0].flipY).toBe(true);
  });

  it('setViewMode toggles renderer enablement and renders when entering 3D mode', () => {
    const state = new TabIndoorBuilderState();

    state.setViewMode(IndoorBuilderViewMode.ThreeD);
    expect(state.viewMode).toBe(IndoorBuilderViewMode.ThreeD);
    expect(state.ui3DRenderer.enabled).toBe(true);
    expect((state.ui3DRenderer.render as jest.Mock)).toHaveBeenCalled();

    state.setViewMode(IndoorBuilderViewMode.TwoD);
    expect(state.ui3DRenderer.enabled).toBe(false);
  });

  it('openFile updates tab metadata, loads the map, and syncs loaded rooms', async () => {
    const component = createComponent('embedded_kit', 'embedded_room');
    const state = new TabIndoorBuilderState();
    const room = new IndoorMapRoom(component, new THREE.Vector3(5, 6, 7), 0, false, false);
    const loadSpy = jest.spyOn(state.map, 'load').mockImplementation(() => {
      state.map.rooms = [room];
      return [];
    });
    const rebuildSpy = jest.spyOn(state.map, 'rebuildRoomConnections');
    state.setKits([component.kit]);

    const file = new EditorFile({
      resref: 'module01',
      ext: 'indoor',
      buffer: new Uint8Array([123]),
    });

    await state.openFile(file);

    expect(state.tabName).toBe('module01.indoor');
    expect(loadSpy).toHaveBeenCalledWith(file.buffer, state.kits);
    expect(rebuildSpy).toHaveBeenCalled();
    expect((state.scene3D.syncRooms as jest.Mock)).toHaveBeenCalledWith([room]);
  });

  it('getExportBuffer serializes the current indoor map rooms', async () => {
    const component = createComponent();
    const state = new TabIndoorBuilderState();
    state.map.rooms.push(new IndoorMapRoom(component, new THREE.Vector3(3, 4, 5), 180, true, false));

    const buffer = await state.getExportBuffer();
    const json = JSON.parse(new TextDecoder().decode(buffer));

    expect(Array.isArray(json.rooms)).toBe(true);
    expect(json.rooms).toHaveLength(1);
    expect(json.rooms[0].position).toEqual([3, 4, 5]);
    expect(json.rooms[0].rotation).toBe(180);
    expect(json.rooms[0].flip_x).toBe(true);
    expect(json.rooms[0].component).toBe('room_a');
  });
});