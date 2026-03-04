import * as THREE from "three";

import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";

import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyController } from "@/odyssey/controllers/OdysseyController";

/**
 * ColorMidController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ColorMidController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ColorMidController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.ColorMid;

  /* eslint-disable-next-line @typescript-eslint/no-useless-constructor -- pass controller to parent */
  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, _anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      const emitter = manager.modelNode.emitter;
      emitter.colorMid.setRGB( data.x, data.y, data.z );
      (emitter.material.uniforms.colorMid.value as THREE.Color).copy(emitter.colorMid);
      emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager: OdysseyModelAnimationManager, _anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      const emitter = manager.modelNode.emitter;
      emitter.colorMid.setRGB(
        last.x + fl * (next.x - last.x),
        last.y + fl * (next.y - last.y),
        last.z + fl * (next.z - last.z)
      );
      (emitter.material.uniforms.colorMid.value as THREE.Color).copy(emitter.colorMid);
      emitter.material.uniformsNeedUpdate = true;
    }
  }

}
