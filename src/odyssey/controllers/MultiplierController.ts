import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@/odyssey/OdysseyModelAnimationManager";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";
import type { OdysseyLight3D } from "@/three/odyssey/OdysseyLight3D";

/**
 * MultiplierController — updates OdysseyLight3D.multiplier (light node intensity).
 * Authored zero is preserved (lights can fully extinguish).
 */
export class MultiplierController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Multiplier;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      if (manager.modelNode.light?.type == 'OdysseyLight'){
        (manager.modelNode.light as OdysseyLight3D).multiplier = data.value ?? 0;
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      if (manager.modelNode.light?.type == 'OdysseyLight'){
        (manager.modelNode.light as OdysseyLight3D).multiplier = ((next.value - last.value) * fl + last.value);
      }
    }
  }

}
