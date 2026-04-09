import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@/odyssey/OdysseyModelAnimationManager";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";

/**
 * SizeEndYController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SizeEndYController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SizeEndYController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.SizeEnd_Y;

  constructor( controller: IOdysseyControllerGeneric ){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.sizesY[2] = data.value;
      manager.modelNode.emitter.material.uniforms.scaleY.value.z = data.value;
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      const v = ((next.value - last.value) * fl + last.value);
      manager.modelNode.emitter.sizesY[2] = v;
      manager.modelNode.emitter.material.uniforms.scaleY.value.z = v;
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

}
