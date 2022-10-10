import { OdysseyControllerFrameGeneric } from "./OdysseyControllerFrameGeneric";

export interface OdysseyControllerGeneric {
  type: number;
  nodeType: number;
  frameCount: number;
  timeKeyIndex: number;
  dataValueIndex: number;
  columnCount: number;
  data: OdysseyControllerFrameGeneric[],
}