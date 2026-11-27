/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  applyPanelOffsetToLetterboxLocal,
  extentToCenteredPosition,
  hitCheckMouseLocal,
  panelLocalFromCenteredUI,
} from "@engine/gui/GUICoord";

/** Zero GFF design origin so a size-centered panel matches hit tests (MenuContainer). */
function centerPanelOrigin(panel: { left: number; top: number; width: number; height: number }) {
  return { left: 0, top: 0, width: panel.width, height: panel.height };
}

describe("panel offset → hitbox (MenuTop / CharGen)", () => {
  const panel = { left: 0, top: 0, width: 640, height: 100 };
  // Button near top of MenuTop design
  const btn = { left: 100, top: 20, width: 60, height: 40 };

  it("without offset, centered UI over button hits", () => {
    // Panel-local (130, 40) is inside btn; invert to centered UI about 640×100 panel
    // x_local = uiX + 320 → uiX = 130 - 320 = -190
    // y_local = 50 - uiY → uiY = 50 - 40 = 10
    const local = panelLocalFromCenteredUI(-190, 10, panel, 0, 0);
    expect(local).toEqual({ x: 130, y: 40 });
    expect(hitCheckMouseLocal(btn, local.x, local.y)).toBe(true);
  });

  it("MenuTop offset.y=198: click at translated visual still hits (was the bug)", () => {
    // Same design-local point as above, but panel widget is translated +198 Y-up.
    // Visual click is therefore at uiY = 10 + 198 = 208.
    const local = panelLocalFromCenteredUI(-190, 208, panel, 0, 198);
    expect(local).toEqual({ x: 130, y: 40 });
    expect(hitCheckMouseLocal(btn, local.x, local.y)).toBe(true);
  });

  it("without subtracting offset, the same visual click would miss (regress guard)", () => {
    const broken = panelLocalFromCenteredUI(-190, 208, panel, 0, 0);
    expect(hitCheckMouseLocal(btn, broken.x, broken.y)).toBe(false);
  });

  it("CharGen offset.x=-180 shifts local X correctly", () => {
    // Visual click at uiX = -190 + (-180) = -370 with offset applied
    const local = panelLocalFromCenteredUI(-370, 10, panel, -180, 0);
    expect(local).toEqual({ x: 130, y: 40 });
    expect(hitCheckMouseLocal(btn, local.x, local.y)).toBe(true);
  });

  it("letterbox path inverts Y when applying Y-up offset", () => {
    // Click at visual (panel already translated +198 Y-up): letterbox local is 198 too small.
    const fromVisualClick = { x: 130, y: 40 - 198 };
    const restored = applyPanelOffsetToLetterboxLocal(fromVisualClick, 0, 198);
    expect(restored).toEqual({ x: 130, y: 40 });
    expect(hitCheckMouseLocal(btn, restored.x, restored.y)).toBe(true);
  });
});

describe("centered overlay dialog hitbox (K1 container)", () => {
  // container.gui GFF origin (164,68) ≈ centered on 640×480; KotOR.js centers by
  // panel size at widget (0,0) and zeros the origin so hit tests agree.
  const gffPanel = { left: 164, top: 68, width: 305, height: 327 };
  const panel = centerPanelOrigin(gffPanel);
  const btnOk = { left: 10, top: 243, width: 285, height: 22 };
  const btnCentered = extentToCenteredPosition(btnOk, panel.width, panel.height);

  it("size-centered widget stays at (0,0) after origin zeroing", () => {
    expect(extentToCenteredPosition(panel, panel.width, panel.height)).toEqual({ x: 0, y: 0 });
  });

  it("click on the centered button hits when origin is zeroed", () => {
    const local = panelLocalFromCenteredUI(btnCentered.x, btnCentered.y, panel, 0, 0);
    expect(hitCheckMouseLocal(btnOk, local.x, local.y)).toBe(true);
  });

  it("regress guard: keeping GFF origin with centered draw makes the click miss", () => {
    const local = panelLocalFromCenteredUI(btnCentered.x, btnCentered.y, gffPanel, 0, 0);
    expect(hitCheckMouseLocal(btnOk, local.x, local.y)).toBe(false);
  });
});

describe("centered overlay dialog hitbox (K1 skillinfo / CharGen ShowGranted)", () => {
  // skillinfo.gui GFF origin (154,118); same zero-origin fix as MenuContainer.
  const gffPanel = { left: 154, top: 118, width: 333, height: 231 };
  const panel = centerPanelOrigin(gffPanel);
  const btnOk = { left: 117, top: 201, width: 100, height: 22 };
  const btnCentered = extentToCenteredPosition(btnOk, panel.width, panel.height);

  it("click on BTN_OK hits when origin is zeroed", () => {
    const local = panelLocalFromCenteredUI(btnCentered.x, btnCentered.y, panel, 0, 0);
    expect(hitCheckMouseLocal(btnOk, local.x, local.y)).toBe(true);
  });

  it("regress guard: keeping GFF origin (154,118) makes BTN_OK miss", () => {
    const local = panelLocalFromCenteredUI(btnCentered.x, btnCentered.y, gffPanel, 0, 0);
    expect(hitCheckMouseLocal(btnOk, local.x, local.y)).toBe(false);
  });
});
