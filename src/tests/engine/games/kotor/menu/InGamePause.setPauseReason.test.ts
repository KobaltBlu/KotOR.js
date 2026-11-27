/**
 * SetPauseReason layout — hide LBL_PRESS for enemy/mine and relayout panel.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AutoPauseState } from '@engine/enums/engine/AutoPauseState';

jest.mock('@engine/gui', () => ({
  GameMenu: class GameMenu {
    show(){}
    hide(){}
  },
}));

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    TLKManager: {
      GetStringById: (id: number) => ({
        Value: id === 0xbc54
          ? 'ENEMY SIGHTED!\nPress the Pause key (<Pause> or Pause) to continue'
          : `tlk-${id.toString(16)}`,
      }),
    },
    ResolutionManager: {
      getViewportWidth: () => 800,
      getViewportHeight: () => 600,
    },
    AutoPauseManager: {
      CurrentReason: AutoPauseState.Generic,
    },
  },
}));

import { InGamePause } from '@engine/games/kotor/menu/InGamePause';

function makeLabel(overrides: Record<string, unknown> = {}) {
  return {
    extent: { left: 5, top: 5, width: 241, height: 26 },
    setText: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    getIdealHeight: jest.fn(() => 26),
    setExtentHeight: jest.fn(function(this: any, h: number){ this.extent.height = h; }),
    setExtentTop: jest.fn(function(this: any, t: number){ this.extent.top = t; }),
    setExtentLeft: jest.fn(function(this: any, l: number){ this.extent.left = l; }),
    setExtentWidth: jest.fn(function(this: any, w: number){ this.extent.width = w; }),
    pulsing: false,
    ...overrides,
  };
}

describe('InGamePause.setPauseReason', () => {
  let pause: InGamePause;
  let reasonLbl: ReturnType<typeof makeLabel>;
  let pressLbl: ReturnType<typeof makeLabel>;
  let button: ReturnType<typeof makeLabel>;
  let panel: any;

  beforeEach(() => {
    pause = Object.create(InGamePause.prototype) as InGamePause;
    reasonLbl = makeLabel({ getIdealHeight: jest.fn(() => 52) });
    pressLbl = makeLabel({
      extent: { left: 5, top: 26, width: 241, height: 40 },
      getIdealHeight: jest.fn(() => 40),
    });
    button = makeLabel({
      extent: { left: 2, top: 2, width: 247, height: 68 },
    });
    panel = {
      extent: { left: 0, top: 0, width: 251, height: 70 },
      recalculate: jest.fn(),
      setExtentHeight: jest.fn(function(this: any, h: number){ this.extent.height = h; }),
    };
    pause.tGuiPanel = panel;
    pause.LBL_PAUSEREASON = reasonLbl as any;
    pause.LBL_PRESS = pressLbl as any;
    pause.BTN_UNPAUSE = button as any;
    pause.recalculatePosition = jest.fn();
  });

  it('hides LBL_PRESS and resizes reason/panel for EnemySighted', () => {
    pause.setPauseReason(AutoPauseState.EnemySighted);

    expect(reasonLbl.setText).toHaveBeenCalledWith(
      'ENEMY SIGHTED!\nPress the Pause key (<Pause> or Pause) to continue'
    );
    expect(pressLbl.hide).toHaveBeenCalled();
    expect(pressLbl.show).not.toHaveBeenCalled();
    expect(reasonLbl.setExtentHeight).toHaveBeenCalledWith(52);
    // panel height = reason.top + 5 + reasonHeight = 5 + 5 + 52
    expect(panel.extent.height).toBe(62);
    expect(button.setExtentHeight).toHaveBeenCalledWith(62);
    expect(pause.recalculatePosition).toHaveBeenCalled();
  });

  it('shows LBL_PRESS below reason and grows panel for manual pause', () => {
    reasonLbl.getIdealHeight = jest.fn(() => 26);
    pause.setPauseReason(AutoPauseState.Manual);

    expect(reasonLbl.setText).toHaveBeenCalledWith('tlk-5e4');
    expect(pressLbl.show).toHaveBeenCalled();
    expect(pressLbl.hide).not.toHaveBeenCalled();
    expect(pressLbl.setExtentTop).toHaveBeenCalledWith(5 + 2 + 26);
    // panel height = pressTop + 5 + pressHeight = 33 + 5 + 40
    expect(panel.extent.height).toBe(78);
    expect(pause.recalculatePosition).toHaveBeenCalled();
  });
});
