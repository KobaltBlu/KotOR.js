import THREE from "three";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyController } from "./OdysseyController";

export class AlphaController extends OdysseyController {

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
    if(manager.modelNode.mesh){
      if(manager.modelNode.mesh.material instanceof THREE.Material){
        if(manager.modelNode.mesh.material instanceof THREE.ShaderMaterial){
          manager.modelNode.mesh.material.uniforms.opacity.value = data.value;
          manager.modelNode.mesh.material.opacity = data.value;
          manager.modelNode.mesh.material.uniformsNeedUpdate = true;
        }else if(manager.modelNode.mesh.material instanceof THREE.Material){
          manager.modelNode.mesh.material.opacity = data.value;
        }
        manager.modelNode.mesh.material.transparent = true;
        manager.modelNode.mesh.material.needsUpdate = true;
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.mesh){
      if(manager.modelNode.mesh.material instanceof THREE.ShaderMaterial){
        manager.modelNode.mesh.material.uniforms.opacity.value = ((next.value - last.value) * fl + last.value);;
        manager.modelNode.mesh.material.uniformsNeedUpdate = true;
      }
      manager.modelNode.mesh.material.opacity = ((next.value - last.value) * fl + last.value);
      manager.modelNode.mesh.material.transparent = true;//manager.modelNode.mesh.material.opacity < 1.0;
      //manager.modelNode.mesh.material.depthFunc = 4;
      manager.modelNode.mesh.material.needsUpdate = true;
    }
  }

}
