/**
 * @jest-environment node
 *
 * The global fade must draw over normal menus (HUD, dialog) but under modal
 * panels, so the death message box stays readable once the screen is black.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));

import { FadeOverlayManager } from '@engine/managers/FadeOverlayManager';

function readMenuManagerConstant(name: string): number {
  const src = fs.readFileSync(srcPath('engine', 'managers', 'MenuManager.ts'), 'utf8');
  const match = src.match(new RegExp(`static readonly ${name}\\s*=\\s*(\\d+)`));
  if(!match) throw new Error(`${name} not found in MenuManager.ts`);
  return parseInt(match[1], 10);
}

describe('FadeOverlayManager render order', () => {
  const modalBase = readMenuManagerConstant('GUI_MODAL_BASE');
  const stride = readMenuManagerConstant('GUI_LAYER_STRIDE');

  it('draws below the first modal layer, including its background sprites', () => {
    // GameMenu puts backgroundVoidSprite at bias - 6 and root panel chrome at bias - 1.
    expect(FadeOverlayManager.FADE_RENDER_ORDER).toBeLessThan(modalBase - 6);
  });

  it('writes no depth, so depth-tested GUI quads drawn after it still show', () => {
    expect(FadeOverlayManager.material.depthWrite).toBe(false);
    expect(FadeOverlayManager.material.depthTest).toBe(false);
  });

  it('draws above the non-modal menu layers', () => {
    const highestMenuBias = modalBase - stride;
    expect(FadeOverlayManager.FADE_RENDER_ORDER).toBeGreaterThan(highestMenuBias + 1000);
  });
});
