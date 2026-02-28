import type {
  BufferGeometry,
  Mesh,
} from "three";

import type { IGUIShaderMaterial } from "@/interface/gui/IGUIShaderMaterial";

/**
 * IGUIControlBorderFill interface.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file IGUIControlBorderFill.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGUIControlBorderFill {
  texture: string,
  material: IGUIShaderMaterial,
  mesh: Mesh,
  geometry: BufferGeometry
}
