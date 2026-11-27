import type { OdysseyModelAnimation } from "@engine/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationNode } from "@engine/odyssey/OdysseyModelAnimationNode";
import type { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import type { OdysseyObject3D, OdysseyModel3D } from "@engine/render/three/odyssey";
import type { AnimRun } from "@engine/odyssey/AnimRun";
import {
  BoundControllerKind,
  classifyControllerKind,
  isStatefulTransformController,
  isTransformKind,
} from "@engine/odyssey/BoundControllerKind";

export interface BoundController {
  controller: OdysseyController;
  /** Index into AnimRun.frameCursorArray. */
  cursorIndex: number;
  /** True when data.length === frameCount (validated at bind). */
  valid: boolean;
  kind: BoundControllerKind;
  /** frameCount === 1. */
  constant: boolean;
  /** Scale / Orientation impurities — keep wasOffscreen / live sample path. */
  statefulSample: boolean;
  /** Cached constant Position (x,y,z) when constant + TransformPos. */
  constPos?: Float32Array;
  /** Cached constant Orientation (x,y,z,w) when constant + TransformOri. */
  constOri?: Float32Array;
  /** Cached constant Scale scalar when constant + TransformScale. */
  constScale?: number;
}

export interface BoundAnimationNode {
  target: OdysseyObject3D | undefined;
  controllers: BoundController[];
  /** Dense index within BoundAnimation.nodes (pose buffer indexing). */
  nodeIndex: number;
}

export interface BoundAnimation {
  animation: OdysseyModelAnimation;
  nodes: BoundAnimationNode[];
  controllerCount: number;
}

export {
  BoundControllerKind,
  classifyControllerKind,
  isStatefulTransformController,
  isTransformKind,
};

/**
 * Resolve anim nodes → model targets and assign dense cursor indexes.
 * Model-specific: targets belong to one OdysseyModel3D instance.
 */
export function bindAnimation(
  model: OdysseyModel3D,
  animation: OdysseyModelAnimation
): BoundAnimation {
  const nodes: BoundAnimationNode[] = [];
  let cursorIndex = 0;

  if(!animation?.nodes){
    return { animation, nodes, controllerCount: 0 };
  }

  for(let i = 0, nl = animation.nodes.length; i < nl; i++){
    const node = animation.nodes[i] as OdysseyModelAnimationNode;
    let target: OdysseyObject3D | undefined;
    if(typeof node.nodeNumber === "number" && node.nodeNumber >= 0){
      target = model.nodesById?.[node.nodeNumber];
    }
    if(!target){
      target = model.nodes.get(node.name);
    }

    const controllers: BoundController[] = [];
    if(node.controllers){
      for(const c of node.controllers){
        const controller = c[1] as OdysseyController;
        const valid =
          !!controller &&
          Array.isArray(controller.data) &&
          controller.data.length === controller.frameCount;
        const kind = classifyControllerKind(controller);
        const constant = !!controller && controller.frameCount === 1;
        const statefulSample =
          !!controller && isStatefulTransformController(controller.type);
        const bc: BoundController = {
          controller,
          cursorIndex: cursorIndex++,
          valid,
          kind,
          constant,
          statefulSample,
        };
        if(constant && valid && controller.data[0] && isTransformKind(kind)){
          const d = controller.data[0] as {
            x?: number; y?: number; z?: number; w?: number; value?: number;
          };
          if(kind === BoundControllerKind.TransformPos){
            bc.constPos = new Float32Array([
              d.x ?? 0,
              d.y ?? 0,
              d.z ?? 0,
            ]);
          }else if(kind === BoundControllerKind.TransformOri){
            bc.constOri = new Float32Array([
              d.x ?? 0,
              d.y ?? 0,
              d.z ?? 0,
              d.w ?? 1,
            ]);
          }else if(kind === BoundControllerKind.TransformScale){
            bc.constScale = typeof d.value === "number" ? d.value : 1;
          }
        }
        controllers.push(bc);
      }
    }
    nodes.push({ target, controllers, nodeIndex: i });
  }

  return { animation, nodes, controllerCount: cursorIndex };
}

/** Ensure run has an Int32Array sized for the bound animation. */
export function ensureRunFrameCursorArray(
  run: AnimRun,
  bound: BoundAnimation
): Int32Array {
  if(
    run.boundAnimation === bound &&
    run.frameCursorArray &&
    run.frameCursorArray.length === bound.controllerCount
  ){
    return run.frameCursorArray;
  }
  run.boundAnimation = bound;
  run.frameCursorArray = new Int32Array(bound.controllerCount);
  return run.frameCursorArray;
}

/**
 * Ensure a legacy animLoop state has a typed cursor array for a bound clip.
 */
export function ensureStateFrameCursorArray(
  state: {
    boundAnimation?: BoundAnimation | unknown;
    frameCursorArray?: Int32Array;
  },
  bound: BoundAnimation
): Int32Array {
  if(
    state.boundAnimation === bound &&
    state.frameCursorArray &&
    state.frameCursorArray.length === bound.controllerCount
  ){
    return state.frameCursorArray;
  }
  state.boundAnimation = bound;
  state.frameCursorArray = new Int32Array(bound.controllerCount);
  return state.frameCursorArray;
}
