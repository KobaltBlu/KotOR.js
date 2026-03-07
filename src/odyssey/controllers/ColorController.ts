import { OdysseyController } from "./OdysseyController";
import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyModelNodeType } from "../../enums/odyssey/OdysseyModelNodeType";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";

/**
 * ColorController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ColorController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ColorController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Color;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      manager.modelNode.light.color.setRGB( data.x, data.y, data.z );
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if ((manager.modelNode.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      manager.modelNode.light.color.r = ((next.x - last.x) * fl + last.x);
      manager.modelNode.light.color.g = ((next.y - last.y) * fl + last.y);
      manager.modelNode.light.color.b = ((next.z - last.z) * fl + last.z);
    }
  }

}
