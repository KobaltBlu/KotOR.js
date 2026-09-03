/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  extentToCenteredPosition,
  hitCheckMouseLocal,
  hitCheckMouseWorldBox,
  listLocalFromWorldBox,
  truncDiv,
} from "@/gui/GUICoord";

describe("listLocalFromWorldBox (dialog-style docked lists)", () => {
  // Normal inventory-style list: extent matches visual box under centered panel.
  it("matches panelLocal − extent for a size-centered list", () => {
    const panel = { left: 0, top: 0, width: 800, height: 600 };
    const list = { left: 10, top: 50, width: 300, height: 200 };
    const widget = extentToCenteredPosition(list, panel.width, panel.height);
    const box = {
      minX: widget.x - truncDiv(list.width, 2),
      minY: widget.y - truncDiv(list.height, 2),
      maxX: widget.x + truncDiv(list.width, 2),
      maxY: widget.y + truncDiv(list.height, 2),
    };

    // Panel-local (20, 60) → near top-left of list content
    const panelLocal = { x: 20, y: 60 };
    const uiX = panelLocal.x - truncDiv(panel.width, 2);
    const uiY = truncDiv(panel.height, 2) - panelLocal.y;

    const fromBox = listLocalFromWorldBox(uiX, uiY, box.minX, box.minY, box.maxY);
    expect(fromBox).toEqual({
      x: panelLocal.x - list.left,
      y: panelLocal.y - list.top,
    });
  });

  it("hits a docked dialog reply list when extent.left/top are viewport hacks", () => {
    // InGameDialog writes viewport coords into LB_REPLIES.extent for layout.
    const listW = 544;
    const listH = 98;
    const vpW = 1280;
    const vpH = 720;
    const extentHack = {
      left: -truncDiv(vpW, 2) + truncDiv(listW, 2) + 16,
      top: truncDiv(vpH, 2) - truncDiv(listH, 2),
      width: listW,
      height: listH,
    };
    // Widget ends up at bottom-left-ish (same math as calculatePosition vs 544×100 parent)
    const widget = extentToCenteredPosition(extentHack, listW, 100);
    const box = {
      minX: widget.x - truncDiv(listW, 2),
      minY: widget.y - truncDiv(listH, 2),
      maxX: widget.x + truncDiv(listW, 2),
      maxY: widget.y + truncDiv(listH, 2),
    };

    const row = { left: 0, top: 0, width: listW, height: 24 };
    // Click center of first row in UI space
    const uiX = widget.x;
    const uiY = box.maxY - 12;

    expect(hitCheckMouseWorldBox(uiX, uiY, box.minX, box.minY, box.maxX, box.maxY)).toBe(true);

    const listLocal = listLocalFromWorldBox(uiX, uiY, box.minX, box.minY, box.maxY);
    expect(hitCheckMouseLocal(row, listLocal.x, listLocal.y)).toBe(true);

    // Regress: panel-local path with hacked extent misses (dialog panel is mid-screen)
    const panelLocalY = 50; // inside centered 100px dialog panel, not at bottom list
    const brokenListLocalY = panelLocalY - extentHack.top;
    expect(hitCheckMouseLocal(row, truncDiv(listW, 2), brokenListLocalY)).toBe(false);
  });
});
