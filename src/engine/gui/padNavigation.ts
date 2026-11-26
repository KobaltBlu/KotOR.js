/**
 * Pad / keyboard focus helpers for menus.
 *
 * Pure geometry so it can be tested without a renderer. Rectangles are in the
 * GUI scene's space, where y grows upward.
 *
 * @file padNavigation.ts
 */

export type PadDirection = 'up' | 'down' | 'left' | 'right';

export interface PadRect {
  /** Centre x. */
  x: number;
  /** Centre y (y grows upward). */
  y: number;
  w: number;
  h: number;
}

/**
 * Index of the candidate that the focus should move to from `from` when
 * pressing `dir`, or -1 when nothing lies that way. Prefers candidates that
 * overlap `from` on the cross axis, then the nearest along the direction.
 */
export function pickSpatialNeighbor(from: PadRect, candidates: readonly PadRect[], dir: PadDirection): number {
  let best = -1;
  let bestScore = Infinity;
  const vertical = dir === 'up' || dir === 'down';
  for(let i = 0; i < candidates.length; i++){
    const c = candidates[i];
    if(c === from) continue;

    // Distance along the direction, edge to edge, must point the right way.
    let along: number;
    switch(dir){
      case 'up':    along = (c.y - c.h / 2) - (from.y + from.h / 2); break;
      case 'down':  along = (from.y - from.h / 2) - (c.y + c.h / 2); break;
      case 'left':  along = (from.x - from.w / 2) - (c.x + c.w / 2); break;
      case 'right': along = (c.x - c.w / 2) - (from.x + from.w / 2); break;
    }
    // Allow small overlaps (controls in a tight stack), but the centre must
    // still be on the correct side.
    const centreAlong = vertical
      ? (dir === 'up' ? c.y - from.y : from.y - c.y)
      : (dir === 'right' ? c.x - from.x : from.x - c.x);
    if(centreAlong <= 0.5) continue;
    along = Math.max(0, along);

    // Gap on the cross axis (0 when the two overlap).
    const cross = vertical
      ? Math.max(0, Math.abs(c.x - from.x) - (c.w + from.w) / 2)
      : Math.max(0, Math.abs(c.y - from.y) - (c.h + from.h) / 2);
    const centreCross = vertical ? Math.abs(c.x - from.x) : Math.abs(c.y - from.y);

    const score = along + cross * 4 + centreCross * 0.1;
    if(score < bestScore){
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Index of the top-left-most rectangle (reading order), or -1 for an empty list. */
export function pickFirstInReadingOrder(rects: readonly PadRect[]): number {
  let best = -1;
  for(let i = 0; i < rects.length; i++){
    if(best < 0){ best = i; continue; }
    const a = rects[i];
    const b = rects[best];
    const aTop = a.y + a.h / 2;
    const bTop = b.y + b.h / 2;
    // Treat rows within a few pixels as the same line, then go left to right.
    if(Math.abs(aTop - bTop) <= 4){
      if(a.x - a.w / 2 < b.x - b.w / 2) best = i;
    }else if(aTop > bTop){
      best = i;
    }
  }
  return best;
}

/** Control names that mean "go back / close" when a menu has no explicit B button. */
export const PAD_BACK_BUTTON_NAMES = [
  'BTN_BACK', 'BTN_EXIT', 'BTN_CANCEL', 'BTN_CLOSE', 'BTN_RETURN',
  // Info boxes with a single OK close on B as well.
  'BTN_OK',
];

/** Index of the best back / cancel candidate in `names`, by priority, or -1. */
export function pickBackButtonName(names: readonly string[]): number {
  const upper = names.map((n) => String(n || '').toUpperCase());
  for(const wanted of PAD_BACK_BUTTON_NAMES){
    const idx = upper.indexOf(wanted);
    if(idx >= 0) return idx;
  }
  return -1;
}
