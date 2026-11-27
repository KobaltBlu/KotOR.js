/**
 * Debug console controller helpers.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const ini: Record<string, any> = {};
const fakeState: any = {
  iniConfig: {
    getProperty: (k: string) => ini[k],
    setProperty: (k: string, v: any) => { ini[k] = v; },
    save: () => {},
  },
  controls: { controllerHidesCursor: true, touchInputActive: false },
};

jest.mock('@engine/runtime/GameState', () => ({ GameState: fakeState }));

import { GamePad } from '@engine/controls/GamePad';
import {
  describeGamepadsForConsole,
  getGamepadDebugSnapshot,
  padButtonName,
  rumbleActivePad,
  selectActivePad,
  setGlyphOverride,
  setPromptsEnabled,
  setSimulatedPad,
  INI_CONTROLLER_GLYPHS,
} from '@engine/controls/gamepad-debug';

function pad(index: number, id: string, extra: any = {}){
  return {
    index, id, connected: true, mapping: 'standard',
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    axes: [0, 0, 0, 0],
    ...extra,
  };
}

let pads: any[] = [];

beforeEach(() => {
  for(const k of Object.keys(ini)) delete ini[k];
  pads = [];
  (globalThis as any).navigator = { getGamepads: () => pads };
  GamePad.setSimulatedFamily(undefined);
  GamePad.CurrentGamePadIndex = -1;
  GamePad.CurrentGamePad = undefined;
});

describe('gamepad debug helpers', () => {
  it('reports no pads', () => {
    const snap = getGamepadDebugSnapshot();
    expect(snap.supported).toBe(true);
    expect(snap.pads).toHaveLength(0);
    expect(snap.active).toBeUndefined();
    expect(describeGamepadsForConsole(snap)[1]).toMatch(/No pad seen yet/);
  });

  it('reads the active pad with dead zones and names', () => {
    const p = pad(0, 'Xbox Wireless Controller');
    p.buttons[0] = { pressed: true, value: 1 };
    p.buttons[7] = { pressed: true, value: 0.5 };
    p.axes = [0.1, 0, 1, 0];
    pads = [p];
    GamePad.CurrentGamePadIndex = 0;
    const snap = getGamepadDebugSnapshot();
    expect(snap.active?.family).toBe('xbox');
    expect(snap.active?.leftStick).toEqual({ x: 0, y: 0 });
    expect(snap.active?.rightStick.x).toBeCloseTo(1);
    expect(snap.active?.rightTrigger).toBe(0.5);
    expect(snap.active?.buttons.filter((b) => b.pressed).map((b) => b.name)).toEqual(['A', 'RT']);
    expect(snap.padIsActiveInput).toBe(true);
  });

  it('uses the glyph setting for button names', () => {
    pads = [pad(0, 'Xbox Wireless Controller')];
    GamePad.CurrentGamePadIndex = 0;
    setGlyphOverride(2);
    expect(ini[INI_CONTROLLER_GLYPHS]).toBe(2);
    const snap = getGamepadDebugSnapshot();
    expect(snap.active?.shownFamily).toBe('playstation');
    expect(snap.active?.buttons[0].name).toBe('Cross');
    expect(padButtonName(16, 'playstation')).toBe('PS');
    expect(padButtonName(20, 'xbox')).toBe('Button 20');
  });

  it('switches the active pad only to a connected one', () => {
    pads = [pad(0, 'a'), pad(1, 'DualSense Wireless Controller')];
    expect(selectActivePad(1)).toBe(true);
    expect(GamePad.CurrentGamePadIndex).toBe(1);
    expect(getGamepadDebugSnapshot().active?.family).toBe('playstation');
    expect(selectActivePad(5)).toBe(false);
    expect(GamePad.CurrentGamePadIndex).toBe(1);
  });

  it('toggles prompts', () => {
    expect(getGamepadDebugSnapshot().promptsEnabled).toBe(true);
    setPromptsEnabled(false);
    expect(getGamepadDebugSnapshot().promptsEnabled).toBe(false);
  });

  it('rumbles only when the pad supports it', async () => {
    const playEffect = jest.fn(async (..._args: any[]) => 'complete');
    pads = [pad(0, 'a', { vibrationActuator: { playEffect } })];
    GamePad.CurrentGamePadIndex = 0;
    expect(await rumbleActivePad(9999, 2, -1)).toBe(true);
    expect(playEffect).toHaveBeenCalledWith('dual-rumble', { startDelay: 0, duration: 5000, strongMagnitude: 1, weakMagnitude: 0 });
    pads = [pad(0, 'a')];
    expect(await rumbleActivePad()).toBe(false);
  });

  it('simulates an idle pad the game reads as connected', () => {
    class FakeGamepad {}
    (globalThis as any).Gamepad = FakeGamepad;
    pads = [pad(0, 'Xbox Wireless Controller')];
    setSimulatedPad('playstation');
    const active = GamePad.pollActive();
    expect(active).toBeInstanceOf(FakeGamepad);
    expect(active?.index).toBe(GamePad.SIMULATED_PAD_INDEX);
    const snap = getGamepadDebugSnapshot();
    expect(snap.simulatedFamily).toBe('playstation');
    expect(snap.padIsActiveInput).toBe(true);
    expect(snap.pads.map((p) => p.index)).toEqual([0, GamePad.SIMULATED_PAD_INDEX]);
    expect(snap.active?.family).toBe('playstation');
    expect(snap.active?.buttons.some((b) => b.pressed)).toBe(false);

    // Picking a real pad turns the simulation off.
    expect(selectActivePad(0)).toBe(true);
    expect(GamePad.simulatedFamily).toBeUndefined();
    expect(GamePad.pollActive()?.index).toBe(0);
    delete (globalThis as any).Gamepad;
  });

  it('turning the simulation off drops the simulated pad', () => {
    setSimulatedPad('xbox');
    GamePad.pollActive();
    setSimulatedPad(undefined);
    expect(GamePad.CurrentGamePadIndex).toBe(-1);
    expect(GamePad.pollActive()).toBeUndefined();
  });
});
