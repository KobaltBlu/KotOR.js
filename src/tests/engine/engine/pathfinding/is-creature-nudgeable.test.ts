/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";

const mockParty: unknown[] = [];

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    PartyManager: {
      getCurrentPlayer: () => mockParty[0],
      party: mockParty,
    },
  },
}));

import { isCreatureNudgeable } from "@engine/pathfinding/is-creature-nudgeable";
import type { ModuleCreature } from "@engine/module/ModuleCreature";

function creature(options: {
  id: number;
  party?: boolean;
  queueLength?: number;
}): ModuleCreature {
  return {
    id: options.id,
    isDead: () => false,
    isPartyMember: () => !!options.party,
    getReputation: () => 50,
    actionQueue: Array.from({ length: options.queueLength ?? 0 }),
    combatRound: { roundPaused: false },
  } as unknown as ModuleCreature;
}

describe("isCreatureNudgeable", () => {
  it("does not let party followers bump world creatures", () => {
    const leader = creature({ id: 1, party: true });
    const follower = creature({ id: 2, party: true });
    const ambient = creature({ id: 9 });
    mockParty.length = 0;
    mockParty.push(leader, follower);

    expect(isCreatureNudgeable(follower, ambient)).toBe(false);
  });

  it("still allows idle non-party friendly NPCs to bump other idle world creatures", () => {
    const mover = creature({ id: 20 });
    const ambient = creature({ id: 21 });
    mockParty.length = 0;

    expect(isCreatureNudgeable(mover, ambient)).toBe(true);
  });
});
