import * as THREE from 'three';
import { GameObjectConstant } from '@core/enums/module/GameObjectConstant';

/** party-follow info fields (FollowInfo GFF struct). */
export interface CreaturePartyFollowInfo {
  followObject: number;
  followLocation: THREE.Vector3;
  lastLeaderPos: THREE.Vector3;
  lastFollowerPos: THREE.Vector3;
  maxSpeed: number;
  stickToPos: number;
  result: number;
  timeElapsed: number;
  inSafetyRange: number;
}

export function createDefaultPartyFollowInfo(): CreaturePartyFollowInfo {
  return {
    followObject: GameObjectConstant.OBJECT_INVALID,
    followLocation: new THREE.Vector3(0, 0, 0),
    lastLeaderPos: new THREE.Vector3(0, 0, 0),
    lastFollowerPos: new THREE.Vector3(0, 0, 0),
    maxSpeed: 0,
    stickToPos: 0,
    result: 2,
    timeElapsed: 0,
    // party-member defaults 0 after place/reset; only saved
    // FollowInfo.InSafetyRange=1 should hold chase until leader ≥7.
    inSafetyRange: 0,
  };
}
