/**
 * SpeakString notify plan + heardString drain + dead-attack prune.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import {
  drainHeardStringHead,
  getSpeakStringNotifyPlan,
} from '@/combat/speak-string-broadcast';
import { filterLiveAttackActions } from '@/combat/prune-dead-attack-actions';
import { TalkVolume } from '@/enums/engine/TalkVolume';
import { CombatActionType } from '@/enums/combat/CombatActionType';

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

describe('filterLiveAttackActions', () => {
  it('keeps non-attack actions and live-target attacks; drops dead targets', () => {
    const list = [
      { actionType: CombatActionType.ATTACK, target: { isDead: () => true } },
      { actionType: CombatActionType.ATTACK, target: { isDead: () => false } },
      { actionType: CombatActionType.CAST_SPELL, target: { isDead: () => true } },
      { actionType: CombatActionType.ATTACK_USE_FEAT, target: null },
    ];
    const kept = filterLiveAttackActions(list as any);
    expect(kept).toHaveLength(2);
    expect(kept[0].actionType).toBe(CombatActionType.ATTACK);
    expect(kept[0].target?.isDead?.()).toBe(false);
    expect(kept[1].actionType).toBe(CombatActionType.CAST_SPELL);
  });
});
