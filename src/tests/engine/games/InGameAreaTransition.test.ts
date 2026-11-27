/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { EngineMode } from "@engine/enums/engine/EngineMode";

const mockGameState = {
  Mode: EngineMode.INGAME as EngineMode,
  module: {
    area: {
      transPending: 0 as number,
    },
  },
};

jest.mock("@engine/runtime/GameState", () => ({
  GameState: mockGameState,
}));

jest.mock("@engine/gui", () => ({
  GameMenu: class {
    bVisible = false;
    isOverlayGUI = false;
    engineMode = 0;
    panelCoordFlags = 0;
    show() { this.bVisible = true; }
    hide() { this.bVisible = false; }
    isVisible() { return this.bVisible; }
  },
  GUIPanelCoordFlags: {
    UseExtentOffset: 0x1,
    DockDesignX: 0x20,
    DockDesignY: 0x40,
  },
}));

jest.mock("@core/utility/BitWise", () => ({
  BitWise: { InstanceOfObject: () => true, InstanceOf: () => true },
}));

import { InGameAreaTransition } from "@engine/games/kotor/menu/InGameAreaTransition";

describe("InGameAreaTransition hide/show (engine UpdateAreaTransitionGUI)", () => {
  let menu: InGameAreaTransition;

  beforeEach(() => {
    mockGameState.Mode = EngineMode.INGAME;
    mockGameState.module.area.transPending = 0;
    menu = new InGameAreaTransition();
    menu.bVisible = false;
    jest.spyOn(menu, "show");
    jest.spyOn(menu, "hide");
  });

  it("shows when a transition object is set and TransPending is clear", () => {
    menu.transitionObject = { id: 1 } as any;
    menu.updateAreaTransitionGUI();
    expect(menu.show).toHaveBeenCalledTimes(1);
    expect(menu.hide).not.toHaveBeenCalled();
    expect(menu.bVisible).toBe(true);
  });

  it("does not re-show when already visible", () => {
    menu.transitionObject = { id: 1 } as any;
    menu.bVisible = true;
    menu.updateAreaTransitionGUI();
    expect(menu.show).not.toHaveBeenCalled();
  });

  it("hides and clears when no transition object", () => {
    menu.transitionObject = undefined;
    menu.bVisible = true;
    menu.updateAreaTransitionGUI();
    expect(menu.hide).toHaveBeenCalledTimes(1);
    expect(menu.transitionObject).toBeUndefined();
    expect(menu.bVisible).toBe(false);
  });

  it("keeps the panel during TransPending (engine SendPanelToBack path)", () => {
    menu.transitionObject = { id: 1 } as any;
    menu.bVisible = true;
    mockGameState.module.area.transPending = 1;
    menu.updateAreaTransitionGUI();
    expect(menu.hide).not.toHaveBeenCalled();
    expect(menu.show).not.toHaveBeenCalled();
    expect(menu.transitionObject).toBeTruthy();
  });

  it("hideAreaTransition keeps panel while TransPending", () => {
    menu.transitionObject = { id: 1 } as any;
    menu.bVisible = true;
    mockGameState.module.area.transPending = 1;
    menu.hideAreaTransition();
    expect(menu.hide).not.toHaveBeenCalled();
    expect(menu.transitionObject).toBeTruthy();
  });

  it("hides when not in EngineMode.INGAME (sw_gui_status != 1)", () => {
    menu.transitionObject = { id: 1 } as any;
    menu.bVisible = true;
    mockGameState.Mode = EngineMode.DIALOG;
    menu.updateAreaTransitionGUI();
    expect(menu.hide).toHaveBeenCalledTimes(1);
    expect(menu.transitionObject).toBeUndefined();
  });
});
