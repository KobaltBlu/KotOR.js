import { LIPObject } from "@core/resource/LIPObject";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";

/**
 * Minimal host surface for lip-sync playback against a loaded Odyssey model.
 * Implemented by OdysseyModel3D at runtime.
 */
export interface LipSyncModelHost {
  nodes: Map<string, any>;
  odysseyAnimationMap: Map<string, any>;
  animNodeCache?: Record<string, any>;
  userData?: { gameObject?: { lipObject?: LIPObject | undefined } };
}

/**
 * Applies LIP keyframe shapes to a talking head model over time.
 * Parse/export stays on {@link LIPObject}; playback lives in the engine.
 */
export class LipSyncPlayer {
  static update(lip: LIPObject, delta = 0, model: LipSyncModelHost | null | undefined): void {
    if (!model || !lip) {
      return;
    }

    if (!lip.keyframes.length) {
      if (lip.elapsed >= lip.duration) {
        if (model.userData?.gameObject)
          model.userData.gameObject.lipObject = undefined;
        if (lip.anim) {
          for (let i = 0; i < lip.anim.nodes.length; i++) {
            let modelNode: any = model.animNodeCache?.[lip.anim.nodes[i].name];
            if (typeof modelNode != 'undefined') {
              modelNode.lipping = false;
            }
          }
        }
      } else {
        lip.elapsed += delta;
      }
      lip.lastTime = lip.elapsed;
      return;
    }

    let lastFrame = 0;
    let framesLen = lip.keyframes.length;
    for (let f = 0; f < framesLen; f++) {
      if (lip.keyframes[f].time <= lip.elapsed) {
        lastFrame = f;
      }
    }

    let last = lip.keyframes[lastFrame];
    let next = lip.keyframes[lastFrame + 1];
    if (lastFrame + 1 >= lip.keyframes.length || last.time >= lip.elapsed) {
      next = lip.keyframes[0];
    }

    if (!last) {
      last = {
        uuid: '',
        time: 0,
        shape: 0
      };
    }

    let fl = 0;
    if (last) {
      fl = Math.abs((lip.elapsed - last.time) / (next.time - last.time));
    }

    if (fl == Infinity) fl = 1;
    if (isNaN(fl)) fl = 0;

    if (fl > 1) {
      fl = 1;
    }

    if (lip.anim == null) {
      lip.anim = model.odysseyAnimationMap.get('talk');
    }

    if (lip.anim) {
      for (let i = 0; i < lip.anim.nodes.length; i++) {
        let node = lip.anim.nodes[i];
        let modelNode = model.nodes.get(node.name);

        if (typeof modelNode != 'undefined') {
          lip.anim._position.x = lip.anim._position.y = lip.anim._position.z = 0;
          lip.anim._quaternion.x = lip.anim._quaternion.y = lip.anim._quaternion.z = 0;
          lip.anim._quaternion.w = 1;
          node.controllers.forEach((controller: any) => {
            modelNode.lipping = true;
            let last_frame = controller.data[last.shape];
            let next_frame = controller.data[next.shape];
            if (!last_frame) {
              last_frame = controller.data[0];
            }
            if (!next_frame) {
              next_frame = controller.data[0];
            }

            // Only interpolate when a previous frame exists
            if (last_frame) {
              switch (controller.type) {
                case OdysseyModelControllerType.Position:
                  if (modelNode.controllers.get(OdysseyModelControllerType.Position)) {
                    lip.anim._position.copy(modelNode.controllers.get(OdysseyModelControllerType.Position).data[0] as any);
                  }
                  modelNode.position.copy(last_frame).add(lip.anim._position);
                  modelNode.position.lerp(lip.anim._position.add(next_frame), fl);
                  break;
                case OdysseyModelControllerType.Orientation:
                  modelNode.quaternion.copy(last_frame);
                  modelNode.quaternion.slerp(lip.anim._quaternion.copy(next_frame), fl);
                  break;
              }
              modelNode.updateMatrix();
            }
          });
        }
      }
    }

    if (lip.elapsed >= lip.duration) {
      if (model.userData?.gameObject)
        model.userData.gameObject.lipObject = undefined;

      if (lip.anim) {
        for (let i = 0; i < lip.anim.nodes.length; i++) {
          let modelNode: any = model.animNodeCache?.[lip.anim.nodes[i].name];
          if (typeof modelNode != 'undefined') {
            modelNode.lipping = false;
          }
        }
      }
    } else {
      lip.elapsed += delta;
    }
    lip.lastTime = lip.elapsed;
  }
}
