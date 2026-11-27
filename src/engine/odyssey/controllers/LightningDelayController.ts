import { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from "@engine/odyssey";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";

/**
 * LightningDelayController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LightningDelayController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LightningDelayController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.LightningDelay;

  constructor( controller: IOdysseyControllerGeneric ){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.lightningDelay = data.value;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.lightningDelay = OdysseyController.lerp1(last, next, fl);
    }
  }

}

