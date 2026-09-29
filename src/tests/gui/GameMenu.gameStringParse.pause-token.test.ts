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

jest.mock('@/controls', () => ({
  KeyMapper: {
    get ACTIONS_ALL(){ return actionsAll; },
  },
}));

jest.mock('@/GameState', () => ({
  GameState: {
    PartyManager: { ActualPlayerTemplate: undefined },
    module: { getCustomToken: () => '' },
  },
}));

jest.mock('@/managers/ResolutionManager', () => ({ ResolutionManager: {} }));
jest.mock('@/managers/ShaderManager', () => ({ ShaderManager: {} }));
jest.mock('@/loaders', () => ({ ResourceLoader: {}, TextureLoader: {} }));
jest.mock('@/gui/GUIControl', () => ({ GUIControl: class {} }));
jest.mock('@/gui/GUIControlFactory', () => ({ GUIControlFactory: {} }));
jest.mock('@/gui/listrow/listRowHover', () => ({ shouldSuppressGameMenuHoverForListRow: () => false }));
jest.mock('@/gui/GUICoord', () => ({ GUIPanelCoordFlags: {} }));
jest.mock('@/shaders/datatextures/godray.datatexture', () => ({ getGodRayTexture: () => null }));
jest.mock('@/shaders/datatextures/fog.datatexture', () => ({
  createGUIFogVolumeTexture: () => null,
  GUI_FOG_VOLUME: { periodSeconds: 64 },
}));
jest.mock('@/resource/GFFObject', () => ({ GFFObject: class {} }));
jest.mock('@/three/odyssey/OdysseyTexture', () => ({ OdysseyTexture: class {} }));
jest.mock('@/resource/ResourceTypes', () => ({ ResourceTypes: {} }));
jest.mock('@/utility/BitWise', () => ({ BitWise: { MaskMatch: () => false } }));
jest.mock('@/gui/guiMatrix', () => ({
  freezeGuiTree: () => {},
  commitGuiTransform: () => {},
  flushGuiMatrices: () => {},
  freezeGuiObject: () => {},
}));
jest.mock('three', () => ({}));

import { GameMenu } from '@/gui/GameMenu';

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
