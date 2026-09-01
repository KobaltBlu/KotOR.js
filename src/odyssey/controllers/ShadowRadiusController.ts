import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@/odyssey/OdysseyModelAnimationManager";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";
import type { OdysseyLight3D } from "@/three/odyssey/OdysseyLight3D";

/**
 * ShadowRadiusController class.
 *
 * Animates PartLight shadow radius used by
 * DoGobShadowsForThisLight / ProjectDynamicShadow.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ShadowRadiusController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShadowRadiusController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.ShadowRadius;

  constructor( controller: IOdysseyControllerGeneric ){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      const light = manager.modelNode.light as OdysseyLight3D;
      if(light?.type === 'OdysseyLight'){
        light.shadowRadius = data.value || 0;
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      const light = manager.modelNode.light as OdysseyLight3D;
      if(light?.type === 'OdysseyLight'){
        light.shadowRadius = ((next.value - last.value) * fl + last.value) || 0;
      }
    }
  }

}
