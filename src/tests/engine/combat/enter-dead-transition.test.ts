/**
 * enter-DEAD SetAnimation DIE insert.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import { ModuleCreatureAnimState } from '@core/enums/module/ModuleCreatureAnimState';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));
jest.mock("@engine/render/three/odyssey", () => ({ OdysseyFace3: class {}, OdysseyModel3D: class {}, OdysseyObject3D: class {} }));
jest.mock("@engine/render/three/odyssey/OdysseyModel3D", () => ({ OdysseyModel3D: class {} }));
jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));
jest.mock("@engine/nwscript/NWScript", () => ({ NWScript: {} }));
jest.mock("@engine/nwscript/NWScriptInstance", () => ({ NWScriptInstance: class {} }));
jest.mock("@engine/render/FollowerCamera", () => ({ FollowerCamera: {} }));

import { ModuleCreature } from "@engine/module/ModuleCreature";
import { shouldSnapCombatReady } from '@engine/combat/combat-round-pause';

describe('resolveEnterDeadTransition', () => {
  it('inserts DIE when entering DEAD from combat READY', () => {
    expect(ModuleCreature.resolveEnterDeadTransition(
      ModuleCreatureAnimState.DEAD,
      ModuleCreatureAnimState.READY,
    )).toBe(ModuleCreatureAnimState.DIE);
  });

  it('inserts DIE1 when entering DEAD1 from a non-dead pose', () => {
    expect(ModuleCreature.resolveEnterDeadTransition(
      ModuleCreatureAnimState.DEAD1,
      ModuleCreatureAnimState.PAUSE,
    )).toBe(ModuleCreatureAnimState.DIE1);
  });

  it('keeps DEAD when already on DEAD', () => {
    expect(ModuleCreature.resolveEnterDeadTransition(
      ModuleCreatureAnimState.DEAD,
      ModuleCreatureAnimState.DEAD,
    )).toBe(ModuleCreatureAnimState.DEAD);
  });

  it('keeps DEAD when promoting from DIE (no re-insert)', () => {
    expect(ModuleCreature.resolveEnterDeadTransition(
      ModuleCreatureAnimState.DEAD,
      ModuleCreatureAnimState.DIE,
    )).toBe(ModuleCreatureAnimState.DEAD);
  });

  it('keeps DEAD1 when promoting from DIE1', () => {
    expect(ModuleCreature.resolveEnterDeadTransition(
      ModuleCreatureAnimState.DEAD1,
      ModuleCreatureAnimState.DIE1,
    )).toBe(ModuleCreatureAnimState.DEAD1);
  });

  it('does not remap non-DEAD requests', () => {
    expect(ModuleCreature.resolveEnterDeadTransition(
      ModuleCreatureAnimState.READY,
      ModuleCreatureAnimState.PAUSE,
    )).toBe(ModuleCreatureAnimState.READY);
  });
});

describe('shouldSnapCombatReady during enter-DEAD', () => {
  it('does not READY-snap living DIE or DEAD poses', () => {
    expect(shouldSnapCombatReady({
      dead: false,
      debilitated: false,
      resultsCalculated: false,
      scriptedDead: true,
    })).toBe(false);
  });
});
