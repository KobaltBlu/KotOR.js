/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";

const mockParty: unknown[] = [];

jest.mock("@/GameState", () => ({
  GameState: {
    getCurrentPlayer: () => mockParty[0],
    PartyManager: { party: mockParty },
  },
}));

import { getIsCreatureBumpable } from "@/engine/pathfinding/get-is-creature-bumpable";
import type { ModuleCreature } from "@/module/ModuleCreature";

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

describe("getIsCreatureBumpable", () => {
  it("does not let party followers bump world creatures", () => {
    const leader = creature({ id: 1, party: true });
    const follower = creature({ id: 2, party: true });
    const ambient = creature({ id: 9 });
    mockParty.length = 0;
    mockParty.push(leader, follower);

    expect(getIsCreatureBumpable(follower, ambient)).toBe(false);
  });

  it("still allows idle non-party friendly NPCs to bump other idle world creatures", () => {
    const mover = creature({ id: 20 });
    const ambient = creature({ id: 21 });
    mockParty.length = 0;

    expect(getIsCreatureBumpable(mover, ambient)).toBe(true);
  });
});
