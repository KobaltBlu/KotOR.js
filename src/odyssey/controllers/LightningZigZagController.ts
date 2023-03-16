import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyController } from ".";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";

export class LightningZigZagController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.LightningZigZag;

  constructor( controller: OdysseyControllerGeneric ){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: OdysseyControllerFrameGeneric){
    
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    
  }

}

