/**
 * Per-frame creature drive — compatibility facade.
 *
 * Implementation lives in `@/engine/movement/drive-policy` (propose/resolve/commit).
 * Keep this path for existing imports and DriveUpdateResult enum.
 */

export {
  drivePrepareDestination as driveResolveMoveTarget,
  drivePrepareDestination,
  resolveDriveStep,
  tickCreatureDrive,
} from "@engine/movement/drive-policy";

export { queryDoorCrossing as getDoorCrossed } from "@engine/movement/area-movement-queries";

/** Retail DriveUpdateLocation result codes (action compatibility). */
export enum DriveUpdateResult {
  OK = 1,
  ARRIVED = 2,
  BLOCKED = 3,
}
