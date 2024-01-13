import * as THREE from "three";
import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";
import type { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyController } from "./OdysseyController";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";

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

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.userData.mesh){
      if(manager.modelNode.userData.mesh.material instanceof THREE.Material){
        if(manager.modelNode.userData.mesh.material instanceof THREE.ShaderMaterial){
          manager.modelNode.userData.mesh.material.uniforms.opacity.value = data.value;
          manager.modelNode.userData.mesh.material.opacity = data.value;
          manager.modelNode.userData.mesh.material.uniformsNeedUpdate = true;
        }else if(manager.modelNode.userData.mesh.material instanceof THREE.Material){
          manager.modelNode.userData.mesh.material.opacity = data.value;
        }
        manager.modelNode.userData.mesh.material.transparent = true;
        manager.modelNode.userData.mesh.material.needsUpdate = true;
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.userData.mesh){
      if(manager.modelNode.userData.mesh.material instanceof THREE.ShaderMaterial){
        manager.modelNode.userData.mesh.material.uniforms.opacity.value = ((next.value - last.value) * fl + last.value);;
        manager.modelNode.userData.mesh.material.uniformsNeedUpdate = true;
      }
      manager.modelNode.userData.mesh.material.opacity = ((next.value - last.value) * fl + last.value);
      manager.modelNode.userData.mesh.material.transparent = true;//manager.modelNode.mesh.material.opacity < 1.0;
      //manager.modelNode.userData.mesh.material.depthFunc = 4;
      manager.modelNode.userData.mesh.material.needsUpdate = true;
    }
  }

}
