/**
 * @jest-environment node
 */
import { afterEach, beforeAll, describe, expect, it } from '@jest/globals';

class FakeGamepad {
  id = 'Test Pad';
  index = 0;
  connected = true;
  buttons: { pressed: boolean; value: number }[] = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
  axes: number[] = [0, 0, 0, 0];
}

beforeAll(() => {
  (globalThis as any).Gamepad = FakeGamepad;
});

import { GamePad, radialDeadZone, STICK_DEADZONE } from '@engine/controls/GamePad';
import { KeyInput } from '@engine/controls/KeyInput';
import { AnalogInput } from '@engine/controls/AnalogInput';
import { detectPadFamily, glyphName, glyphSvg, resolvePadFamily } from '@engine/controls/gamepad-glyphs';
import { computePrompts, renderPromptsHtml } from '@engine/controls/GamepadPrompts';
import { GamepadQuickMenu, QUICK_MENU_ENTRIES, quickMenuLabel, stepQuickMenu } from '@engine/controls/GamepadQuickMenu';

function makePad(): FakeGamepad {
  return new FakeGamepad();
}

describe('radialDeadZone', () => {
  it('reads zero inside the circle', () => {
    expect(radialDeadZone(0.1, 0.1)).toEqual({ x: 0, y: 0 });
    expect(radialDeadZone(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('keeps diagonals that a per-axis dead zone would drop', () => {
    const v = radialDeadZone(0.14, 0.14);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeCloseTo(v.x);
  });

  it('reaches full deflection and keeps direction', () => {
    const v = radialDeadZone(1, 0);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBe(0);
    const d = radialDeadZone(-1, -1);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
  });

  it('rescales from the edge of the dead zone', () => {
    const half = STICK_DEADZONE + (1 - STICK_DEADZONE) / 2;
    expect(radialDeadZone(0, half).y).toBeCloseTo(0.5);
  });
});

describe('button repeat', () => {
  it('a confirm button fires once while held', () => {
    const pad = new GamePad();
    const gp = makePad() as unknown as Gamepad;
    pad.setGamePad(gp);
    (gp as any).buttons[0].pressed = true;
    let presses = 0;
    for(let i = 0; i < 120; i++){
      pad.updateState(1 / 60);
      if(pad.button_a.pressed) presses++;
    }
    expect(presses).toBe(1);
  });

  it('the d-pad still repeats while held', () => {
    const pad = new GamePad();
    const gp = makePad() as unknown as Gamepad;
    pad.setGamePad(gp);
    (gp as any).buttons[12].pressed = true;
    let presses = 0;
    for(let i = 0; i < 120; i++){
      pad.updateState(1 / 60);
      if(pad.button_d_up.pressed) presses++;
    }
    expect(presses).toBeGreaterThan(1);
  });
});

describe('reset after disconnect', () => {
  it('releases held sticks and buttons', () => {
    const pad = new GamePad();
    const gp = makePad() as unknown as Gamepad;
    pad.setGamePad(gp);
    (gp as any).axes[1] = -1;
    (gp as any).buttons[0].pressed = true;
    pad.updateState(1 / 60);
    expect(pad.stick_l_y.value).toBeCloseTo(-1);
    expect(pad.button_a.down).toBe(true);

    pad.setGamePad(undefined);
    pad.reset();
    pad.updateState(1 / 60);
    expect(pad.stick_l_y.value).toBe(0);
    expect(pad.button_a.down).toBe(false);
  });

  it('KeyInput and AnalogInput reset clear state', () => {
    const k = new KeyInput('K');
    k.keyDown();
    k.reset();
    expect(k.down).toBe(false);
    expect(k.pressed).toBe(false);
    const a = new AnalogInput('A', 0, true);
    a.updateWithValue(0.9, 0.1);
    expect(a.pressed).toBe(true);
    a.reset();
    expect(a.value).toBe(0);
    expect(a.pressThresholdActive).toBe(false);
  });
});

describe('GamePad.pollActive', () => {
  const realNavigator = (globalThis as any).navigator;
  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { value: realNavigator, configurable: true, writable: true });
    GamePad.CurrentGamePadIndex = -1;
    GamePad.CurrentGamePad = undefined;
  });

  function setPads(pads: (FakeGamepad | null)[]){
    Object.defineProperty(globalThis, 'navigator', {
      value: { getGamepads: () => pads },
      configurable: true,
      writable: true,
    });
  }

  it('falls back to another connected pad', () => {
    const second = makePad();
    second.index = 1;
    setPads([null, second]);
    GamePad.CurrentGamePadIndex = 0;
    expect(GamePad.pollActive()).toBe(second);
    expect(GamePad.CurrentGamePadIndex).toBe(1);
  });

  it('returns undefined when no pad is connected', () => {
    setPads([null, null]);
    GamePad.CurrentGamePadIndex = 0;
    expect(GamePad.pollActive()).toBeUndefined();
    expect(GamePad.CurrentGamePadIndex).toBe(-1);
  });
});

describe('pad family detection', () => {
  it('recognises PlayStation pads', () => {
    expect(detectPadFamily('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)')).toBe('playstation');
    expect(detectPadFamily('054c-09cc-Wireless Controller')).toBe('playstation');
    expect(detectPadFamily('PS4 Controller')).toBe('playstation');
  });

  it('recognises Xbox pads and defaults to Xbox', () => {
    expect(detectPadFamily('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('xbox');
    expect(detectPadFamily('045e-02ea-Microsoft X-Box One S pad')).toBe('xbox');
    expect(detectPadFamily('Generic USB Joystick')).toBe('xbox');
    expect(detectPadFamily(undefined)).toBe('xbox');
  });

  it('honours the glyph setting', () => {
    expect(resolvePadFamily('Xbox Controller', 2)).toBe('playstation');
    expect(resolvePadFamily('DualSense', 1)).toBe('xbox');
    expect(resolvePadFamily('DualSense', 0)).toBe('playstation');
  });

  it('records the family on the pad', () => {
    const pad = new GamePad();
    const gp = makePad();
    gp.id = 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)';
    pad.setGamePad(gp as unknown as Gamepad);
    expect(pad.family).toBe('playstation');
  });
});

describe('glyphs', () => {
  it('names buttons per family', () => {
    expect(glyphName('a', 'xbox')).toBe('A');
    expect(glyphName('a', 'playstation')).toBe('Cross');
    expect(glyphName('y', 'playstation')).toBe('Triangle');
    expect(glyphName('lb', 'playstation')).toBe('L1');
    expect(glyphName('rt', 'xbox')).toBe('RT');
    expect(glyphName('start', 'playstation')).toBe('Options');
  });

  it('draws a labelled SVG for every button', () => {
    const buttons = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'back', 'start', 'ls', 'rs',
      'dpad', 'dpad_up', 'dpad_down', 'dpad_left', 'dpad_right', 'dpad_vertical', 'dpad_horizontal'] as const;
    for(const family of ['xbox', 'playstation'] as const){
      for(const b of buttons){
        const markup = glyphSvg(b, family, 20);
        expect(markup.startsWith('<svg')).toBe(true);
        expect(markup).toContain('width="20"');
        expect(markup).toContain(`aria-label="${glyphName(b, family)}"`);
      }
    }
  });

  it('PlayStation face buttons are shapes, Xbox ones are letters', () => {
    expect(glyphSvg('a', 'xbox')).toContain('>A</text>');
    expect(glyphSvg('a', 'playstation')).not.toContain('<text');
  });
});

describe('prompts', () => {
  it('lists only what a menu supports', () => {
    expect(computePrompts({ screen: 'menu' }).map((p) => p.button)).toEqual(['a']);
    expect(computePrompts({ screen: 'menu', menuHasBack: true, menuHasTabs: true }).map((p) => p.button))
      .toEqual(['a', 'b', 'lb', 'rb']);
  });

  it('dialog prompts follow the reply list', () => {
    expect(computePrompts({ screen: 'dialog', dialogHasReplies: false }).map((p) => p.button)).toEqual(['a']);
    expect(computePrompts({ screen: 'dialog', dialogHasReplies: true }).map((p) => p.button)).toEqual(['dpad_vertical', 'a']);
  });

  it('has nothing for unknown screens', () => {
    expect(computePrompts({ screen: 'none' })).toEqual([]);
  });

  it('renders symbols with escaped labels', () => {
    const html = renderPromptsHtml([{ button: 'b', label: '<Back>' }], 'playstation');
    expect(html).toContain('&lt;Back&gt;');
    expect(html).toContain('title="Circle"');
  });
});

describe('quick menu', () => {
  const all = { stealth: true, switchWeapons: true, soloMode: false };
  const none = { stealth: false, switchWeapons: false, soloMode: true };

  it('steps left and right with wrap-around', () => {
    const last = QUICK_MENU_ENTRIES.length - 1;
    expect(stepQuickMenu(0, -1, all)).toBe(last);
    expect(stepQuickMenu(last, 1, all)).toBe(0);
  });

  it('skips stealth and switch weapons when they cannot be used', () => {
    const solo = QUICK_MENU_ENTRIES.indexOf('solo');
    const stealth = QUICK_MENU_ENTRIES.indexOf('stealth');
    expect(stepQuickMenu(solo, 1, all)).toBe(stealth);
    expect(stepQuickMenu(solo, 1, none)).toBe(stealth + 1);
    const menu = QUICK_MENU_ENTRIES.indexOf('menu');
    expect(stepQuickMenu(menu, 1, none)).toBe(0);
  });

  it('labels the solo entry by the current mode', () => {
    expect(quickMenuLabel('solo', all)).toBe('Solo Mode');
    expect(quickMenuLabel('solo', none)).toBe('Party Mode');
  });

  it('opens on a usable entry and remembers the last one', () => {
    const qm = new GamepadQuickMenu();
    qm.index = QUICK_MENU_ENTRIES.indexOf('stealth');
    qm.open(none);
    expect(qm.entry).toBe('close');
    qm.step(1, all);
    qm.close();
    qm.open(all);
    expect(qm.entry).toBe('solo');
    expect(qm.isOpen).toBe(true);
  });

  it('in play, the prompt bar offers the quick menu on Y', () => {
    expect(computePrompts({ screen: 'ingame' }).some((p) => p.button === 'y')).toBe(true);
  });
});
