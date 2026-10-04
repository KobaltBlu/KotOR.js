/**
 * ClearAllActions must keep GetAttackTarget so GN_EquipAppropriateWeapon
 * (after ClearAllActions in GN_DetermineCombatRound) can switch ranged→melee.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';
import { CombatData } from '@engine/combat/CombatData';
import { ModuleObjectType } from '@core/enums/module/ModuleObjectType';

describe('ClearAllActions vs attack targets', () => {
  it('does not call combatData.reset (ClearAllActions keeps attack targets)', () => {
    const src = fs.readFileSync(srcPath('module', 'ModuleObject.ts'), 'utf8');
    const fn = src.match(
      /clearAllActions\(skipUnclearable = false\)\{[\s\S]*?\n  \}/
    )?.[0] ?? '';
    expect(fn.length).toBeGreaterThan(100);
    expect(fn).not.toMatch(/combatData\.reset\s*\(/);
  });

  it('CombatData.reset still clears targets for SetCombatState(0) / cancelCombat', () => {
    const self: any = {
      id: 1,
      objectType: ModuleObjectType.ModuleObject | ModuleObjectType.ModuleCreature,
    };
    self.combatData = new CombatData(self);
    const foe: any = { id: 2 };
    self.combatData.lastAttackTarget = foe;
    self.combatData.lastAttemptedAttackTarget = foe;
    self.combatData.lastSpellTarget = foe;
    self.combatData.lastAttemptedSpellTarget = foe;

    self.combatData.reset();

    expect(self.combatData.lastAttackTarget).toBeUndefined();
    expect(self.combatData.lastAttemptedAttackTarget).toBeUndefined();
    expect(self.combatData.lastSpellTarget).toBeUndefined();
    expect(self.combatData.lastAttemptedSpellTarget).toBeUndefined();
  });
});
