import { OdysseyModelAnimation, OdysseyModelAnimationManager } from "..";
import { OdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/OdysseyControllerFrameGeneric";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyController } from "./OdysseyController";
import * as THREE from "three";

export class SelfIllumColorController extends OdysseyController {

  constructor( controller: OdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, data: OdysseyControllerFrameGeneric){
    if(manager.modelNode.userData.mesh){
      if(manager.modelNode.userData.mesh.material instanceof THREE.ShaderMaterial){
        manager.modelNode.userData.mesh.material.uniforms.selfIllumColor.value.setRGB(
          data.x, data.y, data.z
        );
        manager.modelNode.userData.mesh.material.defines.SELFILLUMCOLOR = "";
      }else{
        manager.modelNode.userData.mesh.material.emissive.setRGB(
          data.x, data.y, data.z
        );
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, controller: OdysseyController, last: OdysseyControllerFrameGeneric, next: OdysseyControllerFrameGeneric, fl: number = 0){
    let lerpIllumColorR = last.x + fl * (next.x - last.x);
      let lerpIllumColorG = last.y + fl * (next.y - last.y);
      let lerpIllumColorB = last.z + fl * (next.z - last.z);
      //console.log(manager.modelNode.mesh.odysseyModelNode.Diffuse.r, lerpIllumColor);
      if(manager.modelNode.userData.mesh){

        if(manager.modelNode.userData.mesh.material instanceof THREE.ShaderMaterial){
          manager.modelNode.userData.mesh.material.uniforms.selfIllumColor.value.setRGB(
            lerpIllumColorR, 
            lerpIllumColorG, 
            lerpIllumColorB
          );
          manager.modelNode.userData.mesh.material.defines.SELFILLUMCOLOR = "";
        }else{
          manager.modelNode.userData.mesh.material.emissive.setRGB(
            lerpIllumColorR, 
            lerpIllumColorG, 
            lerpIllumColorB
          );
        }
        //manager.modelNode.mesh.material.needsUpdate = true;
      }
  }

}
