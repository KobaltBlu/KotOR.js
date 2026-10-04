/**
 * MaxCleaveRange melee override + GetNearestEnemy gap/LOS distance alignment.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

const mockHasCombatLineOfSight = jest.fn(
  (_attacker: unknown, _target: unknown, maxDistance?: number) => {
    // Default: treat LOS as clear when a maxDistance is provided.
    return typeof maxDistance === 'number';
  }
);

jest.mock('@engine/combat/attack-range', () => {
  const actual = jest.requireActual('@/combat/attack-range') as typeof import('@engine/combat/attack-range');
  return {
    ...actual,
    hasCombatLineOfSight: (...args: unknown[]) => mockHasCombatLineOfSight(...args),
  };
});

jest.mock('@engine/runtime/GameState', () => ({
  GameState: { PartyManager: { party: [] } },
}));

jest.mock('@engine/module/guards/isCreature', () => ({
  isCreature: (o: unknown) => !!(o && typeof o === 'object' && (o as { __creature?: boolean }).__creature),
}));
jest.mock('@engine/module/guards/isDoor', () => ({ isDoor: () => false }));
jest.mock('@engine/module/guards/isPlaceable', () => ({ isPlaceable: () => false }));

import { maxAttackRange, maxCleaveRange } from '@engine/combat/attack-range';
import {
  explainNearestEnemyMiss,
  getNearestEnemy,
  getNearestEnemyLosMaxDistance,
} from '@engine/combat/nearest-enemy';
import { PerceptionMask } from '@engine/enums/engine/PerceptionMask';

function appearance(creperspace = 0.4, hitradius = 0.25) {
  return { creperspace, hitradius, perspace: 0.35 };
}

function meleePc(overrides: Record<string, unknown> = {}) {
  return {
    __creature: true,
    id: 1,
    position: new THREE.Vector3(0, 0, 0),
    equipment: {
      RIGHTHAND: {
        isRangedWeapon: () => false,
        getBaseItem: () => ({ maxAttackRange: 0 }),
      },
    },
    getAppearance: () => appearance(),
    isHostile: () => true,
    isDead: () => false,
    perceptionList: [] as { object: unknown; objectId: number; data: number }[],
    area: { creatures: [] as unknown[] },
    ...overrides,
  };
}

function hostileAt(x: number, id = 302) {
  return {
    __creature: true,
    id,
    tag: 'end_reinforce3',
    position: new THREE.Vector3(x, 0, 0),
    getAppearance: () => appearance(),
    isDead: () => false,
  };
}

describe('maxCleaveRange melee findNearestEnemy override', () => {
  it('returns 22 for a melee short-sword attacker (override 20 + 2)', () => {
    const pc = meleePc();
    expect(maxAttackRange(pc as any, pc as any, false, true)).toBe(20);
    expect(maxCleaveRange(pc as any)).toBe(22);
  });

  it('still uses desired+0.5 for normal melee MaxAttackRange (no override)', () => {
    const pc = meleePc();
    // hitradius 0.25 + 0.25 + 1.6 + 0.5 = 2.6
    expect(maxAttackRange(pc as any, pc as any, false, false)).toBeCloseTo(2.6, 5);
  });
});

describe('getNearestEnemyLosMaxDistance', () => {
  it('adds both creperspaces to the gap maxRange', () => {
    const pc = meleePc();
    const enemy = hostileAt(4.78);
    expect(getNearestEnemyLosMaxDistance(pc as any, enemy as any, 4.6)).toBeCloseTo(5.4, 5);
  });
});

describe('getNearestEnemy gap vs raw LOS edge case', () => {
  beforeEach(() => {
    mockHasCombatLineOfSight.mockClear();
    mockHasCombatLineOfSight.mockImplementation(
      (_attacker: unknown, target: unknown, maxDistance?: number) => {
        const t = target as { position: THREE.Vector3 };
        const dist = t.position.length(); // attacker at origin
        if(typeof maxDistance !== 'number'){
          return false;
        }
        return dist <= maxDistance;
      }
    );
  });

  it('finds a SEEN hostile when gap < maxRange but raw dist is slightly above maxRange', () => {
    // Live Endar Spire case: dist 4.78, spaces 0.4+0.4, gap 3.98, maxRange 4.6
    const enemy = hostileAt(4.778);
    const pc = meleePc({
      perceptionList: [{ object: enemy, objectId: enemy.id, data: PerceptionMask.SEEN }],
      area: { creatures: [enemy] },
    });

    const found = getNearestEnemy(pc as any, 4.6);
    expect(found).toBe(enemy);

    const losMax = getNearestEnemyLosMaxDistance(pc as any, enemy as any, 4.6);
    expect(mockHasCombatLineOfSight).toHaveBeenCalledWith(pc, enemy, losMax);
    expect(losMax).toBeGreaterThan(4.778);

    const explain = explainNearestEnemyMiss(pc as any, 4.6);
    expect(explain.inRange).toBe(1);
    expect(explain.los).toBe(1);
  });

  it('rejects when raw dist exceeds gap-aligned LOS max', () => {
    const enemy = hostileAt(6.0); // gap = 6 - 0.8 = 5.2 >= 4.6 → out of range
    const pc = meleePc({
      perceptionList: [{ object: enemy, objectId: enemy.id, data: PerceptionMask.SEEN }],
      area: { creatures: [enemy] },
    });

    expect(getNearestEnemy(pc as any, 4.6)).toBeUndefined();
    const explain = explainNearestEnemyMiss(pc as any, 4.6);
    expect(explain.inRange).toBe(0);
    expect(explain.los).toBe(0);
  });
});
