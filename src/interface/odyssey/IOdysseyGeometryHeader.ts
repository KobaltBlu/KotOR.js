import type { IOdysseyArrayDefinition } from "./IOdysseyArrayDefinition";

/**
 * IOdysseyGeometryHeader interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IOdysseyGeometryHeader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IOdysseyGeometryHeader {
  unknown2ArrayDefinition: IOdysseyArrayDefinition;
  unknown1ArrayDefinition: IOdysseyArrayDefinition;
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
  unknown4: Uint8Array;
}