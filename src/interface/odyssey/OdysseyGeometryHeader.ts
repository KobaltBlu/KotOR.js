import { OdysseyArrayDefinition } from "./OdysseyArrayDefinition";

export interface OdysseyGeometryHeader {
  unknown2ArrayDefinition: OdysseyArrayDefinition;
  unknown1ArrayDefinition: OdysseyArrayDefinition;
  mdxOffset: number;
  mdxLength: number;
  padding: number;
  rootNodeOffset2: number;
  functionPointer0: number;
  functionPointer1: number;
  modelName: string;
  rootNodeOffset: number;
  nodeCount: number;
  refCount: number;
  geometryType: number;
  unknown4: Buffer;
}