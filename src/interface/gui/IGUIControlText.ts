import type {
  BufferGeometry,
  Color,
  Mesh,
  ShaderMaterial,
} from "three";

import type { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";

/**
 * IGUIControlText interface.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file IGUIControlText.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGUIControlText {
  color: Color;
  font: string;
  strref: number;
  text: string;
  alignment: number;
  pulsing: number;
  geometry: BufferGeometry;
  material: ShaderMaterial;
  mesh: Mesh;
  texture: OdysseyTexture;
}
