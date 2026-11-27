/**
 * gameStringParse key tokens — remappable binding wins on duplicate names.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const actionsAll: Array<{
  name: string;
  character: string;
  remappable: boolean;
  tokenRegEx: RegExp;
}> = [];

jest.mock('@engine/controls', () => ({
  KeyMapper: {
    get ACTIONS_ALL(){ return actionsAll; },
  },
}));

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    PartyManager: { ActualPlayerTemplate: undefined },
    module: { getCustomToken: () => '' },
  },
}));

jest.mock('@engine/managers/ResolutionManager', () => ({
  ResolutionManager: {
    getViewportWidth: () => 1280,
    getViewportHeight: () => 720,
    getWindowWidth: () => 1280,
    getWindowHeight: () => 720,
  },
}));
jest.mock('@engine/managers/ShaderManager', () => ({ ShaderManager: {} }));
jest.mock('@engine/loaders', () => ({ ResourceLoader: {}, TextureLoader: {} }));
jest.mock('@engine/gui/GUIControl', () => ({ GUIControl: class {} }));
jest.mock('@engine/gui/GUIControlFactory', () => ({ GUIControlFactory: {} }));
jest.mock('@engine/gui/listrow/listRowHover', () => ({ shouldSuppressGameMenuHoverForListRow: () => false }));
jest.mock('@engine/gui/GUICoord', () => ({ GUIPanelCoordFlags: {} }));
jest.mock('@engine/render/shaders/datatextures/godray.datatexture', () => ({ getGodRayTexture: () => null }));
jest.mock('@engine/render/shaders/datatextures/fog.datatexture', () => ({
  createGUIFogVolumeTexture: () => null,
  GUI_FOG_VOLUME: { periodSeconds: 64 },
}));
jest.mock('@core/resource/GFFObject', () => ({ GFFObject: class {} }));
jest.mock('@engine/render/three/odyssey/OdysseyTexture', () => ({ OdysseyTexture: class {} }));
jest.mock('@core/resource/ResourceTypes', () => ({ ResourceTypes: {} }));
jest.mock('@core/utility/BitWise', () => ({ BitWise: { MaskMatch: () => false } }));
jest.mock('@engine/gui/guiMatrix', () => ({
  freezeGuiTree: () => {},
  commitGuiTransform: () => {},
  flushGuiMatrices: () => {},
  freezeGuiObject: () => {},
}));
jest.mock('@engine/runtime/EngineModeController', () => ({
  EngineModeController: { setMode: () => {}, getMode: () => 0 },
}));
jest.mock('@engine/audio', () => ({}));
jest.mock('@engine/pathfinding/static-walk-blockers', () => ({}));
jest.mock('@engine/pathfinding/static-walk-blockers-mesh', () => ({}));
jest.mock('three', () => {
  class Vector3 {
    x = 0; y = 0; z = 0;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
    copy() { return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
  }
  class Matrix4 {
    elements = new Array(16).fill(0);
    identity() { return this; }
    copy() { return this; }
    clone() { return new Matrix4(); }
  }
  class Box3 {
    min = new Vector3();
    max = new Vector3();
    setFromObject() { return this; }
    makeEmpty() { return this; }
    isEmpty() { return true; }
  }
  return {
    Vector3,
    Matrix4,
    Box3,
    MathUtils: { clamp: (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)) },
  };
});

import { GameMenu } from '@engine/gui/GameMenu';

describe('GameMenu.gameStringParse Pause token', () => {
  let menu: GameMenu;

  beforeEach(() => {
    actionsAll.length = 0;
    actionsAll.push(
      {
        name: 'Pause',
        character: 'PauseKey',
        remappable: false,
        tokenRegEx: /<Pause>/gm,
      },
      {
        name: 'Pause',
        character: 'Space',
        remappable: true,
        tokenRegEx: /<Pause>/gm,
      },
    );
    menu = Object.create(GameMenu.prototype) as GameMenu;
  });

  it('resolves <Pause> to remappable Space, not PauseKey', () => {
    const out = menu.gameStringParse(
      'ENEMY SIGHTED!\nPress the Pause key (<Pause> or Pause) to continue'
    );
    expect(out).toBe(
      'ENEMY SIGHTED!\nPress the Pause key (Space or Pause) to continue'
    );
  });

  it('keeps remappable binding when it appears before the non-remappable duplicate', () => {
    actionsAll.reverse();
    const out = menu.gameStringParse('(<Pause> or Pause)');
    expect(out).toBe('(Space or Pause)');
  });
});
