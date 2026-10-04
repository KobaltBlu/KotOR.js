import type { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@engine/odyssey/OdysseyModelAnimationManager";
import * as THREE from "three";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";

/**
 * OdysseyController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.INVALID;
  supermodelLink: number = -1;
  uuid: string = crypto.randomUUID();

  vec3;
  quaternion;
  frameCount: number;
  data: IOdysseyControllerFrameGeneric[] = [];

  constructor( controller: IOdysseyControllerGeneric ){
    Object.assign(this, controller);
    this.supermodelLink = controller.supermodelLink;
    this.vec3 = new THREE.Vector3(0, 0, 0);
    this.quaternion = new THREE.Quaternion(0, 0, 0, 1);
  }

  /** Interpolate single-float keyframes (`value` only). */
  static lerp1(last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number): number {
    return (next.value - last.value) * fl + last.value;
  }

  /**
   * Sample RGB between two controller frames.
   * Bezier path mirrors PositionController (curve sample + lerp) without a position offset.
   */
  static sampleVec3(
    last: IOdysseyControllerFrameGeneric,
    next: IOdysseyControllerFrameGeneric,
    fl: number,
    out: THREE.Vector3
  ): THREE.Vector3 {
    if(last.isBezier){
      if(last.isLinearBezier){
        out.copy(last.bezier.getPoint(0));
      }else{
        out.copy(last.bezier.getPoint((0.5 * fl) + 0.5));
      }
      const nextPt = OdysseyController._bezierScratch;
      if(next.isBezier){
        nextPt.copy(next.bezier.getPoint(next.lastFrame ? 0 : 0.5));
      }else{
        nextPt.set(next.x, next.y, next.z);
      }
      out.lerp(nextPt, fl);
      return out;
    }
    if(next.isBezier){
      out.set(last.x, last.y, last.z);
      const nextPt = OdysseyController._bezierScratch;
      if(next.isLinearBezier){
        nextPt.copy(next.bezier.getPoint(0));
      }else{
        nextPt.copy(next.bezier.getPoint(0.5 * fl));
      }
      out.lerp(nextPt, fl);
      return out;
    }
    out.set(
      last.x + fl * (next.x - last.x),
      last.y + fl * (next.y - last.y),
      last.z + fl * (next.z - last.z)
    );
    return out;
  }

  private static _bezierScratch = new THREE.Vector3();

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    
  }

  update(){

  }

}
