/**
 * Touch HUD layout math and the on/off setting.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

const ini: Record<string, any> = {};
jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    iniConfig: {
      getProperty: (k: string) => ini[k],
      setProperty: (k: string, v: any) => { ini[k] = v; },
      save: () => {},
    },
  },
}));

import {
  boundsOf,
  combatCluster,
  hudScale,
  leftBlock,
  placeCluster,
  popupLayout,
  popupRowText,
  selfSlotStrip,
  slotBand,
  targetStrip,
  topRightButtons,
  HUD_POPUP,
  HUD_TAB_REACH,
  HUD_COMBAT_GROW,
} from '@engine/games/mobile-hud/mobile-hud-layout';
import {
  getTouchHudMode,
  parseTouchHudMode,
  setTouchHudMode,
  touchHudWanted,
  TouchHudMode,
  INI_TOUCH_HUD,
} from '@engine/games/mobile-hud/touch-hud-setting';

const inside = (r: { left: number; top: number; width: number; height: number }, w: number, h: number) =>
  r.left >= 0 && r.top >= 0 && r.left + r.width <= w && r.top + r.height <= h;

describe('touch HUD scale', () => {
  it('lays out against a 640-high screen when wide, 768 when about 4:3', () => {
    expect(hudScale(844, 390)).toBeCloseTo(390 / 640);
    expect(hudScale(1920, 1080)).toBeCloseTo(1080 / 640);
    expect(hudScale(1024, 768)).toBeCloseTo(1);
    expect(hudScale(0, 0)).toBe(1);
  });
});

/** Desktop queue and Disengage rects from the K1 layout file. */
const desktopCombat = {
  LBL_COMBATBG1: { left: 332, top: 508, width: 131, height: 77 },
  LBL_QUEUE0: { left: 418, top: 521, width: 32, height: 32 },
  LBL_QUEUE3: { left: 350, top: 541, width: 16, height: 16 },
  BTN_CLEARALL: { left: 335, top: 563, width: 125, height: 35 },
  BTN_CLEARONE2: { left: 410, top: 511, width: 51, height: 53 },
};

describe('touch HUD layout', () => {
  const sizes: [number, number][] = [[844, 390], [1920, 897], [1024, 768], [2532, 1170]];

  it('keeps every block on screen', () => {
    for(const [w, h] of sizes){
      const S = hudScale(w, h);
      const self = selfSlotStrip(w, h, S, 4);
      const target = targetStrip(w, S, 3);
      const left = leftBlock(h, S);
      const tr = topRightButtons(w, S);
      const combat = Object.values(combatCluster(desktopCombat, w, h, S));
      for(const r of [...self.slots, ...self.tabs, ...target.slots, target.name, target.health, left.backing, left.pause, tr.gear, tr.help, tr.save, ...combat]){
        expect(inside(r, w, h)).toBe(true);
      }
    }
  });

  it('puts the personal slots flush right, tabs on their top band', () => {
    const S = hudScale(844, 390);
    const self = selfSlotStrip(844, 390, S, 4);
    const last = self.slots[3];
    expect(last.left + last.width).toBeLessThanOrEqual(844);
    expect(844 - (last.left + last.width)).toBeLessThan(10);
    for(let i = 0; i < 4; i++){
      const slot = self.slots[i];
      const band = slotBand(slot, true);
      expect(self.tabs[i].left).toBe(slot.left);
      expect(self.tabs[i].width).toBe(slot.width);
      // Covers the top band and reaches a little above the slot.
      expect(self.tabs[i].top).toBe(slot.top - Math.round(HUD_TAB_REACH * S));
      expect(self.tabs[i].top + self.tabs[i].height).toBe(band.top + band.height);
      // Arrow sits inside the band; icon sits between the bands.
      const a = self.arrows[i];
      expect(a.top).toBeGreaterThanOrEqual(band.top);
      expect(a.top + a.height).toBeLessThanOrEqual(band.top + band.height);
      expect(Math.abs(a.width - a.height * 2)).toBeLessThanOrEqual(1);
      expect(self.icons[i].top).toBeGreaterThanOrEqual(band.top + band.height);
      if(i > 0) expect(slot.left).toBeGreaterThan(self.slots[i - 1].left + self.slots[i - 1].width);
    }
  });

  it('narrows the slots when there are six', () => {
    const S = hudScale(1920, 897);
    expect(selfSlotStrip(1920, 897, S, 6).slots[0].width).toBeLessThan(selfSlotStrip(1920, 897, S, 4).slots[0].width);
  });

  it('centres the target panel with tabs on the slot bottom band', () => {
    const S = hudScale(1920, 897);
    const t = targetStrip(1920, S, 3);
    expect(t.name.left + t.name.width / 2).toBeCloseTo(960, -1);
    expect(t.span.left + t.span.width / 2).toBeCloseTo(960, -1);
    const slot = t.slots[0];
    const band = slotBand(slot, false);
    expect(t.tabs[0].top).toBe(band.top);
    expect(t.tabs[0].top + t.tabs[0].height).toBe(slot.top + slot.height + Math.round(HUD_TAB_REACH * S));
    expect(t.arrows[0].top).toBeGreaterThanOrEqual(band.top);
    expect(slot.top).toBeGreaterThan(t.health.top);
  });

  it('grows the desktop queue block and centres it at the bottom', () => {
    const S = hudScale(844, 390);
    const out = combatCluster(desktopCombat, 844, 390, S);
    const box = boundsOf(Object.values(out))!;
    expect(box.left + box.width / 2).toBeCloseTo(422, -1);
    expect(390 - (box.top + box.height)).toBeLessThan(6);
    expect(out.BTN_CLEARALL.width).toBe(Math.round(125 * HUD_COMBAT_GROW * S));
    expect(out.BTN_CLEARALL.top).toBeGreaterThan(out.LBL_QUEUE0.top);
  });

  it('keeps a moved cluster in its original arrangement', () => {
    const out = placeCluster({
      a: { left: 10, top: 100, width: 20, height: 20 },
      b: { left: 40, top: 110, width: 10, height: 10 },
      missing: undefined,
    }, 2, 1, { left: 0, bottom: 200 });
    expect(out.a).toEqual({ left: 0, top: 160, width: 40, height: 40 });
    expect(out.b).toEqual({ left: 60, top: 180, width: 20, height: 20 });
    expect(out.missing).toBeUndefined();
    expect(boundsOf(Object.values(out))).toEqual({ left: 0, top: 160, width: 80, height: 40 });
  });
});

