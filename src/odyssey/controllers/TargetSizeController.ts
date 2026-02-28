import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@/odyssey/OdysseyModelAnimationManager";

/**
 * TargetSizeController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TargetSizeController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TargetSizeController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.TargetSize;

  /* eslint-disable-next-line @typescript-eslint/no-useless-constructor -- pass controller to parent */
  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.targetSize = data.value;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, _fl: number = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.targetSize = next.value;
    }
  }

}