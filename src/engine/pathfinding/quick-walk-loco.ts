/**
 * Quick-walk locomotion mode for per-frame movers.
 *
 * Routes on this field before ordinary path walk:
 * 3 → FollowLeader SM
 * 4..6 → ForcePushed
 * 1 → paused / end-of-path (early return)
 * -1 → repath / reset path end
 *
 * @file quick-walk-loco.ts
 */

import type { ModuleCreature } from "@/module/ModuleCreature";

/** quick-walk locomotion loco modes (internal field). */
export enum QuickWalkLocoState {
  /** Live chase / path end invalid — replot next frame. */
  Repath = -1,
  /** Default / ordinary MoveTo / Drive path walk. */
  PathWalk = 0,
  /** Paused / ResetAtEndOfPath — QuickWalk early-outs. */
  Paused = 1,
  /** gate preserved (path-complete checks exclude this). */
  PathHold = 2,
  /** Party FollowLeader SM. */
  FollowLeader = 3,
  /** Force Push slide (effect apply). */
  ForcePushed = 4,
  /** Force Push alternate mode. */
  ForcePushedAlt = 5,
  /** Force Push alternate mode. */
  ForcePushedEnd = 6,
}

/** effect apply sets loco mode 4. */
export const FORCE_PUSH_LOCO_STATE = QuickWalkLocoState.ForcePushed;

export function getQuickWalkLocoState(creature: ModuleCreature | undefined): number {
  if(!creature) return QuickWalkLocoState.PathWalk;
  return (creature.quickWalkLocoState | 0) as QuickWalkLocoState;
}

export function setQuickWalkLocoState(
  creature: ModuleCreature | undefined,
  state: QuickWalkLocoState | number
): void {
  if(!creature) return;
  creature.quickWalkLocoState = state | 0;
}

/** True when QuickWalk routes to ForcePushed (state ∈ {4,5,6}). */
export function isForcePushLocoActive(creature: ModuleCreature | undefined): boolean {
  const s = getQuickWalkLocoState(creature);
  return (
    s === QuickWalkLocoState.ForcePushed ||
    s === QuickWalkLocoState.ForcePushedAlt ||
    s === QuickWalkLocoState.ForcePushedEnd
  );
}

/** True when QuickWalk routes to FollowLeader (state === 3). */
export function isFollowLeaderLocoActive(creature: ModuleCreature | undefined): boolean {
  return getQuickWalkLocoState(creature) === QuickWalkLocoState.FollowLeader;
}

/** True when QuickWalk early-outs as paused (state === 1). */
export function isQuickWalkPaused(creature: ModuleCreature | undefined): boolean {
  return getQuickWalkLocoState(creature) === QuickWalkLocoState.Paused;
}
