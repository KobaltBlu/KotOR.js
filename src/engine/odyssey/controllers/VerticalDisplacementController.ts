import { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@engine/odyssey/OdysseyModelAnimationManager";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import type { OdysseyLight3D } from "@engine/render/three/odyssey/OdysseyLight3D";

/**
 * VerticalDisplacementController class.
 *
 * Animates light node vertical displacement added to
 * light Z for shadow projection (ProjectDynamicShadow).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file VerticalDisplacementController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class VerticalDisplacementController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.VerticalDisplacement;

  constructor( controller: IOdysseyControllerGeneric ){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      const light = manager.modelNode.light as OdysseyLight3D;
      if(light?.type === 'OdysseyLight'){
        light.verticalDisplacement = data.value || 0;
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      const light = manager.modelNode.light as OdysseyLight3D;
      if(light?.type === 'OdysseyLight'){
        light.verticalDisplacement = ((next.value - last.value) * fl + last.value) || 0;
      }
    }
  }

}
