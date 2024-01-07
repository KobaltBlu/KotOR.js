import { ModuleObject } from "./module";

/**
 * CreaturePartyFollowInfo class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CreaturePartyFollowInfo.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CreaturePartyFollowInfo {
  object: ModuleObject;
  followObject: ModuleObject;
  followLocation: THREE.Vector3;
  lastLeaderPos: THREE.Vector3;
  lastFollowerPos: THREE.Vector3;
  maxSpeed: number = 0;
  stickToPos: boolean = false;
  result: number = 0;
  timeElapsed: number = 0;
  inSafetyRange: boolean = false;
  
  constructor(object: ModuleObject){
    this.object = object;
  }

}