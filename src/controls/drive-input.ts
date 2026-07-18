import { ClientCameraMode } from "@/enums/engine/ClientCameraMode";
import { GameState } from "@/GameState";
import { FollowerCamera } from "@/engine/FollowerCamera";
import { Utility } from "@/utility/Utility";
import { ActionType } from "@/enums/actions/ActionType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import type { ModuleCreature } from "@/module/ModuleCreature";

/** Control flag bits — match ActionDrive / AddDriveAction */
export const DRIVE_FORWARD = 0x01;
export const DRIVE_BACKWARD = 0x02;
export const DRIVE_RUN = 0x03;
export const DRIVE_STRAFE_LEFT = 0x04;
export const DRIVE_STRAFE_RIGHT = 0x08;
export const DRIVE_YAW_LEFT = 0x10;
export const DRIVE_YAW_RIGHT = 0x20;

/**
 * Retail drive-control gate: camera mode 5 (FREELOOK/DRIVE) or creature.driveControlActive.
 * Mode 5 is shared with FreeLook (SetFreeLookCamera @ 006413c0). Not swoop MG.
 */
export function isDriveControlActive(creature: ModuleCreature | undefined): boolean {
  if(!creature) return false;
  if(!creature.isCommandable) return false;
  if(creature.driveControlActive) return true;
  return GameState.clientCameraMode === ClientCameraMode.DRIVE;
}

/**
 * Apply stick/keyboard bits via AddDriveAction (HandlePlayerToServerInputDriveControl).
 */
export function applyDriveInput(creature: ModuleCreature, flags: number): void {
  if(!creature || !flags) return;
  if(!creature.canMove?.()) return;
  if(!creature.isCommandable) return;

  const facingRad = Utility.NormalizeRadian(FollowerCamera.facing + Math.PI / 2);
  let facingDeg = (facingRad * 180) / Math.PI;
  while(facingDeg < 0) facingDeg += 360;
  while(facingDeg >= 360) facingDeg -= 360;

  GameState.ActionFactory.AddDriveAction(creature, flags, facingDeg, {
    x: creature.position.x,
    y: creature.position.y,
    clear: true,
    retry: 2,
  });
  creature.controlled = true;
}

/**
 * Abort front Drive action retry (HandlePlayerToServerInputAbortDriveControl).
 */
export function abortDriveControl(creature: ModuleCreature | undefined): void {
  if(!creature?.actionQueue) return;
  const front = creature.actionQueue[0] as any;
  if(front?.type === ActionType.ActionDrive){
    front.setParameter?.(5, ActionParameterType.INT, 0);
  }
}
