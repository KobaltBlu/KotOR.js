/**
 * SurrenderToEnemies nearby creature set (area + party).
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { collectSurrenderNearbyCreatures } from '@/module/surrender-nearby';

describe('collectSurrenderNearbyCreatures', () => {
  it('includes party members that are not in area.creatures', () => {
    const areaNpc = { id: 'npc' };
    const partyPc = { id: 'pc' };
    const nearby = collectSurrenderNearbyCreatures([areaNpc], [partyPc]);
    expect(nearby).toEqual([areaNpc, partyPc]);
  });

  it('does not duplicate a creature already in area.creatures', () => {
    const shared = { id: 'shared' };
    const nearby = collectSurrenderNearbyCreatures([shared], [shared]);
    expect(nearby).toEqual([shared]);
  });

  it('skips null entries and empty sources', () => {
    expect(collectSurrenderNearbyCreatures(undefined, undefined)).toEqual([]);
    expect(collectSurrenderNearbyCreatures([null, undefined], [null])).toEqual([]);
  });
});
