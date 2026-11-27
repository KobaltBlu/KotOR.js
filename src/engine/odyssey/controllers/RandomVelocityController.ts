import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import type { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@engine/odyssey/OdysseyModelAnimationManager";
import { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";

/**
 * RandomVelocityController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file RandomVelocityController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class RandomVelocityController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.RandomVelocity;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.randVelocity = data.value;
      manager.modelNode.emitter.attributeChanged('velocity');
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.randVelocity = OdysseyController.lerp1(last, next, fl);
      manager.modelNode.emitter.attributeChanged('velocity');
    }
  }

}