describe('touch HUD action list', () => {
  it('stacks rows down the right side above the close button', () => {
    const S = hudScale(1920, 897);
    const L = popupLayout(1920, 897, S, 3);
    expect(L.panel.left + L.panel.width).toBe(1920);
    expect(L.rows).toHaveLength(3);
    expect(L.rows[1].top).toBeGreaterThan(L.rows[0].top);
    expect(L.rows[2].top + L.rows[2].height).toBeLessThan(L.close.top);
    expect(L.blocker).toEqual({ left: 0, top: 0, width: 1920, height: 897 });
  });

  it('squeezes long lists so they still fit, up to the row limit', () => {
    const S = hudScale(844, 390);
    const L = popupLayout(844, 390, S, 50);
    expect(L.rows).toHaveLength(HUD_POPUP.maxRows);
    const last = L.rows[L.rows.length - 1];
    expect(last.top + last.height).toBeLessThanOrEqual(L.close.top);
  });

  it('is wider on a phone than its scaled size so names fit', () => {
    const S = hudScale(844, 390);
    expect(popupLayout(844, 390, S, 1).panel.width).toBeGreaterThan(HUD_POPUP.width * S);
  });

  it('labels stacks', () => {
    expect(popupRowText('Medpac', 3)).toBe('Medpac (3)');
    expect(popupRowText('Medpac', 1)).toBe('Medpac');
    expect(popupRowText('Medpac')).toBe('Medpac');
  });
});

describe('touch HUD setting', () => {
  it('reads, writes and parses the mode', () => {
    delete ini[INI_TOUCH_HUD];
    expect(getTouchHudMode()).toBe(TouchHudMode.Auto);
    setTouchHudMode(TouchHudMode.Off);
    expect(ini[INI_TOUCH_HUD]).toBe(TouchHudMode.Off);
    expect(getTouchHudMode()).toBe(TouchHudMode.Off);
    ini[INI_TOUCH_HUD] = 7;
    expect(getTouchHudMode()).toBe(TouchHudMode.Auto);
    expect(parseTouchHudMode('ON')).toBe(TouchHudMode.On);
    expect(parseTouchHudMode('2')).toBe(TouchHudMode.Off);
    expect(parseTouchHudMode('maybe')).toBeUndefined();
  });

  it('shows on touch screens in auto, and follows on/off otherwise', () => {
    expect(touchHudWanted(TouchHudMode.Auto, true)).toBe(true);
    expect(touchHudWanted(TouchHudMode.Auto, false)).toBe(false);
    expect(touchHudWanted(TouchHudMode.On, false)).toBe(true);
    expect(touchHudWanted(TouchHudMode.Off, true)).toBe(false);
  });
});
