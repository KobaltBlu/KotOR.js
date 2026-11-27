/**
 * @jest-environment node
 *
 * Small NWScript helpers whose retail behaviour scripts rely on:
 * Random(n) is uniform over 0..n-1, HoursToSeconds uses the module's
 * minutes per hour, and GetStringByStrRef returns "" for a bad strref.
 *
 * NWScriptDefK1 pulls in the whole engine, so the action bodies are read
 * from source and run against a stub GameState.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

const src = fs.readFileSync(srcPath('engine', 'nwscript', 'NWScriptDefK1.ts'), 'utf8');

function actionFor(name: string, GameState: any): (args: any[]) => any {
  const re = new RegExp(`name: "${name}",[\\s\\S]*?action: function\\([^)]*\\)\\{([\\s\\S]*?)\\r?\\n    \\}\\r?\\n  \\},`);
  const match = src.match(re);
  if(!match) throw new Error(`${name} not found`);
  return new Function('GameState', 'NW_TRUE', 'NW_FALSE', 'args', match[1]).bind(null, GameState, 1, 0) as any;
}

describe('NWScript K1 retail helpers', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('Random(n) is rand() % n: 0..n-1, 0 for n = 0, and 0..-(|n|-1) for negative n', () => {
    const random = actionFor('Random', {});
    const seen = new Map<number, number>();
    for(let i = 0; i < 3000; i++){
      const v = random([3]);
      seen.set(v, (seen.get(v) || 0) + 1);
    }
    expect([...seen.keys()].sort()).toEqual([0, 1, 2]);
    for(const count of seen.values()) expect(count).toBeGreaterThan(800);
    expect(random([0])).toBe(0);
    for(let i = 0; i < 200; i++){
      const v = random([-5]);
      expect(v).toBeLessThanOrEqual(0);
      expect(v).toBeGreaterThan(-5);
    }
  });

  it('GetIsPC is true only for the creature the player controls', () => {
    const leader = { id: 1 };
    const follower = { id: 2 };
    const isPC = actionFor('GetIsPC', { PartyManager: { getPCIteratorList: () => [leader], party: [leader, follower] } });
    const NW_TRUE = 1;
    expect(isPC.call(null, [leader])).toBe(NW_TRUE);
    expect(isPC.call(null, [follower])).toBe(0);
    expect(isPC.call(null, [undefined])).toBe(0);
  });

  it('HoursToSeconds scales by the module minutes per hour', () => {
    const hours = actionFor('HoursToSeconds', { module: { timeManager: { minutesPerHour: 2 } } });
    expect(hours([3])).toBe(360);
  });

  it('GetStringByStrRef returns an empty string for an invalid strref', () => {
    const get = actionFor('GetStringByStrRef', { TLKManager: { GetStringById: (): any => undefined } });
    expect(get([-1])).toBe('');
  });
});
