import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyModelNodeType } from "../../interface/odyssey/OdysseyModelNodeType";
import { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyController } from "./OdysseyController";

export class RadiusController extends OdysseyController {

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
    if ((manager.modelNode.odysseyModelNode.NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      manager.modelNode.odysseyModelNode.radius = data.value || 0.000000001;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    if ((manager.modelNode.odysseyModelNode.NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      manager.modelNode.odysseyModelNode.radius = ((next.value - last.value) * fl + last.value) || 0.000000001;
    }
  }

}
