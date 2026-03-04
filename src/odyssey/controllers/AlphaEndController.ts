import * as THREE from "three";

import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";

import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyController } from "@/odyssey/controllers/OdysseyController";

/**
 * AlphaEndController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AlphaEndController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AlphaEndController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.AlphaEnd;

  /* eslint-disable-next-line @typescript-eslint/no-useless-constructor -- pass controller to parent */
  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, _anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      const emitter = manager.modelNode.emitter;
      emitter.opacity[2] = data.value;
      (emitter.material.uniforms.opacity.value as THREE.Vector3).fromArray(emitter.opacity);
      emitter.material.uniformsNeedUpdate = true;
    }
  }

  animate(manager: OdysseyModelAnimationManager, _anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      const emitter = manager.modelNode.emitter;
      emitter.opacity[2] = ((next.value - last.value) * fl + last.value);
      (emitter.material.uniforms.opacity.value as THREE.Vector3).fromArray(emitter.opacity);
      emitter.material.uniformsNeedUpdate = true;
    }
  }

}
