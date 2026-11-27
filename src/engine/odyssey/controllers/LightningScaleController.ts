import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from "@engine/odyssey";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";

/**
 * LightningScaleController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LightningScaleController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LightningScaleController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.LightningScale;

  constructor( controller: IOdysseyControllerGeneric ){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.lightningScale = data.value;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.lightningScale = OdysseyController.lerp1(last, next, fl);
    }
  }

}

