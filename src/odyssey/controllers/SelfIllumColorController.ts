import * as THREE from "three";

import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@/interface/odyssey/controller/IOdysseyControllerGeneric";
import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationManager } from "@/odyssey/OdysseyModelAnimationManager";

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

  /** SelfIllumColor = 100; literal avoids error-typed enum assignment in strict lint. */
  override type: OdysseyModelControllerType = 100;

  /* eslint-disable-next-line @typescript-eslint/no-useless-constructor -- pass controller to parent */
  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, _anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    const frame = data as { x?: number; y?: number; z?: number };
    const x = frame.x ?? 0;
    const y = frame.y ?? 0;
    const z = frame.z ?? 0;
    const mesh = manager.modelNode.userData.mesh as THREE.Mesh | undefined;
    if(mesh?.material){
      const mat = mesh.material as THREE.Material;
      if(mat instanceof THREE.ShaderMaterial){
        const colorUniform = mat.uniforms.selfIllumColor?.value as THREE.Color | undefined;
        if(colorUniform instanceof THREE.Color){
          colorUniform.setRGB(x, y, z);
        }
        (mat.defines as Record<string, string>).SELFILLUMCOLOR = "";
      } else {
        mat.emissive.setRGB(x, y, z);
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, _anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    const lerpIllumColorR = last.x + fl * (next.x - last.x);
    const lerpIllumColorG = last.y + fl * (next.y - last.y);
    const lerpIllumColorB = last.z + fl * (next.z - last.z);
    const mesh = manager.modelNode.userData.mesh as THREE.Mesh | undefined;
    if(mesh?.material){
      const mat = mesh.material as THREE.Material;
      if(mat instanceof THREE.ShaderMaterial){
        const colorUniform = mat.uniforms.selfIllumColor?.value as THREE.Color | undefined;
        if(colorUniform instanceof THREE.Color){
          colorUniform.setRGB(lerpIllumColorR, lerpIllumColorG, lerpIllumColorB);
        }
        (mat.defines as Record<string, string>).SELFILLUMCOLOR = "";
      } else {
        mat.emissive.setRGB(lerpIllumColorR, lerpIllumColorG, lerpIllumColorB);
      }
    }
  }

}
