import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import type { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@engine/odyssey/OdysseyModelAnimationManager";
import { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import type { OdysseyLight3D } from "@engine/render/three/odyssey/OdysseyLight3D";

/**
 * RadiusController — updates OdysseyLight3D.radius.
 * Authored zero is preserved.
 */
export class RadiusController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Radius;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      if (manager.modelNode.light?.type == 'OdysseyLight'){
        (manager.modelNode.light as OdysseyLight3D).radius = data.value ?? 0;
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      if (manager.modelNode.light?.type == 'OdysseyLight'){
        (manager.modelNode.light as OdysseyLight3D).radius = ((next.value - last.value) * fl + last.value);
      }
    }
  }

}
