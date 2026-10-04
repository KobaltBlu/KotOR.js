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

jest.mock('@engine/managers/ResolutionManager', () => ({ ResolutionManager: {} }));
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
jest.mock('three', () => ({}));

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
