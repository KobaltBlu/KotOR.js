import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyController } from "./OdysseyController";

export class P2PBezier2Controller extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.P2P_Bezier2;

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: OdysseyControllerFrameGeneric){
    
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    
  }

}

