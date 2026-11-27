import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import type { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";

/**
 * Bind-time controller channel classification for animation evaluation.
 * Used to distinguish transform commits from material/light/emitter side effects.
 */
export enum BoundControllerKind {
  TransformPos = 1,
  TransformOri = 2,
  TransformScale = 3,
  Material = 4,
  Light = 5,
  Emitter = 6,
  SideEffect = 7,
}

/** Controllers whose animate()/setFrame may depend on prior node or keyframe mutation. */
export function isStatefulTransformController(type: OdysseyModelControllerType): boolean {
  return (
    type === OdysseyModelControllerType.Scale ||
    type === OdysseyModelControllerType.Orientation
  );
}

export function classifyControllerKind(
  controller: OdysseyController | undefined | null
): BoundControllerKind {
  if(!controller) return BoundControllerKind.SideEffect;
  switch(controller.type){
    case OdysseyModelControllerType.Position:
      return BoundControllerKind.TransformPos;
    case OdysseyModelControllerType.Orientation:
      return BoundControllerKind.TransformOri;
    case OdysseyModelControllerType.Scale:
      return BoundControllerKind.TransformScale;
    case OdysseyModelControllerType.Alpha:
    case OdysseyModelControllerType.SelfIllumColor:
      return BoundControllerKind.Material;
    case OdysseyModelControllerType.Color:
    case OdysseyModelControllerType.Radius:
    case OdysseyModelControllerType.Multiplier:
    case OdysseyModelControllerType.ShadowRadius:
    case OdysseyModelControllerType.VerticalDisplacement:
      return BoundControllerKind.Light;
    default:
      // Emitter / particle / lightning / unknown — treat as side-effecting.
      if(controller.type >= 80){
        return BoundControllerKind.Emitter;
      }
      return BoundControllerKind.SideEffect;
  }
}

export function isTransformKind(kind: BoundControllerKind): boolean {
  return (
    kind === BoundControllerKind.TransformPos ||
    kind === BoundControllerKind.TransformOri ||
    kind === BoundControllerKind.TransformScale
  );
}
