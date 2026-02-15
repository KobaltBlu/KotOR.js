import * as THREE from "three";

import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@/odyssey/OdysseyModelAnimationManager";

/**
 * AlphaController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AlphaController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AlphaController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Alpha;

  /* eslint-disable-next-line @typescript-eslint/no-useless-constructor -- pass controller to parent */
  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, _anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    const mesh = manager.modelNode.userData.mesh as THREE.Mesh | undefined;
    if(mesh?.material){
      const mat = mesh.material as THREE.Material;
      if(mat instanceof THREE.ShaderMaterial){
        mat.uniforms.opacity.value = data.value;
        mat.opacity = data.value;
        mat.uniformsNeedUpdate = true;
      } else {
        mat.opacity = data.value;
      }
      mat.transparent = true;
      mat.needsUpdate = true;
    }
  }

  animate(manager: OdysseyModelAnimationManager, _anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    const mesh = manager.modelNode.userData.mesh as THREE.Mesh | undefined;
    if(mesh?.material){
      const mat = mesh.material as THREE.Material;
      const opacity = (Number(next.value) - Number(last.value)) * fl + Number(last.value);
      if(mat instanceof THREE.ShaderMaterial){
        mat.uniforms.opacity.value = opacity;
        mat.uniformsNeedUpdate = true;
      }
      mat.opacity = opacity;
      mat.transparent = true;
      mat.needsUpdate = true;
    }
  }

}
