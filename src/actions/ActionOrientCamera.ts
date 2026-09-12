import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import {
  CAMERA_LOC_FLAG_DISTANCE,
  CAMERA_LOC_FLAG_FACING,
  CAMERA_LOC_FLAG_PITCH,
  CAMERA_LOC_FLAG_TRANSITION,
  FollowerCamera,
} from "@/engine/FollowerCamera";

/**
 * ActionOrientCamera class.
 * orient-camera action — sends
 * SendServerToPlayerCamera_ChangeLocation then completes
 * immediately (transition is client-side).
 *
 * Action params (NWScript SetCameraFacing packing):
 * 0 - int: flags (bit0 facing, bit1 pitch, bit2 distance, bit3 transition)
 * 1 - float: float1 (facing degrees when bit0)
 * 2 - float: float2 (pitch degrees when bit1)
 * 3 - float: float3 (distance when bit2)
 * 4 - int: CAMERA_TRANSITION_TYPE_* (written when bit3)
 *
 * @file ActionOrientCamera.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionOrientCamera extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionOrientCamera;

    //PARAMS
    // 0 - int: nFlags (packed camera flags: bit 0 = facing, bit 1 = pitch, bit 2 = distance, bit 3 = transition)
    // 1 - float: fFacing (facing degrees when bit 0 set)
    // 2 - float: fPitch (pitch degrees when bit 1 set)
    // 3 - float: fDistance (camera distance when bit 2 set)
    // 4 - int: nTransitionType (CAMERA_TRANSITION_TYPE_* when bit 3 set)
  }

  update(delta: number = 0): ActionStatus {
    const flagsRaw = this.getParameter<number>(0);
    const f1 = this.getParameter<number>(1);
    const f2 = this.getParameter<number>(2);
    const f3 = this.getParameter<number>(3);
    const transitionRaw = this.getParameter<number>(4);

    // Legacy KotOR.js packing used floats in slots 0–3 (facing/pitch/distance/height).
    // packing uses INT flags in slot 0. Detect legacy by non-integer / out-of-range flags.
    const looksLikeLegacy =
      typeof flagsRaw === 'number' &&
      (flagsRaw > 15 || flagsRaw < 0 || !Number.isInteger(flagsRaw));

    if(looksLikeLegacy){
      // Legacy: FLOAT facing, pitch, distance, height(ignored), INT transition
      FollowerCamera.changeLocation({
        facingDeg: typeof flagsRaw === 'number' ? flagsRaw : -1,
        pitchDeg: typeof f1 === 'number' ? f1 : -1,
        distance: typeof f2 === 'number' ? f2 : -1,
        transitionType: typeof transitionRaw === 'number' ? transitionRaw : 0,
      });
      return ActionStatus.COMPLETE;
    }

    const flags = (typeof flagsRaw === 'number' ? flagsRaw : 0) | 0;
    const transitionType = typeof transitionRaw === 'number' ? transitionRaw : 0;

    FollowerCamera.changeLocation({
      flags,
      facingDeg: (flags & CAMERA_LOC_FLAG_FACING) ? (typeof f1 === 'number' ? f1 : -1) : -1,
      pitchDeg: (flags & CAMERA_LOC_FLAG_PITCH) ? (typeof f2 === 'number' ? f2 : -1) : -1,
      distance: (flags & CAMERA_LOC_FLAG_DISTANCE) ? (typeof f3 === 'number' ? f3 : -1) : -1,
      transitionType: (flags & CAMERA_LOC_FLAG_TRANSITION) ? transitionType : 0,
    });

    // always returns COMPLETE (2); lerp runs on the client camera
    return ActionStatus.COMPLETE;
  }

}
