import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from "@/odyssey";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import * as THREE from "three";

/**
 * ColorStartController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ColorStartController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ColorStartController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.ColorStart;

  private static _rgb = new THREE.Vector3();

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.colorStart.setRGB( data.x, data.y, data.z );
      manager.modelNode.emitter.material.uniforms.colorStart.value.copy(manager.modelNode.emitter.colorStart);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      const rgb = OdysseyController.sampleVec3(last, next, fl, ColorStartController._rgb);
      manager.modelNode.emitter.colorStart.setRGB(rgb.x, rgb.y, rgb.z);
      manager.modelNode.emitter.material.uniforms.colorStart.value.copy(manager.modelNode.emitter.colorStart);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

}
