import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyController } from ".";
import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";

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

