import { describe, test, expect, jest, afterEach } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';
import * as THREE from 'three';
import { DamageType } from '../../enums/combat/DamageType';
import { AttackResult } from '../../enums/combat/AttackResult';
import { CombatFeatType } from '../../enums/combat/CombatFeatType';
import { DiceType } from '../../enums/combat/DiceType';
import { WeaponWield } from '../../enums/combat/WeaponWield';
import { ModuleCreatureArmorSlot } from '../../enums/module/ModuleCreatureArmorSlot';
import { ModuleItemCostTable } from '../../enums/module/ModuleItemCostTable';
import { GameEffectType } from '../../enums/effects/GameEffectType';
import { GameEffectDurationType } from '../../enums/effects/GameEffectDurationType';
import { Dice } from '../../utility/Dice';
import { CombatAttackDamage } from '../../combat/CombatAttackDamage';
import { BitWise } from '../../utility/BitWise';
import { ModuleObjectType } from '../../enums/module/ModuleObjectType';

// Execute real implementation source with engine-boundary doubles; no browser,
// audio device or proprietary data is initialized. Integrated tsc remains separate.
class EffectBase {
  intList: number[] = [];
  applied = false;
  creator: any;
  object: any;
  type: any;
  setNumIntegers(n: number) { this.intList = new Array(n).fill(0); }
  getInt(n: number) { return this.intList[n] ?? 0; }
  setInt(n: number, value: number) { this.intList[n] = value; }
  setCreator(value: any) { this.creator = value; }
  onApply() { this.applied = true; }
}
const gameState: any = {
  CheatConsoleManager: { shouldApplyOnePunch: () => false },
};
const baseBoundaries: Record<string, any> = {
  three: THREE,
  '@/GameState': { GameState: gameState },
  '@/effects/GameEffect': { GameEffect: EffectBase },
  '@/enums/effects/GameEffectType': { GameEffectType },
  '@/enums/effects/GameEffectDurationType': { GameEffectDurationType },
  '@/enums/combat/DamageType': { DamageType },
  '@/enums/combat/AttackResult': { AttackResult },
  '@/enums/combat/CombatFeatType': { CombatFeatType },
  '@/enums/combat/WeaponWield': { WeaponWield },
  '@/enums/combat/DiceType': { DiceType },
  '@/enums/module/ModuleCreatureArmorSlot': { ModuleCreatureArmorSlot },
  '@/enums/module/ModuleItemCostTable': { ModuleItemCostTable },
  '@/utility/Dice': { Dice },
  '@/combat/CombatAttackDamage': { CombatAttackDamage },
  '@/utility/BitWise': { BitWise },
  '@/enums/module/ModuleObjectType': { ModuleObjectType },
};
function load(relativePath: string, name: string, overrides: Record<string, any> = {}): any {
  const compiled = ts.transpileModule(readFileSync(join(__dirname, '../..', relativePath), 'utf8'), {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    reportDiagnostics: true,
  });
  expect((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)).toEqual([]);
  const module = { exports: {} as Record<string, any> };
  runInNewContext(compiled.outputText, {
    module, exports: module.exports, console, setTimeout, clearTimeout,
    require: (specifier: string) => overrides[specifier] ?? baseBoundaries[specifier] ?? {},
  }, { filename: relativePath });
  return module.exports[name];
}
const EffectDamage = load('effects/EffectDamage.ts', 'EffectDamage');
const CombatAttackData = load('combat/CombatAttackData.ts', 'CombatAttackData', { '@/effects': { EffectDamage } });
const CombatRound = load('combat/CombatRound.ts', 'CombatRound', {
  '@/combat/CombatAttackData': { CombatAttackData },
});
function target(effects: any[] = []): any {
  const result: any = { effects, combatData: {}, getHP: () => 100, getAC: () => 15, removeEffect: (effect: any) => {
    const index = result.effects.indexOf(effect);
    if(index >= 0) result.effects.splice(index, 1);
  } };
  return result;
}
function defense(type: GameEffectType, values: number[]): any {
  const effect = new EffectBase();
  effect.type = type;
  effect.intList = values.slice();
  return effect;
}
function creature(modifier = 0): any {
  return {
    equipment: {}, getAttackModifier: () => modifier,
    getSTRModifier: () => 2, isSimpleCreature: () => false,
    hasEffect: () => false, getHasFeat: () => false,
  };
}
function weapon(ranged = false): any {
  return {
    baseItem: { criticalHitMultiplier: 2 }, getBaseDamageType: () => DamageType.SLASHING,
    getBaseDamage: () => 4, getEnhancementBonus: () => 1,
    hasDamageBonus: () => false, isRangedWeapon: () => ranged,
    getWeaponWield: () => WeaponWield.ONE_HANDED_SWORD,
    getCriticalThreatRangeMin: () => 18, getCriticalThreatRangeMax: () => 20,
  };
}
afterEach(() => jest.restoreAllMocks());

