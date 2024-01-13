import type { OdysseyModelAnimation } from "../OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "../OdysseyModelAnimationManager";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "../../interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "../../interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyController } from "./OdysseyController";
import * as THREE from "three";

/**
 * SelfIllumColorController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SelfIllumColorController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SelfIllumColorController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.SelfIllumColor;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
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

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
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
