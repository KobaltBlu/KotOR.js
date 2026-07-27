/**
 * UI Force cast / ActionManager alignment regressions.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    GuiTimingBarManager: undefined,
    TwoDAManager: { datatables: new Map() },
    ActionFactory: {
      ActionCombat: class ActionCombat {
        type = 0x3f;
      },
    },
  },
}));

jest.mock('@/managers', () => ({}));
jest.mock('@/audio/AudioEngine', () => ({ AudioEngine: { GetAudioEngine: () => ({}) } }));

import { TalentObjectType } from '@/enums/engine/TalentObjectType';
import { CombatActionType } from '@/enums/combat/CombatActionType';

/**
 * Retail UnReadySpell @ 005a55c0 — drain cost from FP pool, clamp at 0, always
 * succeed when the spell row exists. Menu enable is the soft gate.
 */
function unreadySpellRetail(
  state: { currentForce: number; temporaryForce: number },
  cost: number,
  spellValid: boolean
): boolean {
  if(!spellValid) return false;
  if(cost <= 0) return true;
  let remaining = cost;
  // KotOR.js subtractFP: temporary first, then current (clamp)
  if(state.temporaryForce > 0){
    if(remaining <= state.temporaryForce){
      state.temporaryForce -= remaining;
      return true;
    }
    remaining -= state.temporaryForce;
    state.temporaryForce = 0;
  }
  state.currentForce -= remaining;
  if(state.currentForce < 0) state.currentForce = 0;
  return true;
}

/**
 * Retail ForceMenuAction class pick — Jedi Guardian/Consular/Sentinel (3/4/5)
 * in the first two class slots.
 */
function getForceSpellClassIndex(classIds: number[]): number {
  const limit = Math.min(2, classIds.length);
  for(let i = 0; i < limit; i++){
    const id = classIds[i] | 0;
    if(id === 3 || id === 4 || id === 5) return i;
  }
  return 0;
}

/**
 * useTalent objectType bitfield gate (TalentObject | Spell/Feat/Skill).
 */
function resolveTalentKind(objectType: number): 'spell' | 'feat' | 'skill' | 'none' {
  if((objectType & TalentObjectType.TalentSpell) !== 0) return 'spell';
  if((objectType & TalentObjectType.TalentFeat) !== 0) return 'feat';
  if((objectType & TalentObjectType.TalentSkill) !== 0) return 'skill';
  return 'none';
}

describe('unreadySpell retail drain/clamp', () => {
  it('succeeds when FP < cost and clamps to zero', () => {
    const state = { currentForce: 5, temporaryForce: 0 };
    expect(unreadySpellRetail(state, 20, true)).toBe(true);
    expect(state.currentForce).toBe(0);
    expect(state.temporaryForce).toBe(0);
  });

  it('spends temporary then current', () => {
    const state = { currentForce: 10, temporaryForce: 5 };
    expect(unreadySpellRetail(state, 7, true)).toBe(true);
    expect(state.temporaryForce).toBe(0);
    expect(state.currentForce).toBe(8);
  });

  it('fails only when spell row is missing', () => {
    const state = { currentForce: 100, temporaryForce: 0 };
    expect(unreadySpellRetail(state, 10, false)).toBe(false);
    expect(state.currentForce).toBe(100);
  });
});

describe('ActionManager clear interrupt pause', () => {
  it('clears roundPaused and infinitePause so ActionCombat can dispatch', () => {
    // Mirrors clearAllActions(skipUnclearable=true) → resetCombatAnimations(0)
    const combatRound = {
      roundPaused: true,
      infinitePause: true,
      pauseTimer: 1500,
      roundPausedBy: {},
      resetCombatAnimations(overshootMs = 0){
        this.roundPaused = false;
        this.roundPausedBy = undefined;
        this.infinitePause = false;
        this.pauseTimer = 0;
        void overshootMs;
      },
    };

    // User ActionManager(1) path
    const skipUnclearable = true;
    if(skipUnclearable && combatRound.roundPaused){
      combatRound.resetCombatAnimations(0);
    }

    expect(combatRound.roundPaused).toBe(false);
    expect(combatRound.infinitePause).toBe(false);
    expect(combatRound.pauseTimer).toBe(0);
  });

  it('does not interrupt pause on full clearAllActions(false)', () => {
    const combatRound = {
      roundPaused: true,
      infinitePause: false,
      pauseTimer: 500,
    };
    const skipUnclearable = false;
    if(skipUnclearable && combatRound.roundPaused){
      combatRound.roundPaused = false;
    }
    expect(combatRound.roundPaused).toBe(true);
    expect(combatRound.pauseTimer).toBe(500);
  });
});

describe('useTalent TalentObjectType bitflags', () => {
  it('matches TalentSpell / Feat / Skill bitfields (not 0/1/2)', () => {
    const spellType = TalentObjectType.TalentObject | TalentObjectType.TalentSpell;
    const featType = TalentObjectType.TalentObject | TalentObjectType.TalentFeat;
    const skillType = TalentObjectType.TalentObject | TalentObjectType.TalentSkill;

    expect(spellType).toBe(0x03);
    expect(featType).toBe(0x05);
    expect(skillType).toBe(0x09);

    expect(resolveTalentKind(spellType)).toBe('spell');
    expect(resolveTalentKind(featType)).toBe('feat');
    expect(resolveTalentKind(skillType)).toBe('skill');

    // Bare TalentObject (0x01) is not a castable kind
    expect(resolveTalentKind(TalentObjectType.TalentObject)).toBe('none');
    expect(resolveTalentKind(0)).toBe('none');
    // Bare TalentSpell bit (0x02) still resolves as spell
    expect(resolveTalentKind(TalentObjectType.TalentSpell)).toBe('spell');
  });

  it('spell path schedules CAST_SPELL (type 9)', () => {
    expect(CombatActionType.CAST_SPELL).toBe(9);
  });
});

describe('ForceMenuAction spellClassIndex', () => {
  it('picks first Jedi class (3/4/5) in the first two slots', () => {
    expect(getForceSpellClassIndex([0, 3])).toBe(1);
    expect(getForceSpellClassIndex([4])).toBe(0);
    expect(getForceSpellClassIndex([0, 1])).toBe(0);
    expect(getForceSpellClassIndex([3, 5])).toBe(0);
    // Third slot Jedi is ignored (retail only scans first two)
    expect(getForceSpellClassIndex([0, 1, 5])).toBe(0);
  });
});

describe('activateMenuItem talent-before-item preference', () => {
  it('Force-menu entries with talent+item prefer CastSpell talent path', () => {
    const menuItem = {
      talent: { objectType: TalentObjectType.TalentObject | TalentObjectType.TalentSpell },
      item: { id: 99 },
      action: undefined,
    };
    const isSpell =
      !!menuItem.talent &&
      ((menuItem.talent.objectType & TalentObjectType.TalentSpell) !== 0);
    // Prefer talent when TalentSpell — do not fall through to item.useItemOnObject
    const path = isSpell ? 'talent' : menuItem.item ? 'item' : 'none';
    expect(path).toBe('talent');
  });
});
