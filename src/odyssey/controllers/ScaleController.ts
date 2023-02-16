import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyModelControllerType } from "../../interface/odyssey/OdysseyModelControllerType";
import { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyController } from "./OdysseyController";

export class ScaleController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Scale;

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
    if(manager.modelNode && manager.model){
      let offsetScale = 0;
      if(typeof manager.modelNode.controllers.get(OdysseyModelControllerType.Scale) != 'undefined'){
        offsetScale = manager.modelNode.controllers.get(OdysseyModelControllerType.Scale).data[0].value || 0.000000000001; //0 scale causes warnings
      }
      //manager.modelNode.scale.setScalar( ( (data.value + offsetScale) * manager.model.Scale ) || 0.00000001 );
      manager.modelNode.scale.setScalar( ( (data.value) * manager.model.Scale ) || 0.00000001 );
      manager.modelNode.updateMatrix();
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    if(manager && manager.modelNode){
      manager.modelNode.scale.lerp( manager._vec3.setScalar( ( (next.value) * manager.model.Scale) || 0.000000001 ), fl);
      manager.modelNode.updateMatrix();
    }
  }

}
