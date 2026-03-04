import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from "@/odyssey";
import { OdysseyController } from "@/odyssey/controllers/OdysseyController";

/**
 * LightningZigZagController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LightningZigZagController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LightningZigZagController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.LightningZigZag;

  constructor( controller: IOdysseyControllerGeneric ){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    
  }

}

