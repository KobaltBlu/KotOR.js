import { describe, expect, test } from '@jest/globals';
import { kotorRoutineMetadata, tslRoutineMetadata } from '@/nwscript/routineMetadata';

/**
 * K1 and TSL share most routine ids, but not all names. buildReconciledActionMap
 * only layers an implementation onto an id whose engine-specific name matches,
 * so a K1 body can never run under a different TSL routine (e.g. TSL's
 * EffectForceBody at 770 must not get K1's PlayMovieQueue).
 */
describe('K1 and TSL routine tables', () => {
  test('disagree on the names of exactly ids 768-771', () => {
    const k1 = new Map(kotorRoutineMetadata.map(([id, name]) => [id, name]));
    const k2 = new Map(tslRoutineMetadata.map(([id, name]) => [id, name]));
    expect(k1.size).toBeGreaterThan(700);
    expect(k2.size).toBeGreaterThan(800);
    const differing = [...k2.keys()].filter((id) => k1.has(id) && k1.get(id) !== k2.get(id));
    expect(differing.sort((a, b) => a - b)).toEqual([768, 769, 770, 771]);
    expect(k1.get(770)).toBe('PlayMovieQueue');
    expect(k2.get(770)).toBe('EffectForceBody');
  });
});
