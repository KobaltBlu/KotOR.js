import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import type { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyController } from "./OdysseyController";

/**
 * ScaleController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ScaleController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ScaleController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Scale;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode && manager.model){
      let offsetScale = 0;
      if(typeof manager.modelNode.controllers.get(OdysseyModelControllerType.Scale) != 'undefined'){
        offsetScale = manager.modelNode.controllers.get(OdysseyModelControllerType.Scale).data[0].value || 0.000000000001; //0 scale causes warnings
      }
      //manager.modelNode.scale.setScalar( ( (data.value + offsetScale) * manager.model.Scale ) || 0.00000001 );
      manager.modelNode.scale.setScalar( ( (data.value) * manager.model.Scale ) || 0.00000001 );
      manager.modelNode.updateMatrix();
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager && manager.modelNode){
      manager.modelNode.scale.lerp( manager._vec3.setScalar( ( (next.value) * manager.model.Scale) || 0.000000001 ), fl);
      manager.modelNode.updateMatrix();
    }
  }

}
