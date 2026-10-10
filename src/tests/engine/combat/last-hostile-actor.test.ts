/**
 * lastHostileActor / get hostile actor parity + BroadcastDialog HEARD gate.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { CombatData } from '@engine/combat/CombatData';
import { GameObjectType } from '@core/enums/module/GameObjectType';
import { PerceptionMask } from '@engine/enums/engine/PerceptionMask';
import {
  getLastHostileActor,
  assignHostileActor,
} from '@engine/combat/last-hostile-actor';
import {
  drainHeardStringHead,
  listenerHearsSpeaker,
} from '@engine/combat/speak-string-broadcast';

function makeCreature(id: number, opts: { plot?: boolean; factionId?: number; dead?: boolean } = {}){
  const c: any = {
    id,
    objectType: GameObjectType.GameObject | GameObjectType.Creature,
    plot: !!opts.plot,
    factionId: opts.factionId ?? 1,
    isDead: () => !!opts.dead,
    getDeadTemp: () => false,
  };
  c.combatData = new CombatData(c);
  return c;
}

describe('lastHostileActor / assign hostile actor', () => {
  it('stores attacker and returns it from getLastHostileActor', () => {
    const self = makeCreature(1, { factionId: 1 });
    const foe = makeCreature(2, { factionId: 2 });
    assignHostileActor(self, foe);
    expect(self.combatData.lastHostileActor).toBe(foe);
    expect(getLastHostileActor(self)).toBe(foe);
  });

  it('does not prefer lastAttackTarget over lastHostileActor', () => {
    const self = makeCreature(1, { factionId: 1 });
    const foe = makeCreature(2, { factionId: 2 });
    const other = makeCreature(3, { factionId: 2 });
    self.combatData.lastAttackTarget = other;
    self.combatData.lastAttacker = foe;
    assignHostileActor(self, foe);
    expect(getLastHostileActor(self)).toBe(foe);
    expect(getLastHostileActor(self)).not.toBe(other);
  });

  it('refuses same-faction overwrite', () => {
    const self = makeCreature(1, { factionId: 5 });
    const ally = makeCreature(2, { factionId: 5 });
    assignHostileActor(self, ally);
    expect(self.combatData.lastHostileActor).toBeUndefined();
  });

  it('clears on plot objects', () => {
    const self = makeCreature(1, { plot: true, factionId: 1 });
    const foe = makeCreature(2, { factionId: 2 });
    assignHostileActor(self, foe);
    expect(self.combatData.lastHostileActor).toBeUndefined();
  });

  it('force-clear works for CancelCombat', () => {
    const self = makeCreature(1, { factionId: 1 });
    const foe = makeCreature(2, { factionId: 2 });
    assignHostileActor(self, foe);
    assignHostileActor(self, undefined, true);
    expect(self.combatData.lastHostileActor).toBeUndefined();
    expect(getLastHostileActor(self)).toBeUndefined();
  });

  it('clears and returns undefined when stored hostile is dead', () => {
    const self = makeCreature(1, { factionId: 1 });
    const foe = makeCreature(2, { factionId: 2 });
    assignHostileActor(self, foe);
    foe.isDead = () => true;
    expect(getLastHostileActor(self)).toBeUndefined();
    expect(self.combatData.lastHostileActor).toBeUndefined();
  });
});

describe('listenerHearsSpeaker (BroadcastDialog gate)', () => {
  it('requires HEARD perception bit for creature listeners', () => {
    const speaker = { id: 1 };
    const listener = {
      perceptionList: [{ object: speaker, data: PerceptionMask.SEEN }],
    };
    expect(listenerHearsSpeaker(listener, speaker)).toBe(false);
    listener.perceptionList[0].data = PerceptionMask.HEARD;
    expect(listenerHearsSpeaker(listener, speaker)).toBe(true);
    listener.perceptionList[0].data = PerceptionMask.SEEN_AND_HEARD;
    expect(listenerHearsSpeaker(listener, speaker)).toBe(true);
  });

  it('returns false with empty perception list', () => {
    expect(listenerHearsSpeaker({ perceptionList: [] }, {})).toBe(false);
  });
});

describe('GEN_I_WAS_ATTACKED listen drain', () => {
  it('drains unmatched head so GEN_I_WAS_ATTACKED can still fire', () => {
    const q = ['NOISE', 'GEN_I_WAS_ATTACKED'];
    drainHeardStringHead(q);
    expect(q[0]).toBe('GEN_I_WAS_ATTACKED');
  });
});
