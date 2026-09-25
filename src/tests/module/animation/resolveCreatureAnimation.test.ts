/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';
import { GameEngineType } from '@/enums/engine/GameEngineType';
import type { SWAnimation } from '@/engine/rules/SWAnimation';
import { resolveCreatureAnimation } from '@/module/animation/resolveCreatureAnimation';
import type { CreatureAnimationContext } from '@/module/animation/CreatureAnimationContext';

function stubAnim(index: number, name = `anim_${index}`): SWAnimation {
  return { index, name, nameLower: name.toLowerCase() } as SWAnimation;
}

function makeTable(indices: number[]): SWAnimation[] {
  const max = Math.max(...indices);
  const table: SWAnimation[] = new Array(max + 1);
  for(const i of indices){
    table[i] = stubAnim(i);
  }
  return table;
}

const healthy: CreatureAnimationContext = {
  simple: false,
  injured: false,
  poisoned: false,
  diseased: false,
  weaponType: 0,
  gameKey: GameEngineType.KOTOR,
};

describe('resolveCreatureAnimation', () => {
  it('maps healthy vs simple pause', () => {
    const animations = makeTable([6, 8, 15, 256]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.PAUSE, healthy, animations)).toBe(animations[6]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.PAUSE, { ...healthy, simple: true }, animations)
    ).toBe(animations[256]);
  });

  it('maps poisoned/diseased pause to drunk row 15', () => {
    const animations = makeTable([6, 15]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.PAUSE, { ...healthy, poisoned: true }, animations)
    ).toBe(animations[15]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.PAUSE2, { ...healthy, diseased: true }, animations)
    ).toBe(animations[15]);
  });

  it('maps injured walk and run', () => {
    const animations = makeTable([1, 4, 0, 2]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.WALKING, { ...healthy, injured: true }, animations)
    ).toBe(animations[1]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.RUNNING, { ...healthy, injured: true }, animations)
    ).toBe(animations[4]);
  });

  it('maps walking by weapon type including default row 0', () => {
    const animations = makeTable([0, 338, 341, 339, 340]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.WALKING, { ...healthy, weaponType: 2 }, animations)
    ).toBe(animations[338]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.WALKING, { ...healthy, weaponType: 0 }, animations)
    ).toBe(animations[0]);
  });

  it('maps walking-back with same weapon walk set', () => {
    const animations = makeTable([0, 338, 253]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.WALKING_BACK, { ...healthy, weaponType: 2 }, animations)
    ).toBe(animations[338]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.WALKING_BACK, { ...healthy, simple: true }, animations)
    ).toBe(animations[253]);
  });

  it('maps running by weapon type', () => {
    const animations = makeTable([2, 342, 343, 345, 3]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.RUNNING, { ...healthy, weaponType: 1 }, animations)
    ).toBe(animations[2]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.RUNNING, { ...healthy, weaponType: 2 }, animations)
    ).toBe(animations[345]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.RUNNING, { ...healthy, weaponType: 3 }, animations)
    ).toBe(animations[343]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.RUNNING, { ...healthy, weaponType: 7 }, animations)
    ).toBe(animations[342]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.RUNNING, { ...healthy, weaponType: 9 }, animations)
    ).toBe(animations[342]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.RUNNING, healthy, animations)
    ).toBe(animations[2]);
  });

  it('maps ready / damaged / blaster / wield / flourish via row helpers', () => {
    const animations = makeTable([249, 303, 109, 110, 378, 91]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.READY, healthy, animations)
    ).toBe(animations[249]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.DAMAGED, healthy, animations)
    ).toBe(animations[303]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.BLASTER_DEFLECTION_1H, { ...healthy, weaponType: 2 }, animations)
    ).toBe(animations[109]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.BLASTER_DEFLECTION_2H, { ...healthy, weaponType: 2 }, animations)
    ).toBe(animations[110]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.MELEE_WIELD, healthy, animations)
    ).toBe(animations[378]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.FLOURISH, { ...healthy, weaponType: 1 }, animations)
    ).toBe(animations[91]);
    expect(
      resolveCreatureAnimation(ModuleCreatureAnimState.MELEE_COMBAT_WIELD, { ...healthy, weaponType: 1 }, animations)
    ).toBe(animations[91]);
  });

  it('maps direct social/talk and TSL constants', () => {
    const animations = makeTable([31, 18, 25, 302, 301, 567]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.GREETING, healthy, animations)).toBe(animations[31]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.LISTEN, healthy, animations)).toBe(animations[18]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.TALK_NORMAL, healthy, animations)).toBe(animations[25]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.DODGE, healthy, animations)).toBe(animations[302]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.PARRY, healthy, animations)).toBe(animations[301]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.DIVE_ROLL, healthy, animations)).toBe(animations[567]);
  });

  it('maps meditate/worship, castout, kid talk, kneeling, knockdown-lp, damage2', () => {
    const animations = makeTable([24, 62, 63, 64, 65, 66, 67, 84, 115, 303, 383, 384, 385]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.MEDITATE, healthy, animations)).toBe(animations[24]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.WORSHIP, healthy, animations)).toBe(animations[24]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.CASTOUT1, healthy, animations)).toBe(animations[62]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.CASTOUT1_LP, healthy, animations)).toBe(animations[63]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.CASTOUT2, healthy, animations)).toBe(animations[64]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.CASTOUT2_LP, healthy, animations)).toBe(animations[65]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.CASTOUT3, healthy, animations)).toBe(animations[66]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.CASTOUT3_LP, healthy, animations)).toBe(animations[67]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.DAMAGE2, healthy, animations)).toBe(animations[303]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.KID_TALK_ANGRY, healthy, animations)).toBe(animations[384]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.KID_TALK_SAD, healthy, animations)).toBe(animations[385]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.KNEELING, healthy, animations)).toBe(animations[383]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.KNOCKED_DOWN_LP, healthy, animations)).toBe(animations[84]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.KNOCKED_DOWN2_LP, healthy, animations)).toBe(animations[84]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.POWER_ATTACK_SS, healthy, animations)).toBe(animations[115]);
  });

  it('maps droid utility rows by game key', () => {
    const animations = makeTable([392, 393, 537, 538]);

    expect(
      resolveCreatureAnimation(
        ModuleCreatureAnimState.DROID_UTILITY_USE,
        { ...healthy, gameKey: GameEngineType.KOTOR },
        animations,
      )
    ).toBe(animations[392]);
    expect(
      resolveCreatureAnimation(
        ModuleCreatureAnimState.DROID_UTILITY_USE_LP,
        { ...healthy, gameKey: GameEngineType.KOTOR },
        animations,
      )
    ).toBe(animations[393]);

    expect(
      resolveCreatureAnimation(
        ModuleCreatureAnimState.DROID_UTILITY_USE,
        { ...healthy, gameKey: GameEngineType.TSL },
        animations,
      )
    ).toBe(animations[537]);
    expect(
      resolveCreatureAnimation(
        ModuleCreatureAnimState.DROID_UTILITY_USE_LP,
        { ...healthy, gameKey: GameEngineType.TSL },
        animations,
      )
    ).toBe(animations[538]);
  });

  it('returns undefined for unknown constants', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const animations = makeTable([6]);
    expect(resolveCreatureAnimation(99999, healthy, animations)).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
