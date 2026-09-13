/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { ModuleDoorAnimState } from '@/enums/module/ModuleDoorAnimState';
import { ModulePlaceableAnimState } from '@/enums/module/ModulePlaceableAnimState';
import type { SWAnimation } from '@/engine/rules/SWAnimation';
import { resolveDoorAnimation } from '@/module/animation/resolveDoorAnimation';
import { resolvePlaceableAnimation } from '@/module/animation/resolvePlaceableAnimation';

function stubAnim(animationId: number): SWAnimation {
  return { index: animationId, animationId, name: `id_${animationId}`, nameLower: `id_${animationId}` } as SWAnimation;
}

describe('resolveDoorAnimation', () => {
  it('maps known door constants via animationIdMap', () => {
    const map = new Map<number, SWAnimation>([
      [327, stubAnim(327)],
      [333, stubAnim(333)],
      [334, stubAnim(334)],
    ]);
    expect(resolveDoorAnimation(ModuleDoorAnimState.DEFAULT, map)).toBe(map.get(327));
    expect(resolveDoorAnimation(ModuleDoorAnimState.CLOSED, map)).toBe(map.get(333));
    expect(resolveDoorAnimation(ModuleDoorAnimState.OPENING1, map)).toBe(map.get(334));
  });

  it('returns undefined for unknown constants', () => {
    expect(resolveDoorAnimation(99999, new Map())).toBeUndefined();
  });
});

describe('resolvePlaceableAnimation', () => {
  it('maps known placeable constants via animationIdMap', () => {
    const map = new Map<number, SWAnimation>([
      [304, stubAnim(304)],
      [308, stubAnim(308)],
      [316, stubAnim(316)],
    ]);
    expect(resolvePlaceableAnimation(ModulePlaceableAnimState.DEFAULT, map)).toBe(map.get(304));
    expect(resolvePlaceableAnimation(ModulePlaceableAnimState.ACTIVATE, map)).toBe(map.get(308));
    expect(resolvePlaceableAnimation(ModulePlaceableAnimState.ANIMLOOP01, map)).toBe(map.get(316));
  });

  it('returns undefined for unknown constants', () => {
    expect(resolvePlaceableAnimation(99999, new Map())).toBeUndefined();
  });
});
