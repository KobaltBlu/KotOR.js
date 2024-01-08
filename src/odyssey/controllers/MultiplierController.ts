import { OdysseyModelAnimation, OdysseyModelAnimationManager, OdysseyModelNodeLight } from "..";
import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "../../enums/odyssey/OdysseyModelNodeType";
import { OdysseyController } from "./OdysseyController";
import { OdysseyLight3D } from "../../three/odyssey";
import * as THREE from "three";

/**
 * MultiplierController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MultiplierController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MultiplierController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Multiplier;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      if(manager.modelNode.light instanceof THREE.PointLight){
        manager.modelNode.light.intensity = data.value || 0.000000001;
      }else if (manager.modelNode.light instanceof THREE.AmbientLight){
        // manager.modelNode.light.intensity = data.value || 0.000000001;
      }else if (manager.modelNode.light instanceof OdysseyLight3D){
        manager.modelNode.light.multiplier = data.value || 0.000000001;
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      if(manager.modelNode.light instanceof THREE.PointLight){
        manager.modelNode.light.intensity = ((next.value - last.value) * fl + last.value) || 0.000000001;
      }else if (manager.modelNode.light instanceof THREE.AmbientLight){
        // manager.modelNode.light.intensity = ((next.value - last.value) * fl + last.value) || 0.000000001;
      }else if (manager.modelNode.light instanceof OdysseyLight3D){
        manager.modelNode.light.multiplier = ((next.value - last.value) * fl + last.value) || 0.000000001;
      }
    }
  }

}
