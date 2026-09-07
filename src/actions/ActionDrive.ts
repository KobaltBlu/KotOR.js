import * as THREE from "three";
import { Action } from "@/actions/Action";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";
import {
  DriveUpdateResult,
  driveResolveMoveTarget,
  updateCreatureDrive,
} from "@/engine/pathfinding/update-creature-drive";
import { DRIVE_STRAFE_RATE } from "@/engine/pathfinding/locomotion";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { BitWise } from "@/utility/BitWise";

/** Control flag bits from drive action */
const DRIVE_FORWARD = 0x01;
const DRIVE_BACKWARD = 0x02;
const DRIVE_RUN = 0x03; // FORWARD|BACKWARD packed as run
const DRIVE_STRAFE_LEFT = 0x04;
const DRIVE_STRAFE_RIGHT = 0x08;
const DRIVE_YAW_LEFT = 0x10;
const DRIVE_YAW_RIGHT = 0x20;

const DEG2RAD = Math.PI / 180;
const ARRIVAL_DIST = 0.5;
const YAW_DEG = 30;
/** destination lookahead = GetWalk/RunRate * 0.0004 (milli-units) ≈ 0.4s of travel. */
const DEST_LOOKAHEAD_SEC = 0.4;

/**
 * ActionDrive class.
 * Vehicle / stick drive — drive action
 * + creature drive update.
 *
 * Params match AddDriveAction:
 * 0 FLOAT x, 1 FLOAT y, 2 INT facing*10, 3 INT pathId,
 * 4 INT flags, 5 INT retry, 6 INT refresh
 *
 * @file ActionDrive.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionDrive extends Action {

  private static readonly _tmpFwd = new THREE.Vector3();
  private static readonly _tmpMove = new THREE.Vector3();
  private static readonly _tmpDest = new THREE.Vector3();

  private destInitialized = false;
  private destination = new THREE.Vector3();
  private running = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionDrive;
  }

  /**
   * Build a drive action node (AddDriveAction equivalent).
   */
  static create(
    x: number,
    y: number,
    facingDeg: number,
    flags: number,
    options: {
      pathId?: number;
      retry?: number;
      refresh?: number;
      groupId?: number;
    } = {}
  ): ActionDrive {
    const action = new ActionDrive(-1, options.groupId ?? -1);
    const packedFacing = Math.max(0, Math.min(0x7fff, Math.round(facingDeg * 10))) | 0;
    action.setParameter(0, ActionParameterType.FLOAT, x);
    action.setParameter(1, ActionParameterType.FLOAT, y);
    action.setParameter(2, ActionParameterType.INT, packedFacing);
    action.setParameter(3, ActionParameterType.INT, options.pathId ?? 0);
    action.setParameter(4, ActionParameterType.INT, flags | 0);
    action.setParameter(5, ActionParameterType.INT, options.retry ?? 2);
    action.setParameter(6, ActionParameterType.INT, options.refresh ?? 1);
    return action;
  }

  /** Pack facing radians to degrees×10 */
  static packFacingRad(facingRad: number): number {
    let deg = (facingRad * 180) / Math.PI;
    while(deg < 0) deg += 360;
    while(deg >= 360) deg -= 360;
    return Math.max(0, Math.min(0x7fff, Math.round(deg * 10))) | 0;
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.ERROR;
    }

    const owner = this.owner as ModuleCreature;
    if(owner.isDead?.() || !owner.area){
      return ActionStatus.ERROR;
    }

    const flags = (this.getParameter<number>(4) ?? 0) | 0;
    const retry = (this.getParameter<number>(5) ?? 0) | 0;
    const refresh = (this.getParameter<number>(6) ?? 0) | 0;
    const packedFacing = this.getParameter<number>(2) ?? 0;
    const clientX = this.getParameter<number>(0);
    const clientY = this.getParameter<number>(1);

    if(!this.destInitialized || refresh){
      this.buildDestination(owner, flags, packedFacing, clientX, clientY);
      this.setParameter(6, ActionParameterType.INT, 0);
      this.destInitialized = true;
    }

    // Facing-only (or empty move): orientation applied in buildDestination
    if(this.destination.distanceToSquared(owner.position) < 1e-8){
      owner.force = 0;
      owner.speed = 0;
      owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      return ActionStatus.COMPLETE;
    }

    // Keep facing from packed orientation
    let facingRad = this.facingRadFromPacked(packedFacing);
    if(flags & DRIVE_YAW_LEFT) facingRad += YAW_DEG * DEG2RAD;
    else if(flags & DRIVE_YAW_RIGHT) facingRad -= YAW_DEG * DEG2RAD;
    owner.setFacing(facingRad - Math.PI / 2, false, TURN_SPEED_FAST);

    if((flags & DRIVE_RUN) === DRIVE_RUN){
      owner.setAnimationState(ModuleCreatureAnimState.RUNNING);
    }else if((flags & DRIVE_STRAFE_LEFT) !== 0){
      owner.setAnimationState(ModuleCreatureAnimState.WALKING); // 0x275e
    }else if((flags & DRIVE_STRAFE_RIGHT) !== 0){
      owner.setAnimationState(ModuleCreatureAnimState.WALKING); // 0x275f
    }else if((flags & DRIVE_BACKWARD) === DRIVE_BACKWARD){
      owner.setAnimationState(ModuleCreatureAnimState.WALKING_BACK);
    }else{
      owner.setAnimationState(ModuleCreatureAnimState.WALKING);
    }

    const strafing =
      (flags & DRIVE_STRAFE_LEFT) !== 0 || (flags & DRIVE_STRAFE_RIGHT) !== 0;
    const result = updateCreatureDrive(
      owner,
      this.destination,
      this.running,
      delta,
      strafing ? DRIVE_STRAFE_RATE : undefined
    );

    if(result === DriveUpdateResult.BLOCKED){
      owner.force = 0;
      owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      return ActionStatus.ERROR;
    }

    if(result === DriveUpdateResult.ARRIVED){
      owner.force = 0;
      owner.speed = 0;
      owner.setAnimationState(ModuleCreatureAnimState.IDLE);

      // : on return 2 with retry > 1, requeue AddDriveAction
      if(retry > 1){
        const cont = ActionDrive.create(
          owner.position.x,
          owner.position.y,
          this.facingDegFromPacked(packedFacing),
          flags,
          {
            pathId: this.getParameter<number>(3) ?? 0,
            retry: retry - 1,
            refresh: 1,
            groupId: this.groupId,
          }
        );
        owner.actionQueue.addFront(cont);
      }
      return ActionStatus.COMPLETE;
    }

    if((owner as any).blockingTimer >= 5 || owner.collisionTimer >= 1){
      (owner as any).blockingTimer = 0;
      owner.collisionTimer = 0;
      owner.force = 0;
      owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      return ActionStatus.ERROR;
    }

    return ActionStatus.IN_PROGRESS;
  }

  private facingRadFromPacked(packed: number): number {
    return (packed | 0) * 0.1 * DEG2RAD;
  }

  private facingDegFromPacked(packed: number): number {
    return (packed | 0) * 0.1;
  }

  private buildDestination(
    owner: ModuleCreature,
    flags: number,
    packedFacing: number,
    clientX: number | undefined,
    clientY: number | undefined,
  ): void {
    // locomotionScale starts at 1.0 each resolve; slide may lower it
    owner.locomotionScale = 1;
    const facingRad = this.facingRadFromPacked(packedFacing);
    const fwd = ActionDrive._tmpFwd.set(Math.cos(facingRad), Math.sin(facingRad), 0);
    const move = ActionDrive._tmpMove.set(0, 0, 0);

    let stepScale = 0;
    const strafeLeft = (flags & DRIVE_STRAFE_LEFT) !== 0;
    const strafeRight = (flags & DRIVE_STRAFE_RIGHT) !== 0;

    if(strafeLeft){
      move.x += -fwd.y;
      move.y += fwd.x;
      stepScale = 0.8;
    }else if(strafeRight){
      move.x += fwd.y;
      move.y += -fwd.x;
      stepScale = 0.8;
    }

    this.running = (flags & DRIVE_RUN) === DRIVE_RUN;
    const walk = owner.getWalkSpeed() || 1.7;
    const run = owner.getRunSpeed() || 5.4;
    // : destination offset = normalize(move) * (GetWalk/RunRate * 0.0004)
    // JS rates are world units/sec → use DEST_LOOKAHEAD_SEC of travel.
    if(this.running){
      move.add(fwd);
      stepScale = run * DEST_LOOKAHEAD_SEC;
    }else if(flags & DRIVE_FORWARD){
      move.add(fwd);
      stepScale = walk * DEST_LOOKAHEAD_SEC;
    }else if(flags & DRIVE_BACKWARD){
      move.sub(fwd);
      stepScale = walk * DEST_LOOKAHEAD_SEC;
    }else if(strafeLeft || strafeRight){
      stepScale = walk * DEST_LOOKAHEAD_SEC * 0.8;
    }

    // applies ±30° yaw to both move and facing after stick compose
    let orientRad = facingRad;
    if(flags & (DRIVE_YAW_LEFT | DRIVE_YAW_RIGHT)){
      const yaw = (flags & DRIVE_YAW_LEFT) ? YAW_DEG * DEG2RAD : -YAW_DEG * DEG2RAD;
      const c = Math.cos(yaw);
      const s = Math.sin(yaw);
      const fx = fwd.x * c - fwd.y * s;
      const fy = fwd.x * s + fwd.y * c;
      fwd.set(fx, fy, 0);
      orientRad = Math.atan2(fwd.y, fwd.x);
      if(move.lengthSq() > 1e-8){
        const mx = move.x * c - move.y * s;
        const my = move.x * s + move.y * c;
        move.set(mx, my, 0);
      }
    }

    owner.setFacing(orientRad - Math.PI / 2, false, TURN_SPEED_FAST);

    const dest = ActionDrive._tmpDest.copy(owner.position);
    if(typeof clientX === 'number' && typeof clientY === 'number' && owner.area){
      const dx = clientX - owner.position.x;
      const dy = clientY - owner.position.y;
      if(dx * dx + dy * dy > ARRIVAL_DIST * ARRIVAL_DIST){
        const ideal = new THREE.Vector3(clientX, clientY, owner.position.z);
        dest.copy(driveResolveMoveTarget(owner.area, owner.position, ideal, owner));
      }
    }

    if(move.lengthSq() > 1e-8 && stepScale > 0){
      move.normalize().multiplyScalar(stepScale);
      dest.x += move.x;
      dest.y += move.y;
      // drive action: TestDirectLine binary + wall-slide before creature drive update
      if(owner.area){
        this.destination.copy(
          driveResolveMoveTarget(owner.area, owner.position, dest, owner, stepScale)
        );
      }else{
        this.destination.copy(dest);
      }
    }else{
      this.destination.copy(owner.position);
    }
  }

}
