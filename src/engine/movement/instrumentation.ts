import { GameState } from "@/GameState";
import { EngineDebugType } from "@/enums/engine/EngineDebugType";
import type { ModuleObject } from "@/module/ModuleObject";
import { getMovementFrameId } from "@/engine/movement/creature-movement-state";
import type { MovementAuthority, MovementSource } from "@/engine/movement/types";

/**
 * Dev instrumentation for unauthorized creature position / collision mutations.
 * Enabled when EngineDebugType.MOVEMENT_OWNERSHIP is on (or NODE_ENV=test via flag).
 */

export type MovementWriteKind =
  | "commit"
  | "teleport"
  | "unauthorized"
  | "updateCollision"
  | "directPosition";

let _assertEnabled = false;
let _logEnabled = false;

export function setMovementInstrumentation(opts: {
  assert?: boolean;
  log?: boolean;
}): void {
  if(typeof opts.assert === "boolean") _assertEnabled = opts.assert;
  if(typeof opts.log === "boolean") _logEnabled = opts.log;
}

export function isMovementInstrumentationEnabled(): boolean {
  try{
    if(GameState.debug?.[EngineDebugType.MOVEMENT_OWNERSHIP as EngineDebugType]){
      return true;
    }
  }catch{
    /* GameState may be mocked */
  }
  return _assertEnabled || _logEnabled;
}

export function recordMovementWrite(
  object: ModuleObject | undefined,
  kind: MovementWriteKind,
  detail: {
    source?: MovementSource | string;
    authority?: MovementAuthority | string;
    caller?: string;
  } = {}
): void {
  if(!object || !isMovementInstrumentationEnabled()) return;
  const frame = getMovementFrameId();
  const msg =
    `[movement] frame=${frame} id=${object.id} kind=${kind}` +
    (detail.source ? ` source=${detail.source}` : "") +
    (detail.authority ? ` authority=${detail.authority}` : "") +
    (detail.caller ? ` caller=${detail.caller}` : "");
  if(_logEnabled || GameState.debug?.[EngineDebugType.MOVEMENT_OWNERSHIP as EngineDebugType]){
    // eslint-disable-next-line no-console
    console.debug(msg);
  }
  if(_assertEnabled && kind === "unauthorized"){
    throw new Error(msg);
  }
}

/**
 * Assert that a normal XY commit has not already happened this frame.
 */
export function assertSingleCommit(
  object: ModuleObject,
  source: MovementSource | string
): void {
  const state = (object as ModuleObject & {
    movementState?: { lastCommitFrame: number; lastCommitSource?: string };
  }).movementState;
  if(!state) return;
  const frame = getMovementFrameId();
  if(state.lastCommitFrame === frame && frame !== 0){
    const msg =
      `Creature ${object.id} received multiple movement commits during frame ${frame}` +
      ` (prior=${state.lastCommitSource}, next=${source})`;
    if(_assertEnabled || isMovementInstrumentationEnabled()){
      throw new Error(msg);
    }
    // eslint-disable-next-line no-console
    console.error(msg);
  }
}
