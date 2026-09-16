/**
 * combat floaty eligibility helper.
 * @jest-environment node
 */
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

const mockGetFeedback = jest.fn(() => true);
const mockPlayer = { id: 1 };
const mockCompanion = { id: 2 };

jest.mock('@/GameState', () => ({
  GameState: {
    FeedbackMessageManager: {
      GetFeedbackTypeEnabled: (...args: unknown[]) => mockGetFeedback(...args),
    },
    getCurrentPlayer: () => mockPlayer,
    DEBUG_COMBAT_FLOATY_ALL_ATTACKERS: false,
  },
}));

jest.mock('@/combat/CombatAttackData', () => ({
  CombatAttackData: class {},
}));

jest.mock('@/engine/pathfinding/visual-los', () => ({
  hasVisualLos: () => true,
}));

jest.mock('@/combat/combat-projectile', () => ({
  getProjectileImpactPosition: () => undefined,
  spawnCombatProjectile: () => {},
}));

jest.mock('@/combat/ranged-impact-vfx', () => ({
  spawnWorldImpactVfx: () => {},
  VFX_COM_BLASTER_IMPACT_GROUND: 0,
}));

import { GameState } from '@/GameState';
import { CombatRound } from '@/combat/CombatRound';

describe('shouldShowCombatFloaty', () => {
  beforeEach(() => {
    mockGetFeedback.mockReturnValue(true);
    GameState.DEBUG_COMBAT_FLOATY_ALL_ATTACKERS = false;
  });

  it('returns false when Floating Numbers is off', () => {
    mockGetFeedback.mockReturnValue(false);
    expect(CombatRound.shouldShowCombatFloaty(mockPlayer as any)).toBe(false);
  });

  it('returns true for player attacker (engine)', () => {
    expect(CombatRound.shouldShowCombatFloaty(mockPlayer as any)).toBe(true);
  });

  it('returns false for companion/NPC attacker by default', () => {
    expect(CombatRound.shouldShowCombatFloaty(mockCompanion as any)).toBe(false);
  });

  it('returns true for any attacker when DEBUG_COMBAT_FLOATY_ALL_ATTACKERS', () => {
    GameState.DEBUG_COMBAT_FLOATY_ALL_ATTACKERS = true;
    expect(CombatRound.shouldShowCombatFloaty(mockCompanion as any)).toBe(true);
  });

  it('returns false for undefined attacker', () => {
    expect(CombatRound.shouldShowCombatFloaty(undefined)).toBe(false);
  });
});
