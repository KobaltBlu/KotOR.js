import { OdysseyController } from '@/odyssey/controllers/OdysseyController';
import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from '@/odyssey';
import { OdysseyModelControllerType } from '@/enums/odyssey/OdysseyModelControllerType';
import { IOdysseyControllerFrameGeneric } from '@/interface/odyssey/controller/IOdysseyControllerFrameGeneric';
import { IOdysseyControllerGeneric } from '@/interface/odyssey/controller/IOdysseyControllerGeneric';

/**
 * FPSController class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file FPSController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class FPSController extends OdysseyController {
  type: OdysseyModelControllerType = OdysseyModelControllerType.FPS;

  constructor(controller: IOdysseyControllerGeneric) {
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric) {
    if (manager.modelNode.emitter) {
      const em = manager.modelNode.emitter;
      const fps = data.value;
      em.fps = fps;
      em.material.uniforms.fps.value = fps;
      if (fps > 0) {
        em.material.defines.FPS = '';
      } else {
        delete em.material.defines.FPS;
      }
      em.material.needsUpdate = true;
    }
  }

  animate(
    manager: OdysseyModelAnimationManager,
    anim: OdysseyModelAnimation,
    last: IOdysseyControllerFrameGeneric,
    next: IOdysseyControllerFrameGeneric,
    fl: number = 0
  ) {
    if (manager.modelNode.emitter) {
      const em = manager.modelNode.emitter;
      const fps = OdysseyController.lerp1(last, next, fl);
      em.fps = fps;
      em.material.uniforms.fps.value = fps;
      if (fps > 0) {
        em.material.defines.FPS = '';
      } else {
        delete em.material.defines.FPS;
      }
      em.material.needsUpdate = true;
    }
  }
}
