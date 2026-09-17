import * as THREE from "three";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { GameState } from "@/GameState";
import { SignalEventType } from "@/enums/events/SignalEventType";
import {
  assertSingleCommit,
  recordMovementWrite,
} from "@/engine/movement/instrumentation";
import {
  ensureMovementState,
  getMovementFrameId,
} from "@/engine/movement/creature-movement-state";
import {
  MovementHitKind,
  MovementSource,
  MovementStatus,
  type MovementResult,
} from "@/engine/movement/types";
import { isCreature } from "@/module/guards/isCreature";

/**
 * Single normal creature movement committer.
 * Applies accepted MovementResult side effects exactly once per call.
 */

export type CommitContext = {
  delta?: number;
  /** Skip OnBlocked / contact updates (rare). */
  skipContact?: boolean;
};

const _disp = new THREE.Vector3();

export function commitMovement(
  creature: ModuleCreature,
  result: MovementResult,
  context: CommitContext = {}
): void {
  const state = ensureMovementState(creature);
  const frame = getMovementFrameId();

  assertSingleCommit(creature, result.source);
  recordMovementWrite(creature, "commit", {
    source: result.source,
    authority: state.authority,
  });

  // Door OnClicked without applying XY (retail DriveUpdateLocation reject).
  if(result.blockAfterDoorSignal && result.crossedTransition){
    signalDoorClicked(creature, result.crossedTransition);
    applyContact(creature, result, context);
    creature.speed = 0;
    creature.force = 0;
    state.lastCommitFrame = frame;
    state.lastCommitSource = result.source;
    if(result.incrementBlockingTimer){
      creature.blockingTimer = (creature.blockingTimer || 0) + 1;
    }
    return;
  }

  if(result.status === MovementStatus.Blocked && result.actualDistance < 1e-8){
    applyContact(creature, result, context);
    creature.speed = 0;
    creature.force = 0;
    state.lastCommitFrame = frame;
    state.lastCommitSource = result.source;
    if(result.incrementBlockingTimer){
      creature.blockingTimer = (creature.blockingTimer || 0) + 1;
    }else if(result.source === MovementSource.Walk || result.source === MovementSource.Drive){
      // Walk/Drive blocked frame: discrete stuck count
      creature.blockingTimer = (creature.blockingTimer || 0) + 1;
    }
    return;
  }

  const origin = result.origin;
  const final = result.finalPosition;
  creature.position.x = final.x;
  creature.position.y = final.y;
  creature.position.z = final.z;
  creature.markCollisionMatrixDirty?.("movement");
  // Frustum cull (isOnScreen) uses this.box — must refresh after XY commit.
  creature.computeBoundingBox?.();

  if(result.room && creature.attachToRoom){
    creature.attachToRoom(result.room);
  }

  if(result.groundFace && creature.collisionManager){
    creature.collisionManager.groundFace = result.groundFace;
    creature.collisionManager.lastGroundFace = result.groundFace;
    if(typeof (result.groundFace as { walkIndex?: number }).walkIndex === "number"){
      creature.collisionManager.surfaceId = (result.groundFace as { walkIndex: number }).walkIndex;
    }
  }

  _disp.set(final.x - origin.x, final.y - origin.y, final.z - origin.z);
  const delta = context.delta ?? 0;
  const speed = delta > 1e-8 ? result.actualDistance / delta : 0;
  creature.speed = speed;
  creature.force = 0;
  state.actualVelocity.set(
    delta > 1e-8 ? _disp.x / delta : 0,
    delta > 1e-8 ? _disp.y / delta : 0,
    delta > 1e-8 ? _disp.z / delta : 0
  );

  applyContact(creature, result, context);

  if(result.status === MovementStatus.Blocked){
    creature.blockingTimer = (creature.blockingTimer || 0) + 1;
  }else if(result.source === MovementSource.Walk){
    creature.blockingTimer = Math.max(0, (creature.blockingTimer || 0) - 1);
  }

  state.lastCommitFrame = frame;
  state.lastCommitSource = result.source;

  // Notify position listeners without recursing through teleport/setPosition physics.
  if(typeof (creature as ModuleCreature & { onPositionChanged?: () => void }).onPositionChanged === "function"){
    (creature as ModuleCreature & { onPositionChanged: () => void }).positionChanged = true;
  }
}

function applyContact(
  creature: ModuleCreature,
  result: MovementResult,
  context: CommitContext
): void {
  if(context.skipContact) return;
  const state = ensureMovementState(creature);
  const delta = context.delta ?? 0;

  let blocker: ModuleObject | undefined;
  if(result.hit?.kind === MovementHitKind.Creature){
    blocker = result.hit.object;
    if(!blocker && result.hit.creatureId != null){
      blocker =
        creature.area?.creatures?.find((c) => c.id === result.hit!.creatureId) ??
        GameState.PartyManager?.party?.find((c) => c.id === result.hit!.creatureId);
    }
  }else if(result.hit?.kind === MovementHitKind.Door){
    blocker = result.hit.object;
  }

  state.blockingObject = blocker;

  const entered =
    !!blocker && blocker !== state.lastBlockingObject;
  if(entered && isCreature(creature)){
    creature.onBlocked?.();
  }
  state.lastBlockingObject = blocker;

  if(blocker){
    state.collisionTime += delta;
    creature.collisionTimer = state.collisionTime;
  }
}

function signalDoorClicked(creature: ModuleCreature, door: ModuleObject){
  const tm = GameState.module?.timeManager;
  const event = new GameState.GameEventFactory.EventSignalEvent();
  event.setCaller(creature);
  event.setObject(door);
  event.setDay(tm?.pauseDay ?? 0);
  event.setTime(tm?.pauseTime ?? 0);
  event.eventType = SignalEventType.OnClicked;
  GameState.module?.addEvent?.(event);
}
