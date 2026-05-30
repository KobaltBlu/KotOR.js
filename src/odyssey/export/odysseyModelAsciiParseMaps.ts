import * as THREE from "three";
import { OdysseyModelClass } from "@/enums/odyssey/OdysseyModelClass";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";

/** Inverse of `classificationToAscii` in odysseyModelAsciiHelpers. */
export function asciiClassificationToEnum(word: string): OdysseyModelClass {
  const w = word.toLowerCase().trim();
  switch (w) {
    case "other":
      return OdysseyModelClass.OTHER;
    case "effect":
      return OdysseyModelClass.EFFECT;
    case "tile":
      return OdysseyModelClass.TILE;
    case "character":
      return OdysseyModelClass.CREATURE;
    case "door":
      return OdysseyModelClass.DOOR;
    case "lightsaber":
      return OdysseyModelClass.LIGHTSABER;
    case "placeable":
      return OdysseyModelClass.PLACEABLE;
    case "flyer":
      return OdysseyModelClass.FLYER;
    default:
      return OdysseyModelClass.OTHER;
  }
}

export function axisAngleToQuaternion(ax: number, ay: number, az: number, angle: number): THREE.Quaternion {
  const len = Math.hypot(ax, ay, az);
  if (len < 1e-8) return new THREE.Quaternion(0, 0, 0, 1);
  const nx = ax / len;
  const ny = ay / len;
  const nz = az / len;
  const half = angle * 0.5;
  const s = Math.sin(half);
  return new THREE.Quaternion(nx * s, ny * s, nz * s, Math.cos(half)).normalize();
}

export interface ParsedControllerKeySpec {
  baseName: string;
  bezier: boolean;
}

/** Strip `key` / `bezier` suffix from animation controller lines. */
export function parseControllerKeyHeader(word: string): ParsedControllerKeySpec {
  let w = word.toLowerCase();
  let bezier = false;
  if (w.endsWith("key")) {
    w = w.slice(0, -3);
  }
  if (w.endsWith("bezier")) {
    bezier = true;
    w = w.slice(0, -6);
  }
  return { baseName: w, bezier };
}

/**
 * Map ASCII keyword (after stripping key/bezier suffix) to controller type + column hint.
 * `nodeType` is geometry node bitmask for emitter/light/mesh-specific names.
 */
export function asciiControllerBaseToType(
  baseName: string,
  nodeType: number,
): { type: OdysseyModelControllerType; defaultCols: number } | undefined {
  const b = baseName.toLowerCase();
  switch (b) {
    case "position":
      return { type: OdysseyModelControllerType.Position, defaultCols: 3 };
    case "orientation":
      return { type: OdysseyModelControllerType.Orientation, defaultCols: 4 };
    case "scale":
      return { type: OdysseyModelControllerType.Scale, defaultCols: 1 };
  }
  if (nodeType & OdysseyModelNodeType.Light) {
    switch (b) {
      case "color":
        return { type: OdysseyModelControllerType.Color, defaultCols: 3 };
      case "radius":
        return { type: OdysseyModelControllerType.Radius, defaultCols: 1 };
      case "shadowradius":
        return { type: OdysseyModelControllerType.ShadowRadius, defaultCols: 1 };
      case "verticaldisplacement":
        return { type: OdysseyModelControllerType.VerticalDisplacement, defaultCols: 1 };
      case "multiplier":
        return { type: OdysseyModelControllerType.Multiplier, defaultCols: 1 };
    }
  }
  if (nodeType & OdysseyModelNodeType.Emitter) {
    const emitterMap: Record<string, OdysseyModelControllerType> = {
      alphaend: OdysseyModelControllerType.AlphaEnd,
      alphastart: OdysseyModelControllerType.AlphaStart,
      birthrate: OdysseyModelControllerType.BirthRate,
      bounce_co: OdysseyModelControllerType.Bounce_Co,
      combinetime: OdysseyModelControllerType.CombineTime,
      drag: OdysseyModelControllerType.Drag,
      fps: OdysseyModelControllerType.FPS,
      frameend: OdysseyModelControllerType.FrameEnd,
      framestart: OdysseyModelControllerType.FrameStart,
      grav: OdysseyModelControllerType.Gravity,
      lifeexp: OdysseyModelControllerType.LifeExp,
      mass: OdysseyModelControllerType.Mass,
      p2p_bezier2: OdysseyModelControllerType.P2P_Bezier2,
      p2p_bezier3: OdysseyModelControllerType.P2P_Bezier3,
      particlerot: OdysseyModelControllerType.ParticleRot,
      randvel: OdysseyModelControllerType.RandomVelocity,
      sizestart: OdysseyModelControllerType.SizeStart,
      sizeend: OdysseyModelControllerType.SizeEnd,
      sizestart_y: OdysseyModelControllerType.SizeStart_Y,
      sizeend_y: OdysseyModelControllerType.SizeEnd_Y,
      spread: OdysseyModelControllerType.Spread,
      threshold: OdysseyModelControllerType.Threshold,
      velocity: OdysseyModelControllerType.Velocity,
      xsize: OdysseyModelControllerType.XSize,
      ysize: OdysseyModelControllerType.YSize,
      blurlength: OdysseyModelControllerType.BlurLength,
      lightningdelay: OdysseyModelControllerType.LightningDelay,
      lightningradius: OdysseyModelControllerType.LightningRadius,
      lightningscale: OdysseyModelControllerType.LightningScale,
      lightningsubdiv: OdysseyModelControllerType.LightningSubDiv,
      lightningzigzag: OdysseyModelControllerType.LightningZigZag,
      alphamid: OdysseyModelControllerType.AlphaMid,
      percentstart: OdysseyModelControllerType.PercentStart,
      percentmid: OdysseyModelControllerType.PercentMid,
      percentend: OdysseyModelControllerType.PercentEnd,
      sizemid: OdysseyModelControllerType.SizeMid,
      sizemid_y: OdysseyModelControllerType.SizeMid_Y,
      m_frandombirthrate: OdysseyModelControllerType.RandomBirthRate,
      targetsize: OdysseyModelControllerType.TargetSize,
      numcontrolpts: OdysseyModelControllerType.ControlPTCount,
      controlptradius: OdysseyModelControllerType.ControlPTRadius,
      controlptdelay: OdysseyModelControllerType.ControlPTDelay,
      tangentspread: OdysseyModelControllerType.TangentSpread,
      tangentlength: OdysseyModelControllerType.TangentLength,
      colormid: OdysseyModelControllerType.ColorMid,
      colorend: OdysseyModelControllerType.ColorEnd,
      colorstart: OdysseyModelControllerType.ColorStart,
      detonate: OdysseyModelControllerType.Detonate,
    };
    const t = emitterMap[b];
    if (t !== undefined) {
      const defaultCols =
        t === OdysseyModelControllerType.ColorStart ||
        t === OdysseyModelControllerType.ColorMid ||
        t === OdysseyModelControllerType.ColorEnd
          ? 3
          : 1;
      return { type: t, defaultCols };
    }
  }
  if (nodeType & OdysseyModelNodeType.Mesh) {
    if (b === "selfillumcolor") return { type: OdysseyModelControllerType.SelfIllumColor, defaultCols: 3 };
    if (b === "alpha") return { type: OdysseyModelControllerType.Alpha, defaultCols: 1 };
  }
  return undefined;
}
