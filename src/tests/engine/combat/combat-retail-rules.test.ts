/**
 * To-hit, damage and sneak-attack rules in CombatRound / CombatAttackData.
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    TwoDAManager: { datatables: new Map() },
    FeedbackMessageManager: { AddMessage: jest.fn(), GetFeedbackTypeEnabled: () => false },
    SWRuleSet: { animationIdMap: new Map() },
    TLKManager: { GetStringById: () => ({ Value: '', getDisplayText: () => '' }) },
    PartyManager: { party: [], getCurrentPlayer: (): any => undefined },
    GameKey: 'KOTOR',
  },
}));

jest.mock('@engine/odyssey', () => ({
  OdysseyModelAnimation: { GetAnimation2DA: (): any => undefined },
}));

jest.mock('@engine/effects/EffectDamage', () => ({
  EffectDamage: class {
    ints: number[] = [];
    setCreator() {}
    setInt(i: number, v: number){ this.ints[i] = v; }
    getInt(i: number){ return this.ints[i] ?? -1; }
  },
}));

const effectChannels: { value: number[] } = { value: [] };
jest.mock('@engine/effects/effect-bonuses', () => ({
  getAttackEffectBonus: () => 0,
  getDamageIncreaseBonusesByChannel: () => effectChannels.value,
}));

jest.mock('@engine/combat/diff-settings', () => ({
  getWeaponMaxDice: () => 0,
  weightWeaponDiceRoll: (roll: number) => roll,
}));

jest.mock('@engine/render/TextSprite3D', () => ({
  TextSprite3D: { CreateOnObject: jest.fn() },
}));

jest.mock('@engine/combat/combat-projectile', () => ({
  getProjectileImpactPosition: (): any => undefined,
  spawnCombatProjectile: jest.fn(),
}));

jest.mock('@engine/pathfinding/visual-los', () => ({ hasVisualLos: () => true }));

jest.mock('@engine/combat/attack-summary-feedback', () => ({
  formatAttackSummaryFeedback: () => ({ message: '', color: 0 }),
  AttackSummaryStrRef: {},
}));

jest.mock('@engine/combat/duel-debug', () => ({ duelLog: () => {}, duelWho: () => '' }));

jest.mock('@engine/combat/queue-attack-actions', () => ({ queueAttackActions: () => {} }));

jest.mock('@engine/combat/damage-mitigation', () => ({
  damageFlagsFromChannels: () => 0,
  mitigateDamageAmount: jest.fn((_t: unknown, n: number) => n),
  scaleDamageChannels: (c: unknown) => c,
  sumDamageChannels: () => 0,
}));

import * as THREE from 'three';
import { CombatRound } from '@engine/combat/CombatRound';
import { CombatAttackData } from '@engine/combat/CombatAttackData';
import { CombatFeatType } from '@core/enums/combat/CombatFeatType';
import { DamageType } from '@core/enums/combat/DamageType';
import { WeaponWield } from '@core/enums/combat/WeaponWield';
import { WeaponType } from '@core/enums/combat/WeaponType';
import { ModuleCreatureArmorSlot } from '@core/enums/module/ModuleCreatureArmorSlot';
import { GameObjectType } from '@core/enums/module/GameObjectType';
import { GameState } from '@engine/runtime/GameState';
import { mitigateDamageAmount } from '@engine/combat/damage-mitigation';

type WeaponOpts = {
  wield?: WeaponWield;
  ranged?: boolean;
  baseItemId?: number;
  size?: number;
  damage?: number;
  damageType?: number;
  damageFlags?: number;
};

function makeWeapon(opts: WeaponOpts = {}): any {
  return {
    baseItemId: opts.baseItemId ?? 1,
    baseItem: { criticalThreat: 1, criticalHitMultiplier: 2, weaponSize: opts.size ?? 2 },
    isRangedWeapon: () => !!opts.ranged,
    isLightsaber: () => [8, 9, 10].includes(opts.baseItemId ?? 1),
    getAttackBonus: () => 0,
    getWeaponWield: () => opts.wield ?? WeaponWield.ONE_HANDED_SWORD,
    getWeaponType: () => WeaponType.SLASHING,
    getBaseItem: () => ({ weaponSize: opts.size ?? 2 }),
    getBaseDamage: () => opts.damage ?? 5,
    getBaseDamageType: () => opts.damageType ?? DamageType.SLASHING,
    hasDamageBonus: () => false,
    getDamageFlags: () => opts.damageFlags ?? 4,
  };
}

function makeCreature(opts: {
  str?: number;
  dex?: number;
  feats?: number[];
  right?: any;
  left?: any;
  size?: number;
  position?: THREE.Vector3;
  facing?: THREE.Vector3;
  seen?: boolean;
  debilitated?: boolean;
} = {}): any {
  const feats = new Set(opts.feats || []);
  return {
    objectType: GameObjectType.Creature,
    equipment: { RIGHTHAND: opts.right, LEFTHAND: opts.left },
    position: opts.position ?? new THREE.Vector3(0, 0, 0),
    effects: [],
    combatMode: 0,
    hasEffect: () => false,
    isSimpleCreature: () => false,
    isDebilitated: () => !!opts.debilitated,
    getDeadTemp: () => false,
    hasSeenObject: () => opts.seen ?? true,
    getFacingVector: () => opts.facing ?? new THREE.Vector3(0, 1, 0),
    getSTR: () => opts.str ?? 10,
    getDEX: () => opts.dex ?? 10,
    getBaseAttackBonus: () => 0,
    getHasFeat: (id: number) => feats.has(id),
    getCurrentForm: () => 0,
    getAppearance: () => ({ sizecategory: opts.size ?? 3 }),
    getHP: () => 100,
  };
}

function makeAction(target: any): any {
  return { target, feat: undefined };
}

describe('combat retail rules', () => {
  beforeEach(() => {
    (GameState as any).GameKey = 'KOTOR';
    effectChannels.value = [];
  });

  describe('to-hit modifiers', () => {
    it('applies dueling with a blaster pistol but not a stun baton', () => {
      const target = makeCreature({ position: new THREE.Vector3(20, 0, 0) });
      const pistol = makeWeapon({ wield: WeaponWield.BLASTER_PISTOL, ranged: true });
      const shooter = makeCreature({ right: pistol, feats: [CombatFeatType.ADVANCED_DUELING] });
      const round = new CombatRound(shooter);
      expect(round.getAttackModifierVersus(shooter, pistol, ModuleCreatureArmorSlot.RIGHTHAND, makeAction(target))).toBe(2);

      const baton = makeWeapon({ wield: WeaponWield.STUN_BATON });
      const fighter = makeCreature({ right: baton, feats: [CombatFeatType.ADVANCED_DUELING] });
      expect(round.getAttackModifierVersus(fighter, baton, ModuleCreatureArmorSlot.RIGHTHAND, makeAction(target))).toBe(0);
    });

    it('gives K1 ranged attacks +10 within 5m', () => {
      const rifle = makeWeapon({ wield: WeaponWield.BLASTER_RIFLE, ranged: true });
      const shooter = makeCreature({ right: rifle });
      const round = new CombatRound(shooter);
      const near = makeCreature({ position: new THREE.Vector3(4, 3, 0) });
      const far = makeCreature({ position: new THREE.Vector3(4, 3.1, 0) });
      expect(round.getAttackModifierVersus(shooter, rifle, ModuleCreatureArmorSlot.RIGHTHAND, makeAction(near))).toBe(10);
      expect(round.getAttackModifierVersus(shooter, rifle, ModuleCreatureArmorSlot.RIGHTHAND, makeAction(far))).toBe(0);
    });

    it('lets K1 lightsabers use DEX without a finesse feat', () => {
      const saber = makeWeapon({ baseItemId: 8 });
      const jedi = makeCreature({ right: saber, str: 10, dex: 16 });
      const round = new CombatRound(jedi);
      expect(round.getAttackAbilityModifier(jedi, saber)).toBe(3);

      (GameState as any).GameKey = 'TSL';
      expect(round.getAttackAbilityModifier(jedi, saber)).toBe(0);
    });

    it('treats a double weapon as the off-hand item for two-weapon penalties', () => {
      const staff = makeWeapon({ wield: WeaponWield.TWO_HANDED_SWORD, size: 3 });
      const fighter = makeCreature({ right: staff, feats: [CombatFeatType.TWO_WEAPON_FIGHTING] });
      const round = new CombatRound(fighter);
      expect(round.calculateTwoWeaponModifier(fighter, false)).toBe(-4);
      expect(round.calculateTwoWeaponModifier(fighter, true)).toBe(-6);
    });

    it('uses -6 on the main hand for a non-light off-hand weapon', () => {
      const main = makeWeapon({ size: 2 });
      const off = makeWeapon({ size: 3 });
      const fighter = makeCreature({ right: main, left: off, feats: [CombatFeatType.TWO_WEAPON_ADVANCED] });
      const round = new CombatRound(fighter);
      expect(round.calculateTwoWeaponModifier(fighter, false)).toBe(-4);
      expect(round.calculateTwoWeaponModifier(fighter, true)).toBe(-4);
    });
  });

  describe('damage', () => {
    it('lets a negative STR modifier lower melee damage, floored at 1', () => {
      const sword = makeWeapon({ damage: 5 });
      const weak = makeCreature({ right: sword, str: 6 });
      const attack = new CombatAttackData();
      attack.attackWeapon = sword;
      attack.calculateDamage(weak, false);
      expect(attack.getTotalDamage()).toBe(3);

      const feeble = makeCreature({ right: sword, str: 1 });
      const attack2 = new CombatAttackData();
      attack2.attackWeapon = makeWeapon({ damage: 2 });
      attack2.calculateDamage(feeble, false);
      expect(attack2.getTotalDamage()).toBe(1);
    });

    it('subtracts negative effect damage', () => {
      const sword = makeWeapon({ damage: 6 });
      const creature = makeCreature({ right: sword });
      const channels = new Array(16).fill(0);
      channels[DamageType.SLASHING] = -2;
      effectChannels.value = channels;
      const attack = new CombatAttackData();
      attack.attackWeapon = sword;
      attack.calculateDamage(creature, false);
      expect(attack.getTotalDamage()).toBe(4);
    });

    it('rolls 1 unarmed damage for medium creatures and 1d2 for small ones', () => {
      const medium = makeCreature({ size: 3 });
      expect(CombatAttackData.getUnarmedDamageDie(medium)).toBe(1);
      const small = makeCreature({ size: 2 });
      expect(CombatAttackData.getUnarmedDamageDie(small)).toBe(2);

      const attack = new CombatAttackData();
      attack.calculateDamage(medium, false);
      expect(attack.getTotalDamage()).toBe(1);
    });

    it('mitigates using the weapon damage flags', () => {
      const sword = makeWeapon({ damage: 5, damageFlags: 4 });
      const owner = makeCreature({ right: sword });
      const target = makeCreature();
      (target as any).addEffect = jest.fn();
      const attack = new CombatAttackData();
      attack.attackWeapon = sword;
      attack.calculateDamage(owner, false);
      (mitigateDamageAmount as jest.Mock).mockClear();
      attack.applyDamageEffectToCreature(owner, target);
      expect((mitigateDamageAmount as jest.Mock).mock.calls[0][2]).toBe(4);
    });
  });

  describe('sneak attack', () => {
    function sneaker(){
      return makeCreature({ feats: [CombatFeatType.SNEAK_ATTACK_2D6], position: new THREE.Vector3(0, 1, 0) });
    }

    it('sneak attacks a target that has not seen the attacker, even from the front', () => {
      const attacker = sneaker();
      const target = makeCreature({ seen: false, facing: new THREE.Vector3(0, 1, 0) });
      const round = new CombatRound(attacker);
      const attack = new CombatAttackData();
      expect(round.resolveSneakAttack(attacker, target, attack)).toBe(true);
      expect(attack.sneakAttack).toBe(true);
    });

    it('does not sneak attack a target that sees the attacker and faces it', () => {
      const attacker = sneaker();
      const target = makeCreature({ seen: true, facing: new THREE.Vector3(0, 1, 0) });
      const round = new CombatRound(attacker);
      expect(round.resolveSneakAttack(attacker, target, new CombatAttackData())).toBe(false);
    });

    it('respects immunity on the unseen path', () => {
      const attacker = sneaker();
      const target = makeCreature({ seen: false });
      const round = new CombatRound(attacker);
      jest.spyOn(round, 'hasEffectImmunity').mockReturnValue(true);
      expect(round.resolveSneakAttack(attacker, target, new CombatAttackData())).toBe(false);
    });
  });
});
