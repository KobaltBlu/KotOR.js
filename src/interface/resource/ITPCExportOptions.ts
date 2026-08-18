import type { ENCODING } from "@/enums/graphics/tpc/Encoding";

/**
 * Options for writing an Odyssey TPC buffer from level-0 RGBA.
 *
 * Pixel data is file-oriented (not Forge canvas Y-flip). Cubemap faces are a
 * vertical strip (`height === 6 * width`). Cycle textures pass the stitched
 * atlas plus `cycle.numx` / `cycle.numy`.
 *
 * @file ITPCExportOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ITPCExportOptions {
  rgba: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  encoding: ENCODING;
  compressed: boolean;
  alphaTest?: number;
  mipMapCount?: number;
  isCubemap?: boolean;
  cycle?: { numx: number; numy: number };
  txi?: string;
}
