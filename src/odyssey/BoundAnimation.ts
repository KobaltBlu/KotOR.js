import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationNode } from "@/odyssey/OdysseyModelAnimationNode";
import type { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import type { OdysseyObject3D, OdysseyModel3D } from "@/three/odyssey";
import type { AnimRun } from "@/odyssey/AnimRun";

export interface BoundController {
  controller: OdysseyController;
  /** Index into AnimRun.frameCursorArray. */
  cursorIndex: number;
  /** True when data.length === frameCount (validated at bind). */
  valid: boolean;
}

export interface BoundAnimationNode {
  target: OdysseyObject3D | undefined;
  controllers: BoundController[];
}

export interface BoundAnimation {
  animation: OdysseyModelAnimation;
  nodes: BoundAnimationNode[];
  controllerCount: number;
}

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
        controllers.push({
          controller,
          cursorIndex: cursorIndex++,
          valid,
        });
      }
    }
    nodes.push({ target, controllers });
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
