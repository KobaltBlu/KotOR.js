/**
 * Linked effects: children inherit the link's expiry when applied.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/effects/effect-bonuses', () => ({ getForceResistanceBonus: () => 0 }));
jest.mock('@engine/module/guards/isCreature', () => ({ isCreature: () => false }));
jest.mock('@engine/runtime/context', () => ({
  getDefaultRuntimeContext: () => ({ getModule: () => undefined, nextEffectId: () => 1 }),
}));

import { GameObjectEffectService } from '@engine/module/gameobject/GameObjectEffectService';
import { GameEffectType } from '@core/enums/effects/GameEffectType';

function child(type: number){
  return {
    type,
    expireDay: 0,
    expireTime: 0,
    setDurationType: jest.fn(),
    setDuration: jest.fn(),
    setExpireDay(v: number){ this.expireDay = v; },
    setExpireTime(v: number){ this.expireTime = v; },
  };
}

describe('GameObjectEffectService linked effects', () => {
  it('copies the link expiry onto both children before applying them', () => {
    const applied: any[] = [];
    const host: any = { effects: [], addEffect: (e: any) => applied.push({ type: e.type, day: e.expireDay, time: e.expireTime }) };
    const service = new GameObjectEffectService(host);
    const link: any = {
      type: GameEffectType.EffectLink,
      expireDay: 7,
      expireTime: 123456,
      effect1: child(0x3C),
      effect2: child(0x2D),
    };

    service.addEffect(link, 1, 0.1);

    expect(applied).toEqual([
      { type: 0x3C, day: 7, time: 123456 },
      { type: 0x2D, day: 7, time: 123456 },
    ]);
  });

  it('one-shot effects never join the effect list', () => {
    const host: any = { effects: [] };
    const service = new GameObjectEffectService(host);
    const effect: any = {
      type: GameEffectType.EffectForceResisted,
      initialized: true,
      id: 1,
      applied: false,
      discardAfterApply: true,
      setAttachedObject: jest.fn(),
      loadModel: jest.fn(),
      onApply(){ this.applied = true; },
    };
    service.addEffect(effect);
    expect(effect.applied).toBe(true);
    expect(host.effects).toHaveLength(0);
  });
});
