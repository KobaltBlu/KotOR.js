import { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@engine/odyssey/OdysseyModelAnimationManager";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";

/**
 * SizeStartYController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SizeStartYController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SizeStartYController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.SizeStart_Y;

  constructor( controller: IOdysseyControllerGeneric ){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.sizesY[0] = data.value;
      manager.modelNode.emitter.material.uniforms.scaleY.value.x = data.value;
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      const v = ((next.value - last.value) * fl + last.value);
      manager.modelNode.emitter.sizesY[0] = v;
      manager.modelNode.emitter.material.uniforms.scaleY.value.x = v;
      manager.modelNode.emitter.material.uniformsNeedUpdate = true;
    }
  }

}
