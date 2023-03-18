import { OdysseyController } from ".";
import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";

export class ControlPTCountController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.ControlPTCount;

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: OdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.controlPTCount = data.value;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.controlPTCount = next.value;
    }
  }

}