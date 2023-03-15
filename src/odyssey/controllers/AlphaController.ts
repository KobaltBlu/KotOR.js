import * as THREE from "three";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyController } from "./OdysseyController";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";

export class AlphaController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.Alpha;

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: OdysseyControllerFrameGeneric){
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

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
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
