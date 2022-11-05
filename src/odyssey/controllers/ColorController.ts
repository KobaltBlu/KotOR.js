import { OdysseyController } from ".";
import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";

export class ColorController extends OdysseyController {

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
    // if ((manager.modelNode.odysseyModelNode.NodeType & NODETYPE.Light) == NODETYPE.Light) {
    //   manager.modelNode.odysseyModelNode.light.color.setRGB( data.x, data.y, data.z );
    // }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    // if ((manager.modelNode.odysseyModelNode.NodeType & NODETYPE.Light) == NODETYPE.Light) {
    //   manager.modelNode.odysseyModelNode.light.color.r = ((next.x - last.x) * fl + last.x);
    //   manager.modelNode.odysseyModelNode.light.color.g = ((next.y - last.y) * fl + last.y);
    //   manager.modelNode.odysseyModelNode.light.color.b = ((next.z - last.z) * fl + last.z);
    // }
  }

}
