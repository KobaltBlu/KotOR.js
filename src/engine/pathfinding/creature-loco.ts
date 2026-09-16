/**
 * Creature locomotion mode for per-frame movers.
 *
 * Routes on this field before ordinary path walk:
 * 3 → FollowLeader SM
 * 4 → ForcePushed
 * 5 → ForceJump jumper
 * 6 → ForceJump shoved target
 * 1 → paused / end-of-path (early return)
 * -1 → repath / reset path end
 *
 * @file creature-loco.ts
 */

import type { ModuleCreature } from "@/module/ModuleCreature";

/** Creature locomotion modes (internal field). */
export enum CreatureLocoState {
  /** Live chase / path end invalid — replot next frame. */
  Repath = -1,
  /** Default / ordinary MoveTo / Drive path walk. */
  PathWalk = 0,
  /** Paused / ResetAtEndOfPath — creature loco early-outs. */
  Paused = 1,
  /** gate preserved (path-complete checks exclude this). */
  PathHold = 2,
  /** Party FollowLeader SM. */
  PartyFollow = 3,
  /** Force Push slide (on apply). */
  ForcePushed = 4,
  /** Force Jump jumper leap (delayed apply). */
  ForceJump = 5,
  /** Force Jump shoved target (unsafe landing). */
  ForceJumpTarget = 6,
}

/** Force Push on-apply sets loco mode 4. */
export const FORCE_PUSH_LOCO_STATE = CreatureLocoState.ForcePushed;

export function getCreatureLocoState(creature: ModuleCreature | undefined): number {
  if(!creature) return CreatureLocoState.PathWalk;
  return (creature.creatureLocoState | 0) as CreatureLocoState;
}

export function setCreatureLocoState(
  creature: ModuleCreature | undefined,
  state: CreatureLocoState | number
): void {
  if(!creature) return;
  creature.creatureLocoState = state | 0;
}

/** True when creature loco routes to Force Push / Force Jump (state ∈ {4,5,6}). */
export function isForcePushLocoActive(creature: ModuleCreature | undefined): boolean {
  const s = getCreatureLocoState(creature);
  return (
    s === CreatureLocoState.ForcePushed ||
    s === CreatureLocoState.ForceJump ||
    s === CreatureLocoState.ForceJumpTarget
  );
}

/** True when creature loco routes to FollowLeader (state === 3). */
export function isPartyFollowLocoActive(creature: ModuleCreature | undefined): boolean {
  return getCreatureLocoState(creature) === CreatureLocoState.PartyFollow;
}

/** True when creature loco early-outs as paused (state === 1). */
export function isCreatureLocoPaused(creature: ModuleCreature | undefined): boolean {
  return getCreatureLocoState(creature) === CreatureLocoState.Paused;
}
