import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "../../enums/odyssey/OdysseyModelNodeType";
import type { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyController } from "./OdysseyController";
import * as THREE from "three";
import type { OdysseyLight3D } from "../../three/odyssey/OdysseyLight3D";

/**
 * RadiusController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file RadiusController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class RadiusController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Radius;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      if(manager.modelNode.light instanceof THREE.PointLight){
        manager.modelNode.light.distance = data.value || 0.000000001;
      }else if (manager.modelNode.light instanceof THREE.AmbientLight){
        // manager.modelNode.light.distance = data.value || 0.000000001;
      }else if (manager.modelNode.light?.type == 'OdysseyLight'){
        (manager.modelNode.light as OdysseyLight3D).radius = data.value || 0.000000001;
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      if(manager.modelNode.light instanceof THREE.PointLight){
        manager.modelNode.light.distance = ((next.value - last.value) * fl + last.value) || 0.000000001;
      }else if (manager.modelNode.light instanceof THREE.AmbientLight){
        // manager.modelNode.light.distance = ((next.value - last.value) * fl + last.value) || 0.000000001;
      }else if (manager.modelNode.light?.type == 'OdysseyLight'){
        (manager.modelNode.light as OdysseyLight3D).radius = ((next.value - last.value) * fl + last.value) || 0.000000001;
      }
    }
  }

}
