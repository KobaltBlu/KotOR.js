import { OdysseyModelClass } from "../../enums/odyssey/OdysseyModelClass";
import { OdysseyArrayDefinition } from "./OdysseyArrayDefinition";

export interface OdysseyModelHeader {
  classification: OdysseyModelClass;
  subClassification: number;
  smoothing: boolean;
  fogged: boolean
  childModelCount: number;

  animationArrayDefinition: OdysseyArrayDefinition;

  parentModelPointer: number;

  boundingMinX: number;
  boundingMinY: number;
  boundingMinZ: number;
  boundingMaxX: number;
  boundingMaxY: number;
  boundingMaxZ: number;
  radius: number;
  scale: number;
  
  superModelName: string;
}