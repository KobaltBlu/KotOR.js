import * as THREE from 'three';
import { describe, expect, it, jest } from '@jest/globals';

import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { PathPoint } from '@/engine/pathfinding/PathPoint';
import { TabPTHEditorState, TabPTHEditorControlMode } from '@/apps/forge/states/tabs/TabPTHEditorState';

jest.mock('@/apps/forge/EditorFile', () => ({
  EditorFile: class EditorFile {
    unsaved_changes = false;

    addEventListener() {}

    getFilename() {
      return 'mock.pth';
    }

    async readFile() {
      return { buffer: new Uint8Array(0) };
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

jest.mock('@/apps/forge/components/tabs/tab-pth-editor/TabPTHEditor', () => ({
  TabPTHEditor: function TabPTHEditor() {
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
    scene = new THREE.Scene();
    selectable = new THREE.Group();
    unselectable = new THREE.Group();
    orbitControls = { target: new THREE.Vector3() };
    raycaster = new THREE.Raycaster();
    camera = new THREE.PerspectiveCamera();
    canvas = undefined;
    disableSelection = false;
    enabled = false;
    transformControls = {
      addEventListener: jest.fn(),
      attach: jest.fn(),
      detach: jest.fn(),
      size: 1,
      showZ: true,
    };

    setCameraFocusMode = jest.fn();
    addEventListener = jest.fn();
    selectObject = jest.fn();
    addObjectToGroup = jest.fn();
    removeObjectFromGroup = jest.fn();
    render = jest.fn();
  }

  return {
    CameraFocusMode: {
      SELECTABLE: 'selectable',
      SCENE: 'scene',
    },
    GroupType: {
      ROOMS: 'rooms',
    },
    ObjectType: {
      WALKMESH: 'walkmesh',
    },
    UI3DRenderer: MockUI3DRenderer,
  };
});

jest.mock('@/apps/forge/KotOR', () => {
  const { GFFDataType } = require('@/enums/resource/GFFDataType');
  const { GFFField } = require('@/resource/GFFField');
  const { GFFObject } = require('@/resource/GFFObject');
  const { GFFStruct } = require('@/resource/GFFStruct');
  const { PathPoint } = require('@/engine/pathfinding/PathPoint');
  const THREE = require('three');

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
    Mouse: {
      Vector: new THREE.Vector2(),
    },
    PathPoint,
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

function buildPthGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'PTH ';
  const root = gff.RootNode;

  const points = new GFFField(GFFDataType.LIST, 'Path_Points');
  const point0 = new GFFStruct(2);
  point0.addField(new GFFField(GFFDataType.DWORD, 'First_Conection')).setValue(0);
  point0.addField(new GFFField(GFFDataType.DWORD, 'Conections')).setValue(2);
  point0.addField(new GFFField(GFFDataType.FLOAT, 'X')).setValue(0);
  point0.addField(new GFFField(GFFDataType.FLOAT, 'Y')).setValue(0);
  points.addChildStruct(point0);

  const point1 = new GFFStruct(2);
  point1.addField(new GFFField(GFFDataType.DWORD, 'First_Conection')).setValue(2);
  point1.addField(new GFFField(GFFDataType.DWORD, 'Conections')).setValue(1);
  point1.addField(new GFFField(GFFDataType.FLOAT, 'X')).setValue(0);
  point1.addField(new GFFField(GFFDataType.FLOAT, 'Y')).setValue(1);
  points.addChildStruct(point1);

  const point2 = new GFFStruct(2);
  point2.addField(new GFFField(GFFDataType.DWORD, 'First_Conection')).setValue(3);
  point2.addField(new GFFField(GFFDataType.DWORD, 'Conections')).setValue(1);
  point2.addField(new GFFField(GFFDataType.FLOAT, 'X')).setValue(1);
  point2.addField(new GFFField(GFFDataType.FLOAT, 'Y')).setValue(1);
  points.addChildStruct(point2);
  root.addField(points);

  const connections = new GFFField(GFFDataType.LIST, 'Path_Conections');
  [1, 2, 0, 0].forEach((destination) => {
    const connection = new GFFStruct(3);
    connection.addField(new GFFField(GFFDataType.DWORD, 'Destination')).setValue(destination);
    connections.addChildStruct(connection);
  });
  root.addField(connections);

  return gff;
}

function buildState(): TabPTHEditorState {
  return new TabPTHEditorState();
}

describe('TabPTHEditorState', () => {
  it('setPropsFromBlueprint parses point positions and connections from the blueprint', () => {
    const state = buildState();
    state.blueprint = buildPthGff();

    state.setPropsFromBlueprint();

    expect(state.points).toHaveLength(3);
    expect(state.points[0].vector.toArray()).toEqual([0, 0, 0]);
    expect(state.points[1].vector.toArray()).toEqual([0, 1, 0]);
    expect(state.points[0].connections.map((point) => point.id)).toEqual([1, 2]);
    expect(state.points[1].connections.map((point) => point.id)).toEqual([0]);
    expect(state.points[2].connections.map((point) => point.id)).toEqual([0]);
    expect(state.pointMeshes).toHaveLength(3);
  });

  it('addPathPoint offsets the point above the surface and marks the file dirty', () => {
    const state = buildState();
    state.file = { unsaved_changes: false } as any;

    (state as any).addPathPoint(new THREE.Vector3(3, 4, 5));

    expect(state.points).toHaveLength(1);
    expect(state.points[0].id).toBe(0);
    expect(state.points[0].vector.toArray()).toEqual([3, 4, 6]);
    expect(state.file?.unsaved_changes).toBe(true);
  });

  it('connectPoints updates the graph and updateFile exports canonical connection indexes', () => {
    const state = buildState();
    state.points = [
      new PathPoint({ id: 0, connections: [], first_connection: 0, num_connections: 0, vector: new THREE.Vector3(0, 0, 0) }),
      new PathPoint({ id: 1, connections: [], first_connection: 0, num_connections: 0, vector: new THREE.Vector3(1, 0, 0) }),
      new PathPoint({ id: 2, connections: [], first_connection: 0, num_connections: 0, vector: new THREE.Vector3(2, 0, 0) }),
    ];

    (state as any).connectPoints(state.points[0], state.points[1]);
    (state as any).connectPoints(state.points[1], state.points[2]);
    state.updateFile();

    const exportedPoints = state.blueprint.RootNode.getFieldByLabel('Path_Points').getChildStructs();
    const exportedConnections = state.blueprint.RootNode.getFieldByLabel('Path_Conections').getChildStructs();

    expect(state.points[0].connections.map((point) => point.id)).toEqual([1]);
    expect(state.points[1].connections.map((point) => point.id)).toEqual([0, 2]);
    expect(state.points[2].connections.map((point) => point.id)).toEqual([1]);
    expect(exportedPoints[1].getFieldByLabel('First_Conection').getValue()).toBe(1);
    expect(exportedPoints[1].getFieldByLabel('Conections').getValue()).toBe(2);
    expect(exportedConnections.map((connection) => connection.getFieldByLabel('Destination').getValue())).toEqual([1, 0, 2, 1]);
  });

  it('deleteSelectedPoint removes reciprocal connections before exporting', () => {
    const state = buildState();
    state.blueprint = buildPthGff();
    state.setPropsFromBlueprint();
    state.controlMode = TabPTHEditorControlMode.SELECT;
    state.selectedPointIndex = 0;

    (state as any).deleteSelectedPoint();
    state.updateFile();

    const exportedPoints = state.blueprint.RootNode.getFieldByLabel('Path_Points').getChildStructs();
    const exportedConnections = state.blueprint.RootNode.getFieldByLabel('Path_Conections').getChildStructs();

    expect(state.points).toHaveLength(2);
    expect(state.points.map((point) => point.id)).toEqual([0, 1]);
    expect(state.points[0].connections).toHaveLength(0);
    expect(state.points[1].connections).toHaveLength(0);
    expect(exportedPoints[0].getFieldByLabel('Conections').getValue()).toBe(0);
    expect(exportedPoints[1].getFieldByLabel('Conections').getValue()).toBe(0);
    expect(exportedConnections).toHaveLength(0);
  });
});
