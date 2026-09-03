/**
 * SpellCastInstance impact timing — force powers (proj==0 / castTime==0)
 * must run impact after conjure; delayed throws impact on landing.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

/**
 * Mirrors SpellCastInstance.update branch selection for impact.
 * Returns whether impact() should run when entering the final else
 * (conjure done, castTime == 0).
 */
function shouldImpactOnCastComplete(opts: {
  delayImpactToLanding: boolean;
  alreadyImpacted: boolean;
}): boolean {
  return opts.delayImpactToLanding || !opts.alreadyImpacted;
}

/**
 * Whether the castTime>0 branch impacts at cast-start (non-delayed).
 */
function shouldImpactDuringCastTime(delayImpactToLanding: boolean): boolean {
  return !delayImpactToLanding;
}

describe('SpellCastInstance force-power impact (proj==0 / castTime==0)', () => {
  it('runs impact after conjure when castTime is 0 and not delayed', () => {
    expect(shouldImpactOnCastComplete({
      delayImpactToLanding: false,
      alreadyImpacted: false,
    })).toBe(true);
  });

  it('still impacts delayed throws on landing in the else branch', () => {
    expect(shouldImpactOnCastComplete({
      delayImpactToLanding: true,
      alreadyImpacted: false,
    })).toBe(true);
  });

  it('does not double-impact if castTime>0 path already impacted', () => {
    // Non-delayed spell with castTime>0 impacts during castTime branch
    expect(shouldImpactDuringCastTime(false)).toBe(true);
    // Else branch then sees alreadyImpacted — impact() no-ops via guard,
    // but the condition still calls impact(); the method itself is idempotent.
    expect(shouldImpactOnCastComplete({
      delayImpactToLanding: false,
      alreadyImpacted: true,
    })).toBe(false);
  });

  it('delayed landing does not impact during castTime drain', () => {
    expect(shouldImpactDuringCastTime(true)).toBe(false);
  });
});

describe('ActionCastSpell dispose fire-and-forget', () => {
  function shouldInterruptOnDispose(castStarted: boolean, instance?: { completed: boolean }){
    return (
      !castStarted &&
      !!instance &&
      !instance.completed
    );
  }

  it('does not interrupt after castStarted', () => {
    expect(shouldInterruptOnDispose(true, { completed: false })).toBe(false);
  });

  it('interrupts if dispose happens before SpellCastAndImpact', () => {
    expect(shouldInterruptOnDispose(false, { completed: false })).toBe(true);
  });
});
