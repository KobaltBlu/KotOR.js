import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@/odyssey/OdysseyModelAnimationManager";

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

  /* eslint-disable-next-line @typescript-eslint/no-useless-constructor -- pass controller to parent */
  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(_manager: OdysseyModelAnimationManager, _anim: OdysseyModelAnimation, _data: IOdysseyControllerFrameGeneric){
    
  }

  animate(_manager: OdysseyModelAnimationManager, _anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, _fl: number = 0){
    
  }

}
