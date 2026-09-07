/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import {
  resolveBeginConversationDialog,
  resolveDialogStartOwner,
} from "@/actions/dialog-start";

const CREATURE = ModuleObjectType.ModuleObject | ModuleObjectType.ModuleCreature;
const DOOR = ModuleObjectType.ModuleObject | ModuleObjectType.ModuleDoor;

jest.mock("@/GameState", () => ({
  GameState: {
    PartyManager: {
      Player: undefined as any,
    },
  },
}));

jest.mock("@/resource/DLGObject", () => ({
  DLGObject: {
    FromResRef: (resref: string) => (resref ? { resref, __dlg: true } : undefined),
  },
}));

function mockCreature(partial: Record<string, unknown>) {
  return {
    objectType: CREATURE,
    isPartyMember: () => !!partial.isPM,
    isPlayer: !!partial.isPlayer,
    getConversation: () => partial.conversation,
    ...partial,
  } as any;
}

function mockDoor(partial: Record<string, unknown>) {
  return {
    objectType: DOOR,
    getConversation: () => partial.conversation,
    ...partial,
  } as any;
}

describe("resolveDialogStartOwner", () => {
  const player = mockCreature({ id: 1, isPlayer: true, isPM: true });
  const bastila = mockCreature({
    id: 2,
    isPlayer: false,
    isPM: true,
    conversation: { resref: "bastila" },
  });
  const door = mockDoor({ id: 3, conversation: { resref: "tar08_hang" } });
  const npc = mockCreature({
    id: 4,
    isPlayer: false,
    isPM: false,
    conversation: { resref: "npc" },
  });

  beforeEach(() => {
    const { GameState } = require("@/GameState");
    GameState.PartyManager.Player = player;
  });

  it("uses the door (last speaker) when a party CNPC begins conversation", () => {
    expect(resolveDialogStartOwner(bastila, door)).toBe(door);
  });

  it("uses the NPC when the player is the BeginConversation caller (Trask→PC)", () => {
    // : caller==player reassigns StartDialog owner to the listener
    expect(resolveDialogStartOwner(player, npc)).toBe(npc);
  });

  it("uses the caller when the listener is the player (click NPC / Deadeye)", () => {
    expect(resolveDialogStartOwner(npc, player)).toBe(npc);
    expect(resolveDialogStartOwner(door, player)).toBe(door);
  });

  it("uses the caller when both are the player", () => {
    expect(resolveDialogStartOwner(player, player)).toBe(player);
  });

  it("uses a non-party NPC caller when listener is not the player", () => {
    const other = mockCreature({ id: 5, isPlayer: false, isPM: false });
    expect(resolveDialogStartOwner(npc, other)).toBe(npc);
  });

  it("uses a door caller when listener is not the player", () => {
    expect(resolveDialogStartOwner(door, bastila)).toBe(door);
  });
});

describe("resolveBeginConversationDialog", () => {
  const door = mockDoor({
    conversation: { resref: "tar08_hang" },
  });

  it("prefers an explicit sResRef", () => {
    const dlg = resolveBeginConversationDialog("explicit", undefined, door);
    expect(dlg).toEqual({ resref: "explicit", __dlg: true });
  });

  it("prefers ActionStartConversation instance conversation (field78)", () => {
    const instanceDlg = { resref: "from_action" } as any;
    expect(resolveBeginConversationDialog("", instanceDlg, door)).toBe(instanceDlg);
  });

  it("blank uses StartDialog owner Conversation (door, not companion)", () => {
    const dlg = resolveBeginConversationDialog("", undefined, door);
    expect(dlg).toEqual({ resref: "tar08_hang" });
  });
});
