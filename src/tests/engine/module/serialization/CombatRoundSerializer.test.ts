/**
 * CombatRoundSerializer nested-struct round trip.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameKey: 0,
    GameObjectManager: {
      GetClientObjectById: () => undefined,
      GetObjectById: () => undefined,
    },
    PartyManager: { getCurrentPlayer: () => undefined },
    TwoDAManager: { datatables: new Map() },
    FeedbackMessageManager: { AddMessage: jest.fn() },
    TLKManager: { GetStringById: () => ({ Value: '' }) },
    AutoPauseManager: { SignalAutoPauseEvent: jest.fn() },
  },
}));

jest.mock('@engine/odyssey', () => ({
  OdysseyModelAnimation: {
    GetAnimation2DA: () => undefined,
  },
}));

import { CombatRound } from '@engine/combat/CombatRound';
import { CombatRoundSerializer } from '@engine/module/serialization/CombatRoundSerializer';

describe('CombatRoundSerializer', () => {
  it('round-trips a minimal active combat round', () => {
    const owner = { id: 0x4001 } as any;
    const source = new CombatRound(owner);
    source.roundStarted = true;
    source.timer = 900;
    source.roundLength = 3000;
    source.currentAttack = 1;
    source.attackList[0].attackGroup = 2;

    const struct = CombatRoundSerializer.serialize(source);
    const target = new CombatRound(owner);

    expect(CombatRoundSerializer.deserialize(target, struct)).toBe(true);
    expect(target.roundStarted).toBe(true);
    expect(target.timer).toBe(900);
    expect(target.roundLength).toBe(3000);
    expect(target.currentAttack).toBe(1);
    expect(target.attackList[0].attackGroup).toBe(2);
  });
});
