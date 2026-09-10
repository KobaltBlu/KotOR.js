/**
 * Ranged→melee AI switch: GetWeaponRanged + ActionEquipMostDamaging* + hand equip sync.
 * Avoids importing NWScriptDefK1 (FollowerCamera / window).
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

describe('GetWeaponRanged (opcode 511)', () => {
  it('uses isRangedWeapon like retail ranged_weapon, not WeaponType == 4', () => {
    const src = fs.readFileSync(srcPath('nwscript', 'NWScriptDefK1.ts'), 'utf8');
    const block = src.match(
      /511:\{[\s\S]*?name: "GetWeaponRanged"[\s\S]*?\n  \},/
    )?.[0] ?? '';
    expect(block).toMatch(/isRangedWeapon\(\)/);
    expect(block).not.toMatch(/getWeaponType\(\)\s*==\s*4/);
  });
});

describe('ActionEquipMostDamagingMelee/Ranged (opcodes 399/400)', () => {
  it('defers to combatRound.addEquipAction while combatState is set', () => {
    const src = fs.readFileSync(srcPath('nwscript', 'NWScriptDefK1.ts'), 'utf8');
    const melee = src.match(
      /399:\{[\s\S]*?name: "ActionEquipMostDamagingMelee"[\s\S]*?\n  \},/
    )?.[0] ?? '';
    const ranged = src.match(
      /400:\{[\s\S]*?name: "ActionEquipMostDamagingRanged"[\s\S]*?\n  \},/
    )?.[0] ?? '';

    expect(melee).toMatch(/combatData\?\.combatState && creature\.combatRound/);
    expect(melee).toMatch(/addEquipAction\(weapon,\s*slot,\s*false\)/);
    expect(melee).toMatch(/actionQueue\.addFront\(action\)/);
    expect(melee).not.toMatch(/console\.log\(/);

    expect(ranged).toMatch(/combatData\?\.combatState && creature\.combatRound/);
    expect(ranged).toMatch(/addEquipAction\(weapon,\s*slot,\s*false\)/);
    expect(ranged).toMatch(/actionQueue\.addFront\(action\)/);
  });

  it('K2 stubs inherit K1 actions when action is undefined', () => {
    const src = fs.readFileSync(srcPath('nwscript', 'NWScriptDefK2.ts'), 'utf8');
    expect(src).toMatch(
      /if\(NWScriptDefK2\.Actions\[property\]\.action === undefined\)[\s\S]*?NWScriptDefK1\.Actions\[property\]\.action/
    );
    expect(src).toMatch(/name: 'ActionEquipMostDamagingMelee'[\s\S]*?action: undefined/);
    expect(src).toMatch(/name: 'GetWeaponRanged'[\s\S]*?action: undefined/);
  });
});

describe('equipItem hand-slot sync', () => {
  it('stamps RIGHTHAND/LEFTHAND before await loadModel', () => {
    const src = fs.readFileSync(srcPath('module', 'ModuleCreature.ts'), 'utf8');
    // Early hand branch: assign equipment, then await loadModel (return before body switch)
    expect(src).toMatch(
      /Stamp hand slots before await[\s\S]*?case ModuleCreatureArmorSlot\.RIGHTHAND:[\s\S]*?this\.equipment\.RIGHTHAND = item;[\s\S]*?await item\.loadModel\(\)/
    );
    expect(src).toMatch(
      /case ModuleCreatureArmorSlot\.LEFTHAND:[\s\S]*?this\.equipment\.LEFTHAND = item;[\s\S]*?await item\.loadModel\(\)/
    );
  });
});
