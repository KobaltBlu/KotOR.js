/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { placeButtonGlyphs, type GlyphTarget, type GlyphViewport } from "@engine/controls/GamepadButtonGlyphs";

const viewport: GlyphViewport = { width: 800, height: 600, scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };

function control(minX: number, minY: number, maxX: number, maxY: number){
  return { box: { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } } };
}

describe('placeButtonGlyphs', () => {
  it('puts the symbol inside the left edge of a wide button, vertically centered', () => {
    // 140 x 30 button centered on screen: CSS top-left is (330, 285).
    const [p] = placeButtonGlyphs([{ button: 'b', control: control(-70, -15, 70, 15) }], viewport);
    expect(p.buttons).toEqual(['b']);
    expect(p.size).toBe(24);
    expect(p.top).toBe(285 + 3);
    expect(p.left).toBe(330 + 4);
  });

  it('puts the symbol above a small control', () => {
    const [p] = placeButtonGlyphs([{ button: 'lb', control: control(-15, -15, 15, 15) }], viewport);
    expect(p.top).toBe(285 - p.size - 2);
    expect(p.left).toBe(Math.round(385 + (30 - p.size) / 2));
  });

  it('groups buttons bound to the same control', () => {
    const c = control(-100, -20, 100, 20);
    const out = placeButtonGlyphs([{ button: 'a', control: c }, { button: 'start', control: c }, { button: 'a', control: c }], viewport);
    expect(out).toHaveLength(1);
    expect(out[0].buttons).toEqual(['a', 'start']);
  });

  it('applies the canvas scale and offset', () => {
    const scaled: GlyphViewport = { ...viewport, scaleX: 2, scaleY: 2, offsetX: 10, offsetY: 20 };
    const [p] = placeButtonGlyphs([{ button: 'y', control: control(-70, -15, 70, 15) }], scaled);
    expect(p.size).toBe(28);
    expect(p.top).toBe(285 * 2 + 20 + (60 - 28) / 2);
  });

  it('skips empty boxes', () => {
    expect(placeButtonGlyphs([{ button: 'x', control: control(0, 0, 0, 0) } as GlyphTarget], viewport)).toEqual([]);
  });
});
