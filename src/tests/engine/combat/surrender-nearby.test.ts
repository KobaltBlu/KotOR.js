/**
 * SurrenderToEnemies nearby creature set (area + party).
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));
jest.mock("@engine/render/three/odyssey", () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock("@engine/render/three/odyssey/OdysseyModel3D", () => ({ OdysseyModel3D: class {} }));
jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));
jest.mock("@engine/nwscript/NWScript", () => ({ NWScript: {} }));
jest.mock("@engine/nwscript/NWScriptInstance", () => ({ NWScriptInstance: class {} }));
jest.mock("@engine/render/FollowerCamera", () => ({ FollowerCamera: {} }));

import { ModuleCreature } from "@engine/module/ModuleCreature";

describe('collectSurrenderNearbyCreatures', () => {
  it('includes party members that are not in area.creatures', () => {
    const areaNpc = { id: 'npc' };
    const partyPc = { id: 'pc' };
    const nearby = ModuleCreature.collectSurrenderNearbyCreatures([areaNpc], [partyPc]);
    expect(nearby).toEqual([areaNpc, partyPc]);
  });

  it('does not duplicate a creature already in area.creatures', () => {
    const shared = { id: 'shared' };
    const nearby = ModuleCreature.collectSurrenderNearbyCreatures([shared], [shared]);
    expect(nearby).toEqual([shared]);
  });

  it('skips null entries and empty sources', () => {
    expect(ModuleCreature.collectSurrenderNearbyCreatures(undefined, undefined)).toEqual([]);
    expect(ModuleCreature.collectSurrenderNearbyCreatures([null, undefined], [null])).toEqual([]);
  });
});
