/**
 * @jest-environment node
 *
 * OnApplyResurrection (004e13c0): ambient PAUSE, never GET_UP_DEAD;
 * instant apply returns 1 (not kept on EffectList). Scripts like k_ptar_ud_dur
 * apply EffectResurrection to living party before cutscenes.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));
jest.mock('@engine/module/guards/isCreature', () => ({
  isCreature: (o: unknown) => !!o && (o as { __creature?: boolean }).__creature === true,
}));

import { EffectResurrection } from '@engine/effects/EffectResurrection';
import { EffectHeal } from '@engine/effects/EffectHeal';
import { GameEffectType } from '@core/enums/effects/GameEffectType';
import { GameEffectDurationType } from '@core/enums/effects/GameEffectDurationType';
import { ModuleCreatureAnimState } from '@core/enums/module/ModuleCreatureAnimState';

function makeCreature(overrides: Record<string, unknown> = {}) {
  let hp = typeof overrides.hp === 'number' ? overrides.hp : 20;
  const anim = { index: ModuleCreatureAnimState.READY };
  return {
    __creature: true,
    effects: [] as unknown[],
    deathStarted: false,
    deathAnimationPlayed: false,
    getUpAnimationPlayed: false,
    animationState: anim,
    getHP: () => hp,
    getMaxHP: () => 20,
    setHP: (v: number) => { hp = v; },
    isDead: () => hp < 1,
    clearAllActions: jest.fn(),
    clearCorpseDestroyState: jest.fn(),
    removeEffect: jest.fn(),
    setAnimationState: jest.fn((state: number) => { anim.index = state; }),
    ...overrides,
  };
}

describe('EffectResurrection', () => {
  it('living creature: PAUSE, not GET_UP_DEAD (scripted party rez before cutscene)', () => {
    const creature = makeCreature({ hp: 16 });
    const effect = new EffectResurrection();
    effect.setAttachedObject(creature as any);
    effect.onApply();

    expect(creature.setAnimationState).toHaveBeenCalledWith(ModuleCreatureAnimState.PAUSE);
    expect(creature.setAnimationState).not.toHaveBeenCalledWith(
      ModuleCreatureAnimState.GET_UP_DEAD
    );
    expect(creature.getHP()).toBe(16);
    expect(creature.deathStarted).toBe(false);
    expect(creature.deathAnimationPlayed).toBe(false);
  });

  it('dead creature: clamp HP to 1, clear death flags, ambient PAUSE', () => {
    const creature = makeCreature({
      hp: -11,
      deathStarted: true,
      deathAnimationPlayed: true,
      getUpAnimationPlayed: true,
    });
    const effect = new EffectResurrection();
    effect.setAttachedObject(creature as any);
    effect.onApply();

    expect(creature.getHP()).toBe(1);
    expect(creature.isDead()).toBe(false);
    expect(creature.deathStarted).toBe(false);
    expect(creature.deathAnimationPlayed).toBe(false);
    expect(creature.getUpAnimationPlayed).toBe(false);
    expect(creature.clearCorpseDestroyState).toHaveBeenCalled();
    expect(creature.setAnimationState).toHaveBeenCalledWith(ModuleCreatureAnimState.PAUSE);
    expect(creature.setAnimationState).not.toHaveBeenCalledWith(
      ModuleCreatureAnimState.GET_UP_DEAD
    );
  });

  it('addEffect frees Instant Resurrection and Heal (on-apply return 1)', () => {
    const src = fs.readFileSync(srcPath('engine', 'module', 'GameObject.ts'), 'utf8');
    const fn = src.match(
      /addEffect\(effect: GameEffect, type = 0, duration = 0\)\{[\s\S]*?\n  \}/
    )?.[0] ?? '';
    expect(fn.length).toBeGreaterThan(100);
    expect(fn).toMatch(/GameEffectType\.EffectResurrection/);
    expect(fn).toMatch(/GameEffectType\.EffectHeal/);
    expect(fn).toMatch(/GameEffectType\.EffectDamage/);
  });

  it('EffectResurrection and EffectHeal type ids match free-on-apply set', () => {
    expect(new EffectResurrection().type).toBe(GameEffectType.EffectResurrection);
    expect(new EffectHeal().type).toBe(GameEffectType.EffectHeal);
    expect(GameEffectDurationType.INSTANT).toBe(0);
  });
});
