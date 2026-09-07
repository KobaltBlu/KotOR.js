/**
 * SpeakString notify plan + heardString drain + dead-attack prune.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {},
}));

jest.mock('@/combat/CombatAttackData', () => ({
  CombatAttackData: class {},
}));

jest.mock('@/engine/pathfinding/clear-line-of-sight', () => ({
  clearLineOfSight: () => true,
}));

jest.mock('@/combat/combat-projectile', () => ({
  getProjectileImpactPosition: () => undefined,
  spawnCombatProjectile: () => {},
}));

jest.mock('@/combat/ranged-impact-vfx', () => ({
  spawnWorldImpactVfx: () => {},
  VFX_COM_BLASTER_IMPACT_GROUND: 0,
}));

import {
  drainHeardStringHead,
  getSpeakStringNotifyPlan,
  listenerHearsSpeaker,
} from '@/combat/speak-string-broadcast';
import { CombatRound } from '@/combat/CombatRound';
import { TalkVolume } from '@/enums/engine/TalkVolume';
import { CombatActionType } from '@/enums/combat/CombatActionType';
import { PerceptionMask } from '@/enums/engine/PerceptionMask';

describe('getSpeakStringNotifyPlan', () => {
  it('notifies party on SILENT_TALK and TALK (not only SHOUT)', () => {
    expect(getSpeakStringNotifyPlan(TalkVolume.SILENT_TALK)).toEqual({
      range: 20,
      notifyCreatures: true,
      notifyParty: true,
    });
    expect(getSpeakStringNotifyPlan(TalkVolume.TALK).notifyParty).toBe(true);
    expect(getSpeakStringNotifyPlan(TalkVolume.WHISPER).notifyParty).toBe(true);
    expect(getSpeakStringNotifyPlan(TalkVolume.SHOUT).notifyParty).toBe(true);
  });
});

describe('drainHeardStringHead', () => {
  it('always shifts the head so unmatched shouts cannot stall', () => {
    const q = ['NO_MATCH', 'GEN_I_WAS_ATTACKED'];
    expect(drainHeardStringHead(q)).toBe('NO_MATCH');
    expect(q).toEqual(['GEN_I_WAS_ATTACKED']);
    expect(drainHeardStringHead(q)).toBe('GEN_I_WAS_ATTACKED');
    expect(q).toEqual([]);
  });
});

describe('listenerHearsSpeaker', () => {
  it('gates on HEARD bit (engine BroadcastDialog)', () => {
    const speaker = {};
    const listener = { perceptionList: [{ object: speaker, data: PerceptionMask.SEEN }] };
    expect(listenerHearsSpeaker(listener, speaker)).toBe(false);
    listener.perceptionList[0].data |= PerceptionMask.HEARD;
    expect(listenerHearsSpeaker(listener, speaker)).toBe(true);
  });
});

describe('filterLiveAttackActions', () => {
  it('keeps non-attack actions and live-target attacks; drops dead targets', () => {
    const list = [
      { actionType: CombatActionType.ATTACK, target: { isDead: () => true } },
      { actionType: CombatActionType.ATTACK, target: { isDead: () => false } },
      { actionType: CombatActionType.CAST_SPELL, target: { isDead: () => true } },
      { actionType: CombatActionType.ATTACK_USE_FEAT, target: null },
    ];
    const kept = CombatRound.filterLiveAttackActions(list as any);
    expect(kept).toHaveLength(2);
    expect(kept[0].actionType).toBe(CombatActionType.ATTACK);
    expect(kept[0].target?.isDead?.()).toBe(false);
    expect(kept[1].actionType).toBe(CombatActionType.CAST_SPELL);
  });
});
