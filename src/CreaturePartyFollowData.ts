import { ModuleObject } from "./module";

export class CreaturePartyFollowInfo {
  followObject: ModuleObject;
  followLocation: THREE.Vector3;
  lastLeaderPos: THREE.Vector3;
  lastFollowerPos: THREE.Vector3;
  maxSpeed: number = 0;
  stickToPos: boolean = false;
  result: number = 0;
  timeElapsed: number = 0;
  inSafetyRange: boolean = false;
}