describe('ported combat rolls and damage', () => {
  test.each([
    [1, 100, 5, AttackResult.MISS],
    [20, -100, 100, AttackResult.CRITICAL_HIT],
    [10, 5, 15, AttackResult.HIT_SUCCESSFUL],
    [10, 4, 15, AttackResult.MISS],
    [15, 5, 15, AttackResult.HIT_SUCCESSFUL],
    [19, 0, 30, AttackResult.MISS],
  ])('natural %s, modifier %s, AC %s gives %s', (natural, modifier, ac, expected) => {
    jest.spyOn(Dice, 'roll').mockReturnValue(natural);
    const owner = creature(modifier);
    const round = new CombatRound(owner);
    round.logAttackResult = () => {};
    const action = { target: { ...target(), getAC: () => ac } };
    round.calculateWeaponAttack(owner, weapon(), ModuleCreatureArmorSlot.RIGHTHAND, action);
    expect(round.attackList[0].attackResult).toBe(expected);
  });

  test('additional attacks grow storage rather than dereferencing an absent slot', () => {
    jest.spyOn(Dice, 'roll').mockReturnValue(10);
    const owner = creature(10);
    const round = new CombatRound(owner);
    round.logAttackResult = () => {};
    for(let i = 0; i < 7; i++) round.calculateWeaponAttack(owner, weapon(), ModuleCreatureArmorSlot.RIGHTHAND, { target: target() });
    expect(round.currentAttack).toBe(7);
    expect(round.attackList).toHaveLength(7);
  });

  test('owned power feats do not add passive damage and selected ranks do not stack', () => {
    const owner = creature();
    owner.getHasFeat = () => true;
    const damage = new CombatAttackData();
    damage.attackWeapon = weapon();
    damage.reactObject = target();
    damage.calculateDamage(owner);
    expect(damage.getTotalDamage()).toBe(9); // base 4 + enhancement 1 + specialization 2 + STR 2
    damage.reset();
    damage.attackWeapon = weapon();
    damage.reactObject = target();
    damage.calculateDamage(owner, false, { id: CombatFeatType.MASTER_POWER_ATTACK });
    expect(damage.getTotalDamage()).toBe(19);
  });

  test('strength applies to melee but not ranged damage', () => {
    const damage = new CombatAttackData();
    damage.attackWeapon = weapon();
    damage.reactObject = target();
    damage.calculateDamage(creature());
    expect(damage.getTotalDamage()).toBe(7);
    damage.reset();
    damage.attackWeapon = weapon(true);
    damage.reactObject = target();
    damage.calculateDamage(creature());
    expect(damage.getTotalDamage()).toBe(5);
  });

  test('delayed damage retains the whole typed effect until impact', () => {
    const damage = new CombatAttackData();
    damage.damageList[DamageType.FIRE].addDamage(8);
    const victim = { objectType: ModuleObjectType.ModuleCreature, damageList: [] as any[], addEffect: jest.fn() };
    const owner = creature();
    damage.applyDamageEffectToCreature(owner, victim, 0.5);
    expect(victim.addEffect).not.toHaveBeenCalled();
    expect(victim.damageList[0].delay).toBe(0.5);
    expect(victim.damageList[0].effect.getInt(DamageType.FIRE)).toBe(8);
    expect(victim.damageList[0].effect.creator).toBe(owner);
  });

  test('doors receive damage immediately because they do not drain creature damage queues', () => {
    const damage = new CombatAttackData();
    damage.damageList[DamageType.SLASHING].addDamage(8);
    const door = { objectType: ModuleObjectType.ModuleDoor, damageList: [] as any[], addEffect: jest.fn() };
    damage.applyDamageEffectToCreature(creature(), door, 0.5);
    expect(door.damageList).toHaveLength(0);
    expect(door.addEffect).toHaveBeenCalledTimes(1);
    expect((door.addEffect.mock.calls[0][0] as any).getDamageAmount()).toBe(8);
  });
});

