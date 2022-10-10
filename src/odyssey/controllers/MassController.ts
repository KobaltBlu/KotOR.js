import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyController } from "./OdysseyController";

export class MassController extends OdysseyController {
  
  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.mass = data.value;
      manager.modelNode.emitter.attributeChanged('mass');
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      manager.modelNode.emitter.mass = next.value;//Math.ceil(last.value + fl * (next.value - last.value));
      manager.modelNode.emitter.attributeChanged('mass');
    }
  }

}
