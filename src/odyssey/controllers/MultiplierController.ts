import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyModelNodeType } from "../../interface/odyssey/OdysseyModelNodeType";
import { OdysseyController } from "./OdysseyController";

export class MultiplierController extends OdysseyController {

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
    if ((manager.modelNode._node.NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      manager.modelNode._node.multiplier = data.value;
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    if ((manager.modelNode._node.NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      manager.modelNode._node.multiplier = ((next.value - last.value) * fl + last.value);
    }
  }

}
