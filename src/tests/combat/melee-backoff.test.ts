/**
 * Melee backoff / walk-line clear / hasWalkLineClear clip (physical-attack action).
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@/engine/pathfinding/walk-line-clear', () => ({
  WalkLineHitCode: { Fail: 0, Ok: 1, NonWalk: -1, DetailedBlock: -2, Creature: -3 },
  hasWalkLineClear: jest.fn(() => ({
    ok: true,
    code: 1,
    clearPoint: new THREE.Vector3(),
    clearT: 1,
  })),
}));

jest.mock('@/combat/CombatRound', () => ({
  CombatRound: { ROUND_LENGTH: 3000 },
}));

jest.mock('@/GameState', () => ({
  GameState: { PartyManager: { party: [] } },
}));

jest.mock('@/actions/Action', () => ({
  Action: class {},
}));

import { ActionPhysicalAttacks } from '@/actions/ActionPhysicalAttacks';
import { hasWalkLineClear } from '@/engine/pathfinding/walk-line-clear';

describe('getMeleeBackoffIdeal', () => {
  it('places the ideal on the attacker side of the target at DesiredAttackRange', () => {
    const attacker = { position: new THREE.Vector3(0, 0, 0) } as any;
    const target = { position: new THREE.Vector3(10, 0, 0) } as any;
    const ideal = ActionPhysicalAttacks.getMeleeBackoffIdeal(attacker, target, 2);
    // target − towardTarget*desired = (10,0) − (1,0)*2 = (8,0)
    expect(ideal.x).toBeCloseTo(8, 5);
    expect(ideal.y).toBeCloseTo(0, 5);
  });

  it('keeps the attacker on their side when already beyond desired', () => {
    const attacker = { position: new THREE.Vector3(0, 0, 0) } as any;
    const target = { position: new THREE.Vector3(3, 0, 0) } as any;
    const ideal = ActionPhysicalAttacks.getMeleeBackoffIdeal(attacker, target, 2);
    expect(ideal.x).toBeCloseTo(1, 5);
  });
});

describe('resolveMeleeBackoff', () => {
  const attacker = {
    position: new THREE.Vector3(0, 0, 0),
    id: 1,
    area: undefined,
  } as any;
  const target = {
    position: new THREE.Vector3(10, 0, 0),
    id: 2,
  } as any;

  it('returns the ideal when no area is available', () => {
    const r = ActionPhysicalAttacks.resolveMeleeBackoff(attacker, target, 2);
    expect(r.clear).toBe(true);
    expect(r.position.x).toBeCloseTo(8, 5);
    expect(r.clippedDesired).toBe(2);
  });

  it('uses the walk-hit clear point when walk-line clear / hasWalkLineClear is blocked', () => {
    const clearPoint = new THREE.Vector3(6, 0, 0);
    (hasWalkLineClear as jest.Mock).mockReturnValueOnce({
      ok: false,
      code: -1,
      clearPoint,
      clearT: 0.5,
    });
    attacker.area = {
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
    };
    const r = ActionPhysicalAttacks.resolveMeleeBackoff(attacker, target, 2);
    expect(r.clear).toBe(false);
    expect(r.position.x).toBeCloseTo(6, 5);
    expect(r.clippedDesired).toBeCloseTo(4, 5);
    attacker.area = undefined;
  });
});

describe('resolveMeleeTooCloseHysteresis', () => {
  const desired = 2.1;
  const desiredSq = desired * desired;

  it('enters tooClose only below desired²−0.2', () => {
    const justInside = ActionPhysicalAttacks.resolveMeleeTooCloseHysteresis(desiredSq - 0.1, desiredSq, false);
    expect(justInside.tooClose).toBe(false);
    expect(justInside.active).toBe(false);

    const deep = ActionPhysicalAttacks.resolveMeleeTooCloseHysteresis(desiredSq - 0.25, desiredSq, false);
    expect(deep.tooClose).toBe(true);
    expect(deep.active).toBe(true);
  });

  it('stays active until dist² ≥ desired² (no immediate re-queue at Desired)', () => {
    let latch = ActionPhysicalAttacks.resolveMeleeTooCloseHysteresis(desiredSq - 0.25, desiredSq, false);
    expect(latch.active).toBe(true);

    // At Desired−ε still tooClose while latched
    latch = ActionPhysicalAttacks.resolveMeleeTooCloseHysteresis(desiredSq - 0.05, desiredSq, true);
    expect(latch.tooClose).toBe(true);
    expect(latch.active).toBe(true);

    // At/above Desired — leave backoff
    latch = ActionPhysicalAttacks.resolveMeleeTooCloseHysteresis(desiredSq, desiredSq, true);
    expect(latch.tooClose).toBe(false);
    expect(latch.active).toBe(false);
  });
});
