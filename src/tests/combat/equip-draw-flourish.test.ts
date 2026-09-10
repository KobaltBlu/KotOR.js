/**
 * Hand-weapon equip plays FLOURISH (PlayDrawAnimation) when not instant.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

describe('equip draw flourish', () => {
  it('ActionEquipItem plays playDrawAnimation for non-instant hand equips', () => {
    const src = fs.readFileSync(srcPath('actions', 'ActionEquipItem.ts'), 'utf8');
    expect(src).toMatch(/playDrawAnimation\s*\(/);
    expect(src).toMatch(/ModuleCreatureArmorSlot\.RIGHTHAND/);
    expect(src).toMatch(/ModuleCreatureArmorSlot\.LEFTHAND/);
    expect(src).toMatch(/instant/);
  });

  it('ModuleCreature.playDrawAnimation uses FLOURISH / 1500ms like retail PlayDrawAnimation', () => {
    const src = fs.readFileSync(srcPath('module', 'ModuleCreature.ts'), 'utf8');
    const fn = src.match(
      /playDrawAnimation\s*\(\)\s*\{[\s\S]*?\n  \}/
    )?.[0] ?? '';
    expect(fn.length).toBeGreaterThan(80);
    expect(fn).toMatch(/ModuleCreatureAnimState\.FLOURISH/);
    expect(fn).toMatch(/1\.5/);
    expect(fn).toMatch(/ExcitedDurationRow\.SpellCast/);
  });
});
