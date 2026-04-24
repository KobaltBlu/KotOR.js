import { OdysseyController } from '@/odyssey/controllers/OdysseyController';
import type { OdysseyModelAnimation, OdysseyModelAnimationManager } from '@/odyssey';
import { OdysseyModelControllerType } from '@/enums/odyssey/OdysseyModelControllerType';
import { IOdysseyControllerFrameGeneric } from '@/interface/odyssey/controller/IOdysseyControllerFrameGeneric';
import { IOdysseyControllerGeneric } from '@/interface/odyssey/controller/IOdysseyControllerGeneric';

/**
 * ParticleRotationController class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ParticleRotationController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ParticleRotationController extends OdysseyController {
  type: OdysseyModelControllerType = OdysseyModelControllerType.ParticleRot;

  constructor(controller: IOdysseyControllerGeneric) {
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric) {
    if (manager.modelNode.emitter) {
      const em = manager.modelNode.emitter;
      em.angle = data.value ?? 0;
      em.material.uniforms.rotate.value = em.angle;
      em.material.uniformsNeedUpdate = true;
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
      const v = OdysseyController.lerp1(last, next, fl);
      em.angle = v;
      em.material.uniforms.rotate.value = v;
      em.material.uniformsNeedUpdate = true;
    }
  }
}
