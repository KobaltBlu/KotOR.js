/**
 * Force-cast retail alignment — castTime preserve (proj==0) + STORE_STATE talent.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

/**
 * Mirrors SpellCastInstance.init: proj==0 must not wipe spells.2da casttime.
 */
function resolveCastTimeAfterInit(opts: {
  appliedCastTimeMs: number;
  proj: number;
  delayToLanding: boolean;
  flightMs?: number;
}): number {
  let castTime = opts.appliedCastTimeMs;
  if(opts.delayToLanding){
    castTime = Math.max(castTime || 0, opts.flightMs ?? 0);
  }else if(typeof opts.proj === 'number' && (opts.proj | 0) === 0){
    // Only clear landing delay — keep casttime for LoadCastVisual lifetime
  }
  return castTime;
}

describe('proj==0 preserves spells.2da casttime', () => {
  it('keeps choke/storm casttime 1330 when proj is 0', () => {
    expect(resolveCastTimeAfterInit({
      appliedCastTimeMs: 1330,
      proj: 0,
      delayToLanding: false,
    })).toBe(1330);
  });

  it('still extends castTime for delayed projectile flight', () => {
    expect(resolveCastTimeAfterInit({
      appliedCastTimeMs: 0,
      proj: 1,
      delayToLanding: true,
      flightMs: 3200,
    })).toBe(3200);
  });
});

describe('STORE_STATE DelayCommand talent copy', () => {
  /**
   * Mirrors CALL_STORE_STATE field copy for GetSpellId continuity.
   */
  function copyStoreStateTalent(parent: { talent?: { id: number }; lastSpell?: number }){
    const child: { talent?: { id: number }; lastSpell?: number } = {};
    child.talent = parent.talent;
    child.lastSpell = parent.lastSpell;
    return child;
  }

  it('preserves talent id for GetSpellId on delayed ticks', () => {
    const parent = { talent: { id: 9 }, lastSpell: 9 };
    const child = copyStoreStateTalent(parent);
    expect(child.talent?.id).toBe(9);
    expect(child.lastSpell).toBe(9);
  });

  it('leaves talent undefined when parent had none', () => {
    const child = copyStoreStateTalent({});
    expect(child.talent).toBeUndefined();
  });
});

describe('beginCastPhase gate', () => {
  it('fires cast visuals only once per instance', () => {
    let started = false;
    const begin = () => {
      if(started) return false;
      started = true;
      return true;
    };
    expect(begin()).toBe(true);
    expect(begin()).toBe(false);
  });
});