describe('ported defensive effects', () => {
  test('sums nonnegative typed slots without forcing minimum one damage', () => {
    const effect = new EffectDamage();
    effect.object = target();
    expect(effect.getDamageAmount()).toBe(0);
    effect.setInt(DamageType.FIRE, 5);
    effect.setInt(DamageType.COLD, 7);
    effect.setInt(DamageType.ACID, NaN);
    expect(effect.getDamageAmount()).toBe(12);
  });

  test('immunity is type-specific and can reduce damage to zero', () => {
    const effect = new EffectDamage();
    effect.object = target([defense(GameEffectType.EffectDamageImmunityIncrease, [1 << DamageType.FIRE, 100])]);
    effect.setInt(DamageType.FIRE, 10);
    effect.setInt(DamageType.COLD, 4);
    expect(effect.getDamageAmount()).toBe(4);
  });

  test('exhausted resistances can remove themselves without skipping or crashing', () => {
    const effect = new EffectDamage();
    effect.object = target([
      defense(GameEffectType.EffectDamageResistance, [1 << DamageType.FIRE, 5, 3]),
      defense(GameEffectType.EffectDamageResistance, [1 << DamageType.COLD, 5, 2]),
    ]);
    effect.setInt(DamageType.FIRE, 10);
    effect.setInt(DamageType.COLD, 10);
    expect(effect.getDamageAmount()).toBe(15);
    expect(effect.object.effects).toHaveLength(0);
  });

  test('damage reduction shares its amount across physical slots only', () => {
    const effect = new EffectDamage();
    effect.object = target([defense(GameEffectType.EffectDamageReduction, [5, 0, 0])]);
    effect.setInt(DamageType.BLUDGEONING, 4);
    effect.setInt(DamageType.SLASHING, 4);
    effect.setInt(DamageType.FIRE, 8);
    expect(effect.getDamageAmount()).toBe(11);
  });
});

describe('item-property compatibility and cancelled spell visuals', () => {
  test('accepts historical field aliases and upgrade byte sentinels', () => {
    const ItemProperty = load('engine/ItemProperty.ts', 'ItemProperty', {
      '@/GameState': { GameState: { SWRuleSet: { itemPropsDef: [{ hasSubType: () => false }], costTables: [] } } },
    });
    const fields: Record<string, number> = { PropertyName: 0, SubType: 4, Usable: 1, UpgradeType: 255, CostTable: 255 };
    const property = new ItemProperty({ RootNode: { hasField: (name: string) => name in fields, getFieldByLabel: (name: string) => ({ getValue: () => fields[name] }) } }, { upgrades: 0 });
    expect(property.subType).toBe(4);
    expect(property.useable).toBe(1);
    expect(property.upgradeType).toBe(-1);
    expect(property.isUseable()).toBe(true);
  });

  test('numeric 2DA die strings use their actual die size', () => {
    const ItemProperty = load('engine/ItemProperty.ts', 'ItemProperty');
    const property = Object.create(ItemProperty.prototype);
    property.costTable = ModuleItemCostTable.Damage;
    property.costValue = 1;
    property.costTableDefinition = { rows: [{}, { numdice: '1', die: '4' }] };
    const roll = jest.spyOn(Dice, 'roll').mockReturnValue(3);
    expect(property.getValue()).toBe(3);
    expect(roll).toHaveBeenCalledWith(1, DiceType.d4);
  });

  test('a late projectile model is disposed instead of resurrected after cancellation', async () => {
    let resolveModel: (model: any) => void = () => {};
    const pending = new Promise(resolve => { resolveModel = resolve; });
    const attach = jest.fn();
    const SpellCastInstance = load('combat/SpellCastInstance.ts', 'SpellCastInstance', {
      '@/loaders': { MDLLoader: { loader: { load: async () => ({}) } } },
      '@/three/odyssey': { OdysseyModel3D: { FromMDL: () => pending } },
    });
    const owner = { context: { group: { effects: { add: attach } } }, model: { rhand: {} } };
    const spell = new SpellCastInstance(owner, undefined, { projmodel: 'test' });
    spell.init();
    await Promise.resolve();
    spell.dispose();
    const model = { dispose: jest.fn() };
    resolveModel(model);
    for(let i = 0; i < 5; i++) await Promise.resolve();
    expect(model.dispose).toHaveBeenCalledTimes(1);
    expect(attach).not.toHaveBeenCalled();
    expect(spell.projectile).toBeUndefined();
  });
});
