import { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from "@engine/odyssey";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";

/**
 * LifeExpController class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LifeExpController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LifeExpController extends OdysseyController {

  type: OdysseyModelControllerType = OdysseyModelControllerType.LifeExp;

  constructor( controller: IOdysseyControllerGeneric){
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric){
    if(manager.modelNode.emitter){
      const em = manager.modelNode.emitter;
      // Keep fractional lifeExp (e.g. 0.05); Math.ceil was stretching short fountain particles to 1s.
      em.lifeExp = data.value >= 0 ? data.value : -1;
      if(em.material?.uniforms?.maxAge){
        em.material.uniforms.maxAge.value = em.lifeExp >= 0 ? em.lifeExp : -1;
        em.material.uniformsNeedUpdate = true;
      }
    }
  }

  animate(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, last: IOdysseyControllerFrameGeneric, next: IOdysseyControllerFrameGeneric, fl: number = 0){
    if(manager.modelNode.emitter){
      const em = manager.modelNode.emitter;
      const v = OdysseyController.lerp1(last, next, fl);
      em.lifeExp = v >= 0 ? v : -1;
      if(em.material?.uniforms?.maxAge){
        em.material.uniforms.maxAge.value = em.lifeExp >= 0 ? em.lifeExp : -1;
        em.material.uniformsNeedUpdate = true;
      }
    }
  }

}
