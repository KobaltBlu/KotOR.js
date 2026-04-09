import { OdysseyModelClass } from "@/enums/odyssey/OdysseyModelClass";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";

/** MDLedit `RoundDec` then `TruncateDec` (see research/mdledit/general.cpp). */
export function roundDec(fNumber: number, nDecPlaces: number): number {
  if (nDecPlaces < 0) return fNumber;
  const fFactor = Math.pow(10, -nDecPlaces);
  let fReturn = fNumber / fFactor;
  fReturn = Math.round(fReturn);
  return fReturn * fFactor;
}

export function truncateDec(s: string): string {
  const n = s.indexOf("e");
  let sPart2 = "";
  let sCopy = s;
  if (n !== -1) {
    sPart2 = s.slice(n);
    sCopy = s.slice(0, n);
  }
  if (sCopy.indexOf(".") === -1) {
    return sCopy + ".0" + sPart2;
  }
  while (sCopy.endsWith("0")) {
    sCopy = sCopy.slice(0, -1);
  }
  if (sCopy.endsWith(".")) {
    sCopy += "0";
  }
  return sCopy + sPart2;
}

export function prepareFloat(fFloat: number, finiteOnly = true): string {
  if (!Number.isFinite(fFloat)) {
    return finiteOnly ? "0.0" : String(fFloat);
  }
  const rounded = roundDec(fFloat, 8);
  const ss = rounded.toPrecision(6);
  return truncateDec(ss.indexOf("e") >= 0 ? String(rounded) : ss);
}

export function classificationToAscii(nClassification: number): string {
  switch (nClassification) {
    case OdysseyModelClass.OTHER:
      return "other";
    case OdysseyModelClass.EFFECT:
      return "effect";
    case OdysseyModelClass.TILE:
      return "tile";
    case OdysseyModelClass.CREATURE:
      return "character";
    case OdysseyModelClass.DOOR:
      return "door";
    case OdysseyModelClass.LIGHTSABER:
      return "lightsaber";
    case OdysseyModelClass.PLACEABLE:
      return "placeable";
    case OdysseyModelClass.FLYER:
      return "flyer";
    default:
      return "unknown";
  }
}

