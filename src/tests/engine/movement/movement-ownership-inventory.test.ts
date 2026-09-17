/**
 * Phase-0 characterization inventory — documents ownership of creature movers.
 * Frozen reference for Retail Movement Harmony migration.
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { MovementAuthority, MovementPolicy, MovementSource } from "@/engine/movement/types";

/**
 * Living call-site → destination map (must stay aligned with engine code).
 */
export const MOVEMENT_OWNERSHIP_INVENTORY = [
  { path: "ActionDrive / drivePrepareDestination", dest: "DriveMovementPolicy.prepare" },
  { path: "tickCreatureDrive", dest: "DriveMovementPolicy.resolve → MovementCommitter" },
  { path: "tickCreatureWalk", dest: "Walk policy → tickCreatureDrive(Walk) → commit" },
  { path: "ModuleCreature player RK4", dest: "PlayerControlPolicy → commit" },
  { path: "party-follow-sm direct step", dest: "FollowLeader → MovementCommitter" },
  { path: "ActionFollowLeader.softTeleportForward", dest: "teleportObject placement" },
  { path: "tickForcePushLoco", dest: "ForcePush/Jump source → tickCreatureDrive → commit" },
  { path: "force-jump-loco install", dest: "Jump path install → ForcePush loco tick" },
  { path: "party-soft-separate", dest: "SoftSeparate teleportObject" },
  { path: "nudge-friendlies", dest: "FriendNudge teleportObject" },
  { path: "ActionJumpToPoint.applyLocalJump", dest: "applyLocalTeleport" },
  { path: "ModuleObject.setPosition", dest: "teleportObject (no slide/OnBlocked)" },
  { path: "tickExternalForceStep", dest: "ExternalForcePolicy → MovementCommitter" },
  { path: "settleWalkableAttachment / spawn settle", dest: "findWalkableAttachmentAt + applyWalkableAttachment" },
] as const;

describe("movement ownership inventory", () => {
  it("lists every live ordinary mover destination", () => {
    expect(MOVEMENT_OWNERSHIP_INVENTORY.length).toBeGreaterThanOrEqual(12);
    for(const row of MOVEMENT_OWNERSHIP_INVENTORY){
      expect(row.path.length).toBeGreaterThan(0);
      expect(row.dest.length).toBeGreaterThan(0);
    }
  });

  it("keeps authority / source / policy enums explicit (no flag bag)", () => {
    expect(Object.values(MovementAuthority)).toContain("PlayerControl");
    expect(Object.values(MovementSource)).toContain("Teleport");
    expect(Object.values(MovementPolicy)).toContain("Drive");
    expect(Object.values(MovementPolicy)).not.toContain("flags");
  });
});
