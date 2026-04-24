import { OdysseyController } from '@/odyssey/controllers/OdysseyController';
import type { OdysseyModelAnimation } from '@/odyssey/OdysseyModelAnimation';
import type { OdysseyModelAnimationManager } from '@/odyssey/OdysseyModelAnimationManager';
import { OdysseyModelControllerType } from '@/enums/odyssey/OdysseyModelControllerType';
import { IOdysseyControllerFrameGeneric } from '@/interface/odyssey/controller/IOdysseyControllerFrameGeneric';
import { IOdysseyControllerGeneric } from '@/interface/odyssey/controller/IOdysseyControllerGeneric';

/**
 * YSizeController class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file YSizeController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class YSizeController extends OdysseyController {
  type: OdysseyModelControllerType = OdysseyModelControllerType.YSize;

  /* eslint-disable-next-line @typescript-eslint/no-useless-constructor -- pass controller to parent */
  constructor(controller: IOdysseyControllerGeneric) {
    super(controller);
  }

  setFrame(manager: OdysseyModelAnimationManager, anim: OdysseyModelAnimation, data: IOdysseyControllerFrameGeneric) {
    if (manager.modelNode.emitter) {
      manager.modelNode.emitter.size.y = data.value * 0.01;
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
      const v = OdysseyController.lerp1(last, next, fl);
      manager.modelNode.emitter.size.y = v * 0.01;
    }
  }
}
