/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import type { SWAnimation } from '@engine/rules/SWAnimation';
import { resolveDebilitatedCreatureAnimation } from '@engine/module/animation/resolveDebilitatedCreatureAnimation';

function stubAnim(index: number): SWAnimation {
  return { index, name: `anim_${index}`, nameLower: `anim_${index}` } as SWAnimation;
}

function makeTable(indices: number[]): SWAnimation[] {
  const max = Math.max(...indices);
  const table: SWAnimation[] = new Array(max + 1);
  for(const i of indices){
    table[i] = stubAnim(i);
  }
  return table;
}

describe('resolveDebilitatedCreatureAnimation', () => {
  it('returns undefined when debilitatedState is 0', () => {
    const animations = makeTable([15]);
    expect(
      resolveDebilitatedCreatureAnimation(0, {
        simple: false,
        fp_push_played: false,
        fp_land_played: false,
        fp_getup_played: false,
      }, animations)
    ).toBeUndefined();
  });

  it('maps choke simple vs normal', () => {
    const animations = makeTable([72, 264]);
    expect(
      resolveDebilitatedCreatureAnimation(7, {
        simple: false,
        fp_push_played: false,
        fp_land_played: false,
        fp_getup_played: false,
      }, animations)
    ).toBe(animations[72]);
    expect(
      resolveDebilitatedCreatureAnimation(7, {
        simple: true,
        fp_push_played: false,
        fp_land_played: false,
        fp_getup_played: false,
      }, animations)
    ).toBe(animations[264]);
  });

  it('maps force-push phases then undefined when complete', () => {
    const animations = makeTable([84, 85, 86]);
    expect(
      resolveDebilitatedCreatureAnimation(9, {
        simple: false,
        fp_push_played: false,
        fp_land_played: false,
        fp_getup_played: false,
      }, animations)
    ).toBe(animations[84]);
    expect(
      resolveDebilitatedCreatureAnimation(9, {
        simple: false,
        fp_push_played: true,
        fp_land_played: false,
        fp_getup_played: false,
      }, animations)
    ).toBe(animations[85]);
    expect(
      resolveDebilitatedCreatureAnimation(9, {
        simple: false,
        fp_push_played: true,
        fp_land_played: true,
        fp_getup_played: false,
      }, animations)
    ).toBe(animations[86]);
    expect(
      resolveDebilitatedCreatureAnimation(9, {
        simple: false,
        fp_push_played: true,
        fp_land_played: true,
        fp_getup_played: true,
      }, animations)
    ).toBeUndefined();
  });
});
