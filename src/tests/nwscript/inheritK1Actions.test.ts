import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { inheritK1Actions } from '@/nwscript/inheritK1Actions';
import type { INWScriptDefAction } from '@/interface/nwscript/INWScriptDefAction';

const def = (name: string, action?: () => unknown): INWScriptDefAction =>
  ({ comment: '', name, type: 0, args: [], action } as unknown as INWScriptDefAction);

describe('inheritK1Actions', () => {
  test('an unimplemented TSL routine borrows the K1 body when the names match', () => {
    const body = () => 1;
    const k1 = { 1: def('Random', body) };
    const k2 = { 1: def('Random') };
    inheritK1Actions(k1, k2);
    expect(k2[1].action).toBe(body);
  });

  test('a TSL routine with a different name at the same id stays unimplemented', () => {
    const k1 = { 770: def('PlayMovieQueue', () => 'movie') };
    const k2 = { 770: def('EffectForceBody') };
    inheritK1Actions(k1, k2);
    expect(k2[770].action).toBeUndefined();
  });

  test('a routine TSL already implements is left alone', () => {
    const own = () => 2;
    const k1 = { 5: def('Same', () => 1) };
    const k2 = { 5: def('Same', own) };
    inheritK1Actions(k1, k2);
    expect(k2[5].action).toBe(own);
  });

  test('ids only K1 has are not added to TSL', () => {
    const k2: { [key: number]: INWScriptDefAction } = {};
    inheritK1Actions({ 9: def('K1Only', () => 1) }, k2);
    expect(k2[9]).toBeUndefined();
  });
});

/**
 * Parsed from source rather than imported: the tables pull in the whole engine,
 * including THREE's ESM examples, which jest cannot load.
 */
function routineNames(file: string): Map<number, string> {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'nwscript', file), 'utf8');
  const names = new Map<number, string>();
  for (const match of source.matchAll(/\n {2}(\d+)\s*:\s*\{[^]*?name:\s*['"]([^'"]+)['"]/g)) {
    names.set(Number(match[1]), match[2]);
  }
  return names;
}

describe('K1 and TSL routine tables', () => {
  test('disagree on the names of exactly ids 768-771', () => {
    const k1 = routineNames('NWScriptDefK1.ts');
    const k2 = routineNames('NWScriptDefK2.ts');
    expect(k1.size).toBeGreaterThan(700);
    expect(k2.size).toBeGreaterThan(800);
    const differing = [...k2.keys()].filter((id) => k1.has(id) && k1.get(id) !== k2.get(id));
    expect(differing.sort((a, b) => a - b)).toEqual([768, 769, 770, 771]);
    expect(k1.get(770)).toBe('PlayMovieQueue');
    expect(k2.get(770)).toBe('EffectForceBody');
  });
});
