import { OdysseyController } from ".";
import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";

export class ColorController extends OdysseyController {

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
    // if ((manager.modelNode.odysseyNode.NodeType & NODETYPE.Light) == NODETYPE.Light) {
    //   manager.modelNode.odysseyNode.light.color.setRGB( data.x, data.y, data.z );
    // }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    // if ((manager.modelNode.odysseyNode.NodeType & NODETYPE.Light) == NODETYPE.Light) {
    //   manager.modelNode.odysseyNode.light.color.r = ((next.x - last.x) * fl + last.x);
    //   manager.modelNode.odysseyNode.light.color.g = ((next.y - last.y) * fl + last.y);
    //   manager.modelNode.odysseyNode.light.color.b = ((next.z - last.z) * fl + last.z);
    // }
  }

}
