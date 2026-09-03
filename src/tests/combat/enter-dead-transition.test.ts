/**
 * Retail enter-DEAD SetAnimation DIE insert.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';
import { resolveEnterDeadTransition } from '@/module/enter-dead-transition';
import { shouldSnapCombatReady } from '@/combat/combat-round-pause';

describe('resolveEnterDeadTransition', () => {
  it('inserts DIE when entering DEAD from combat READY', () => {
    expect(resolveEnterDeadTransition(
      ModuleCreatureAnimState.DEAD,
      ModuleCreatureAnimState.READY,
    )).toBe(ModuleCreatureAnimState.DIE);
  });

  it('inserts DIE1 when entering DEAD1 from a non-dead pose', () => {
    expect(resolveEnterDeadTransition(
      ModuleCreatureAnimState.DEAD1,
      ModuleCreatureAnimState.PAUSE,
    )).toBe(ModuleCreatureAnimState.DIE1);
  });

  it('keeps DEAD when already on DEAD', () => {
    expect(resolveEnterDeadTransition(
      ModuleCreatureAnimState.DEAD,
      ModuleCreatureAnimState.DEAD,
    )).toBe(ModuleCreatureAnimState.DEAD);
  });

  it('keeps DEAD when promoting from DIE (no re-insert)', () => {
    expect(resolveEnterDeadTransition(
      ModuleCreatureAnimState.DEAD,
      ModuleCreatureAnimState.DIE,
    )).toBe(ModuleCreatureAnimState.DEAD);
  });

  it('keeps DEAD1 when promoting from DIE1', () => {
    expect(resolveEnterDeadTransition(
      ModuleCreatureAnimState.DEAD1,
      ModuleCreatureAnimState.DIE1,
    )).toBe(ModuleCreatureAnimState.DEAD1);
  });

  it('does not remap non-DEAD requests', () => {
    expect(resolveEnterDeadTransition(
      ModuleCreatureAnimState.READY,
      ModuleCreatureAnimState.PAUSE,
    )).toBe(ModuleCreatureAnimState.READY);
  });
});

describe('shouldSnapCombatReady during enter-DEAD', () => {
  it('does not READY-snap living DIE or DEAD poses', () => {
    expect(shouldSnapCombatReady({
      dead: false,
      debilitated: false,
      resultsCalculated: false,
      scriptedDead: true,
    })).toBe(false);
  });
});
