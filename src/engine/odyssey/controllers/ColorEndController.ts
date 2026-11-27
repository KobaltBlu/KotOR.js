import { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from "@engine/odyssey";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import * as THREE from "three";

/**
 * ColorEndController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ColorEndController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ColorEndController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.ColorEnd;

  private static _rgb = new THREE.Vector3();

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.colorEnd.setRGB( data.x, data.y, data.z );
      manager.modelNode.emitter.material.uniforms.colorEnd.value.copy(manager.modelNode.emitter.colorEnd);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      const rgb = OdysseyController.sampleVec3(last, next, fl, ColorEndController._rgb);
      manager.modelNode.emitter.colorEnd.setRGB(rgb.x, rgb.y, rgb.z);
      manager.modelNode.emitter.material.uniforms.colorEnd.value.copy(manager.modelNode.emitter.colorEnd);
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

}