export function controllerTypeToAscii(type: OdysseyModelControllerType, nodeType: number): string {
  switch (type) {
    case OdysseyModelControllerType.Position:
      return "position";
    case OdysseyModelControllerType.Orientation:
      return "orientation";
    case OdysseyModelControllerType.Scale:
      return "scale";
  }
  if (nodeType & OdysseyModelNodeType.Light) {
    switch (type) {
      case OdysseyModelControllerType.Color:
        return "color";
      case OdysseyModelControllerType.Radius:
        return "radius";
      case OdysseyModelControllerType.ShadowRadius:
        return "shadowradius";
      case OdysseyModelControllerType.VerticalDisplacement:
        return "verticaldisplacement";
      case OdysseyModelControllerType.Multiplier:
        return "multiplier";
    }
  } else if (nodeType & OdysseyModelNodeType.Emitter) {
    const map: Partial<Record<OdysseyModelControllerType, string>> = {
      [OdysseyModelControllerType.AlphaEnd]: "alphaEnd",
      [OdysseyModelControllerType.AlphaStart]: "alphaStart",
      [OdysseyModelControllerType.BirthRate]: "birthrate",
      [OdysseyModelControllerType.Bounce_Co]: "bounce_co",
      [OdysseyModelControllerType.CombineTime]: "combinetime",
      [OdysseyModelControllerType.Drag]: "drag",
      [OdysseyModelControllerType.FPS]: "fps",
      [OdysseyModelControllerType.FrameEnd]: "frameEnd",
      [OdysseyModelControllerType.FrameStart]: "frameStart",
      [OdysseyModelControllerType.Gravity]: "grav",
      [OdysseyModelControllerType.LifeExp]: "lifeExp",
      [OdysseyModelControllerType.Mass]: "mass",
      [OdysseyModelControllerType.P2P_Bezier2]: "p2p_bezier2",
      [OdysseyModelControllerType.P2P_Bezier3]: "p2p_bezier3",
      [OdysseyModelControllerType.ParticleRot]: "particleRot",
      [OdysseyModelControllerType.RandomVelocity]: "randvel",
      [OdysseyModelControllerType.SizeStart]: "sizeStart",
      [OdysseyModelControllerType.SizeEnd]: "sizeEnd",
      [OdysseyModelControllerType.SizeStart_Y]: "sizeStart_y",
      [OdysseyModelControllerType.SizeEnd_Y]: "sizeEnd_y",
      [OdysseyModelControllerType.Spread]: "spread",
      [OdysseyModelControllerType.Threshold]: "threshold",
      [OdysseyModelControllerType.Velocity]: "velocity",
      [OdysseyModelControllerType.XSize]: "xsize",
      [OdysseyModelControllerType.YSize]: "ysize",
      [OdysseyModelControllerType.BlurLength]: "blurlength",
      [OdysseyModelControllerType.LightningDelay]: "lightningDelay",
      [OdysseyModelControllerType.LightningRadius]: "lightningRadius",
      [OdysseyModelControllerType.LightningScale]: "lightningScale",
      [OdysseyModelControllerType.LightningSubDiv]: "lightningSubDiv",
      [OdysseyModelControllerType.LightningZigZag]: "lightningzigzag",
      [OdysseyModelControllerType.AlphaMid]: "alphaMid",
      [OdysseyModelControllerType.PercentStart]: "percentStart",
      [OdysseyModelControllerType.PercentMid]: "percentMid",
      [OdysseyModelControllerType.PercentEnd]: "percentEnd",
      [OdysseyModelControllerType.SizeMid]: "sizeMid",
      [OdysseyModelControllerType.SizeMid_Y]: "sizeMid_y",
      [OdysseyModelControllerType.RandomBirthRate]: "m_frandombirthrate",
      [OdysseyModelControllerType.TargetSize]: "targetsize",
      [OdysseyModelControllerType.ControlPTCount]: "numcontrolpts",
      [OdysseyModelControllerType.ControlPTRadius]: "controlptradius",
      [OdysseyModelControllerType.ControlPTDelay]: "controlptdelay",
      [OdysseyModelControllerType.TangentSpread]: "tangentspread",
      [OdysseyModelControllerType.TangentLength]: "tangentlength",
      [OdysseyModelControllerType.ColorMid]: "colormid",
      [OdysseyModelControllerType.ColorEnd]: "colorend",
      [OdysseyModelControllerType.ColorStart]: "colorstart",
      [OdysseyModelControllerType.Detonate]: "detonate",
    };
    const s = map[type];
    if (s) return s;
  } else if (nodeType & OdysseyModelNodeType.Mesh) {
    switch (type) {
      case OdysseyModelControllerType.SelfIllumColor:
        return "selfillumcolor";
      case OdysseyModelControllerType.Alpha:
        return "alpha";
    }
  }
  return `controller_${type}`;
}

/** Axis-angle for MDL ASCII orientation keys (MDLedit exports axis+angle, not raw quats). */
export function quaternionToAxisAngleFromXYZW(
  x: number,
  y: number,
  z: number,
  w: number,
): { ax: number; ay: number; az: number; angle: number } {
  const len = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
  const qx = x / len;
  const qy = y / len;
  const qz = z / len;
  const qw = w / len;
  const angle = 2 * Math.acos(Math.min(1, Math.max(-1, qw)));
  const s = Math.sqrt(Math.max(0, 1 - qw * qw));
  if (s < 0.001) {
    return { ax: 1, ay: 0, az: 0, angle: 0 };
  }
  return { ax: qx / s, ay: qy / s, az: qz / s, angle };
}
