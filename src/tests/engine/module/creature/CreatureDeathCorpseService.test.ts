/**
 * Lightweight CreatureDeathCorpseService source checks (avoids GameObject import cycles).
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

describe('CreatureDeathCorpseService', () => {
  it('scheduleDestroyAsCorpse sets corpse schedule flags and skips party members', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'module', 'creature', 'CreatureDeathCorpseService.ts'),
      'utf8'
    );
    const start = src.indexOf('  scheduleDestroyAsCorpse(){');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('  updateCorpsePendingDestroy', start);
    const fn = src.slice(start, end > start ? end : start + 1200);

    expect(fn).toMatch(/if\(this\.host\.isPartyMember\(\)\) return;/);
    expect(fn).toMatch(/if\(this\.host\.corpseDestroyScheduled\) return;/);
    expect(fn).toMatch(/this\.host\.corpseDestroyScheduled\s*=\s*true/);
    expect(fn).toMatch(/this\.host\.keepCorpseOnDestroy\s*=/);
    expect(fn).toMatch(/this\.host\.setWillDestroy\(true\)/);
  });
});
