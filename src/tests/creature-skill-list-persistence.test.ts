import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * `ModuleCreature.save()` wrote the SkillList with a hardcoded `i < 8` and no
 * guard. The bound itself is right — skills.2da has eight rows and the authored
 * SkillList is eight entries — but `this.skills` is only populated by
 * `initProperties()`, and a creature reaching save() without that keeps the
 * empty array the constructor gave it. `this.skills[i].save()` then threw
 *
 *   TypeError: Cannot read properties of undefined (reading 'save')
 *       at ModuleCreature.save
 *
 * out of save() itself, so the whole template was lost rather than one field.
 *
 * Seen intermittently while loading all 82 TSL modules in one run — on 001EBO/512OND/950COR in
 * one run, 205TEL/402DXN/650DAN in another, none in a third — and never
 * reproducible in isolation, which is the signature of state accumulating
 * across module warps rather than a per-module fault.
 *
 * `ModuleCreature` reaches GameState and the whole engine graph, so the shape
 * is pinned at source level beside a model of the loop.
 */
const SOURCE = 'src/module/ModuleCreature.ts';
const contents = fs.readFileSync(path.join(process.cwd(), SOURCE), 'utf8');
const code = contents
  .split('\n')
  .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
  .join('\n');

describe('SkillList save', () => {
  test('does not index the skills array unguarded', () => {
    expect(code).not.toMatch(/skillList\.addChildStruct\(\s*this\.skills\[i\]\.save\(\)\s*\)/);
  });

  test('keeps the authored eight-entry shape', () => {
    const at = code.indexOf("GFFDataType.LIST, 'SkillList'");
    const loop = code.slice(at, at + 700);
    expect(loop).toMatch(/for\(let i = 0; i < 8; i\+\+\)/);
  });

  test('writes a rank-0 placeholder for a missing skill', () => {
    const at = code.indexOf("GFFDataType.LIST, 'SkillList'");
    const loop = code.slice(at, at + 700);
    expect(loop).toContain('placeholder');
    expect(loop).toMatch(/'Rank'\s*\)\s*\)\.setValue\(0\)/);
  });

  test('reports the creature rather than failing silently', () => {
    const at = code.indexOf("GFFDataType.LIST, 'SkillList'");
    const loop = code.slice(at, at + 900);
    expect(loop).toContain('console.error');
    expect(loop).toContain('getTag()');
  });
});

describe('SkillList load', () => {
  test('is bounded by both the template and the ruleset', () => {
    const at = code.indexOf("hasField('SkillList')");
    const block = code.slice(at, at + 500);
    expect(block).toMatch(/Math\.min\(skills\.length, this\.skills\.length\)/);
  });
});

/**
 * A model of the save loop, so the contract holds as behaviour and not only as
 * source text.
 */
describe('the loop contract', () => {
  function saveSkillList(skills: Array<{ rank: number } | undefined>) {
    const written: number[] = [];
    let missing = 0;
    for (let i = 0; i < 8; i += 1) {
      const skill = skills[i];
      if (skill) { written.push(skill.rank); continue; }
      missing += 1;
      written.push(0);
    }
    return { written, missing };
  }

  test('a fully populated creature writes its eight ranks unchanged', () => {
    const skills = [3, 1, 4, 1, 5, 9, 2, 6].map((rank) => ({ rank }));
    const { written, missing } = saveSkillList(skills);
    expect(written).toEqual([3, 1, 4, 1, 5, 9, 2, 6]);
    expect(missing).toBe(0);
  });

  // The reported failure: an uninitialised creature.
  test('an empty skills array still writes eight entries and reports', () => {
    const { written, missing } = saveSkillList([]);
    expect(written).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(missing).toBe(8);
  });

  test('a partially populated array fills only the gaps', () => {
    const { written, missing } = saveSkillList([{ rank: 2 }, undefined, { rank: 7 }]);
    expect(written).toEqual([2, 0, 7, 0, 0, 0, 0, 0]);
    expect(missing).toBe(6);
  });

  test('extra skills beyond eight are not written', () => {
    const skills = new Array(12).fill(0).map((_, i) => ({ rank: i }));
    expect(saveSkillList(skills).written).toHaveLength(8);
  });
});
