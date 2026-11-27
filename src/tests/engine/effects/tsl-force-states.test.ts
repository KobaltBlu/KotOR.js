/**
 * TSL Force states (Crush, Held, Mind Trick, …): AI-state masks, ambient
 * states, immunities, cast animations and Force Body.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGameState: any = {
  GameKey: 'TSL',
  SWRuleSet: { racialTypeCount: 0 },
  GameEffectFactory: {},
};

jest.mock('@engine/runtime/GameState', () => ({ GameState: mockGameState }));
jest.mock('@engine/module/guards/isCreature', () => ({
  isCreature: (o: unknown) => !!o && (o as { __creature?: boolean }).__creature === true,
}));
jest.mock('@engine/effects/haste-slow', () => ({
  hasImmunityType: () => false,
}));
jest.mock('@engine/pathfinding/force-push-loco', () => ({
  isForcePushRecovering: () => false,
  stampForcePushAttackSummary: () => {},
}));

import { GameEngineType } from '@core/enums/engine/GameEngineType';
import { GameEffectSetStateType } from '@core/enums/effects/GameEffectSetStateType';
import { GameEffectType } from '@core/enums/effects/GameEffectType';
import { GameEffectDurationType } from '@core/enums/effects/GameEffectDurationType';
import { ModuleCreatureAmbientState } from '@core/enums/module/ModuleCreatureAmbientState';
import { ModuleCreatureAnimState } from '@core/enums/module/ModuleCreatureAnimState';
import { CombatFeatType } from '@core/enums/combat/CombatFeatType';
import { GameEffect } from '@engine/effects/GameEffect';
import { EffectSetAIState } from '@engine/effects/EffectSetAIState';
import { EffectSetState } from '@engine/effects/EffectSetState';
import { EffectSetStateInternal } from '@engine/effects/EffectSetStateInternal';
import { getForceBodyCostSplit } from '@engine/effects/EffectForceBody';
import {
  aiStateMaskForSetState,
  ambientForSetState,
  isSetStateImmune,
} from '@engine/effects/set-state';
import {
  getSpellCastAnimState,
  getSpellConjureAnimState,
  parseSpellCastAnim,
  SpellCastAnimCode,
} from '@engine/combat/spell-cast-anims';
import { canAttackByAIState, canUseForcePowersByAIState } from '@engine/module/creature/ai-state';
import { resolveCreatureAnimation } from '@engine/module/animation/resolveCreatureAnimation';

class StubEffect extends GameEffect {}

mockGameState.GameEffectFactory = {
  EffectSetAIState,
  EffectSetStateInternal,
  EffectVisualEffect: StubEffect,
  EffectSavingThrowDecrease: StubEffect,
};
mockGameState.GameKey = GameEngineType.TSL;

function makeCreature(feats: number[] = []){
  const c: any = {
    __creature: true,
    aiStateMask: 0xffff,
    ambientAnimState: 0,
    activity: 0,
    effects: [] as GameEffect[],
    combatRound: { pauseRound(){}, unpauseRound(){}, clearActions(){} },
    clearAllActions(){},
    setAnimationState: jest.fn(),
    isDead: () => false,
    getHasFeat: (id: number) => feats.includes(id),
    clearVisibleList(){},
    scripts: {},
    addEffect(e: GameEffect, durationType?: number, duration?: number){
      if(durationType != null) e.setDurationType(durationType);
      if(duration != null) e.setDuration(duration);
      e.setAttachedObject(c);
      e.onApply();
      if(e.applied) c.effects.push(e);
    },
    removeEffect(e: GameEffect){
      const i = c.effects.indexOf(e);
      if(i < 0) return;
      c.effects.splice(i, 1);
      e.onRemove();
    },
  };
  return c;
}

function applySetState(c: any, state: number){
  const e = new EffectSetState();
  e.setInt(0, state);
  c.addEffect(e, GameEffectDurationType.TEMPORARY, 6);
  return e;
}

describe('TSL SetState AI-state masks', () => {
  beforeEach(() => {
    mockGameState.GameKey = GameEngineType.TSL;
  });

  it.each([
    [GameEffectSetStateType.CRUSH, 0xfffd],
    [GameEffectSetStateType.HELD, 0xfffd],
    [GameEffectSetStateType.KNOCKDOWN, 0xfffd],
    [GameEffectSetStateType.MIND_TRICK, 0xfffd],
    [GameEffectSetStateType.DROID_SCRAMBLE, 0xfffd],
    [GameEffectSetStateType.CUT_SCENE_PARALYZE, 0xfff1],
    [GameEffectSetStateType.SLEEP, 0xfea1],
    [GameEffectSetStateType.CONFUSED, 0],
    [GameEffectSetStateType.FRIGHTENED, 0],
    [GameEffectSetStateType.DROID_CONFUSED, 0],
  ])('state %i uses AI-state mask 0x%s', (state, mask) => {
    expect(aiStateMaskForSetState(state)).toBe(mask);
  });

  it('Crush applies the outer 0xFEFF and inner 0xFFFD masks and restores them on removal', () => {
    const c = makeCreature();
    const outer = applySetState(c, GameEffectSetStateType.CRUSH);
    expect(c.aiStateMask).toBe(0xfefd);
    expect(c.ambientAnimState).toBe(ModuleCreatureAmbientState.CRUSH);
    expect(c.activity).toBe(0);
    c.removeEffect(outer);
    expect(c.aiStateMask).toBe(0xffff);
    expect(c.ambientAnimState).toBe(ModuleCreatureAmbientState.IDLE);
    expect(c.effects.length).toBe(0);
  });

  it('paralysis blocks attacks and Force powers until it ends', () => {
    const c = makeCreature();
    const outer = applySetState(c, GameEffectSetStateType.CUT_SCENE_PARALYZE);
    expect(canAttackByAIState(c)).toBe(false);
    expect(canUseForcePowersByAIState(c)).toBe(false);
    expect(c.ambientAnimState).toBe(ModuleCreatureAmbientState.PARALYZED);
    c.removeEffect(outer);
    expect(canAttackByAIState(c)).toBe(true);
    expect(canUseForcePowersByAIState(c)).toBe(true);
  });

  it('a higher state replaces the Internal and its masks', () => {
    const c = makeCreature();
    const crush = applySetState(c, GameEffectSetStateType.CUT_SCENE_STUNNED);
    const held = applySetState(c, GameEffectSetStateType.HELD);
    const internals = c.effects.filter((e: GameEffect) => e.type === GameEffectType.EffectSetStateInternal);
    expect(internals.length).toBe(1);
    expect(internals[0].getInt(0)).toBe(GameEffectSetStateType.HELD);
    c.removeEffect(held);
    expect(c.effects.filter((e: GameEffect) => e.type === GameEffectType.EffectSetStateInternal)[0].getInt(0))
      .toBe(GameEffectSetStateType.CUT_SCENE_STUNNED);
    c.removeEffect(crush);
    expect(c.aiStateMask).toBe(0xffff);
  });
});

describe('TSL ambient states', () => {
  it.each([
    [GameEffectSetStateType.DROID_STUN, ModuleCreatureAmbientState.DISABLED],
    [GameEffectSetStateType.CUT_SCENE_PARALYZE, ModuleCreatureAmbientState.PARALYZED],
    [GameEffectSetStateType.SLEEP, ModuleCreatureAmbientState.SLEEP],
    [GameEffectSetStateType.CHOKE, ModuleCreatureAmbientState.CHOKE],
    [GameEffectSetStateType.CUT_SCENE_HORRIFIED, ModuleCreatureAmbientState.HORROR],
    [GameEffectSetStateType.KNOCKDOWN, ModuleCreatureAmbientState.KNOCKDOWN],
    [GameEffectSetStateType.CRUSH, ModuleCreatureAmbientState.CRUSH],
    [GameEffectSetStateType.MIND_TRICK, ModuleCreatureAmbientState.PAUSE_POISONED],
    [GameEffectSetStateType.HELD, ModuleCreatureAmbientState.IDLE],
    [GameEffectSetStateType.DROID_CONFUSED, ModuleCreatureAmbientState.IDLE],
  ])('state %i → ambient %i', (state, ambient) => {
    expect(ambientForSetState(state)).toBe(ambient);
  });
});

describe('SetState immunities', () => {
  it('Mandalorian Courage blocks fear and horror in TSL only', () => {
    const c = makeCreature([CombatFeatType.MANDALORIAN_COURAGE]);
    mockGameState.GameKey = GameEngineType.TSL;
    expect(isSetStateImmune(c, GameEffectSetStateType.FRIGHTENED, false)).toBe(true);
    expect(isSetStateImmune(c, GameEffectSetStateType.CUT_SCENE_HORRIFIED, false)).toBe(true);
    mockGameState.GameKey = GameEngineType.KOTOR;
    expect(isSetStateImmune(c, GameEffectSetStateType.FRIGHTENED, false)).toBe(false);
    expect(isSetStateImmune(c, GameEffectSetStateType.CUT_SCENE_HORRIFIED, false)).toBe(false);
    mockGameState.GameKey = GameEngineType.TSL;
  });
});

describe('spells.2da CastAnim', () => {
  it('parses every label the engine knows', () => {
    expect(parseSpellCastAnim('Fury')).toBe(SpellCastAnimCode.FURY);
    expect(parseSpellCastAnim('crush')).toBe(SpellCastAnimCode.CRUSH);
    expect(parseSpellCastAnim('monsterfury')).toBe(SpellCastAnimCode.MONSTER_FURY);
    expect(parseSpellCastAnim('point')).toBe(SpellCastAnimCode.TOUCH);
    expect(parseSpellCastAnim('****')).toBe(SpellCastAnimCode.NONE);
  });

  it.each([
    ['self', ModuleCreatureAnimState.CASTOUT1, ModuleCreatureAnimState.CASTOUT1_LP],
    ['dark', ModuleCreatureAnimState.CASTOUT2, ModuleCreatureAnimState.CASTOUT2_LP],
    ['up', ModuleCreatureAnimState.CASTOUT3, ModuleCreatureAnimState.CASTOUT3_LP],
    ['area', ModuleCreatureAnimState.CASTOUT1, ModuleCreatureAnimState.CASTOUT4_LP],
    ['throw', ModuleCreatureAnimState.THROW_SABER, ModuleCreatureAnimState.THROW_SABER_LP],
    ['touch', ModuleCreatureAnimState.CASTOUT1, ModuleCreatureAnimState.THROW_SABER_LP],
    ['jump', ModuleCreatureAnimState.CASTOUT1, 0],
    ['monster', ModuleCreatureAnimState.CASTOUT1, 0],
    ['fury', ModuleCreatureAnimState.CASTOUT1, ModuleCreatureAnimState.CAST_FURY],
    ['crush', ModuleCreatureAnimState.CASTOUT1, ModuleCreatureAnimState.CAST_CRUSH],
    ['monsterfury', ModuleCreatureAnimState.CASTOUT1, ModuleCreatureAnimState.CAST_MONSTER_FURY],
  ])('%s conjures with %i and casts with %i', (label, conj, cast) => {
    expect(getSpellConjureAnimState(label)).toBe(conj);
    expect(getSpellCastAnimState(label)).toBe(cast);
  });

  it('TSL fury / crush / monster-fury clips resolve to their animations.2da rows', () => {
    const animations: any[] = [];
    for(let i = 0; i < 600; i++) animations[i] = { row: i };
    const tsl: any = { gameKey: GameEngineType.TSL, simple: false };
    const k1: any = { gameKey: GameEngineType.KOTOR, simple: false };
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.CAST_FURY, tsl, animations)).toBe(animations[461]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.CAST_CRUSH, tsl, animations)).toBe(animations[459]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.CAST_MONSTER_FURY, tsl, animations)).toBe(animations[279]);
    expect(resolveCreatureAnimation(ModuleCreatureAnimState.CAST_FURY, k1, animations)).toBeUndefined();
  });
});

describe('Force Body', () => {
  it.each([
    [-1, 20, 20, 0],
    [0, 20, 10, 10],
    [1, 20, 8, 8],
    [2, 20, 6, 6],
    [2, 15, 4, 4],
  ])('level %i on a %i FP power costs %i FP and %i VP', (level, cost, fp, hp) => {
    expect(getForceBodyCostSplit(level, cost)).toEqual({ fp, hp });
  });
});
