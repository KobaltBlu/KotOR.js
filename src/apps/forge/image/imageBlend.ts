/**
 * Layer blend modes for CPU flatten of the image document.
 *
 * @file imageBlend.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { ImageBlendMode, ImageDocument } from "@/apps/forge/image/imageTypes";

function blendChannel(dst: number, src: number, mode: ImageBlendMode): number {
  switch (mode) {
    case "multiply":
      return (dst * src) / 255;
    case "screen":
      return 255 - ((255 - dst) * (255 - src)) / 255;
    case "overlay":
      return dst < 128 ? (2 * dst * src) / 255 : 255 - (2 * (255 - dst) * (255 - src)) / 255;
    case "add":
      return Math.min(255, dst + src);
    case "darken":
      return Math.min(dst, src);
    case "lighten":
      return Math.max(dst, src);
    default:
      return src;
  }
}

export function compositeLayer(
  dst: Uint8ClampedArray,
  src: Uint8ClampedArray | Uint8Array,
  opacity: number,
  mode: ImageBlendMode,
): void {
  const op = Math.max(0, Math.min(1, opacity));
  const n = Math.min(dst.length, src.length);
  for (let i = 0; i < n; i += 4) {
    const srcA = (src[i + 3] / 255) * op;
    if (srcA <= 0) {
      continue;
    }
    const dstA = dst[i + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) {
      continue;
    }
    const br = blendChannel(dst[i], src[i], mode);
    const bg = blendChannel(dst[i + 1], src[i + 1], mode);
    const bb = blendChannel(dst[i + 2], src[i + 2], mode);
    dst[i] = (br * srcA + dst[i] * dstA * (1 - srcA)) / outA;
    dst[i + 1] = (bg * srcA + dst[i + 1] * dstA * (1 - srcA)) / outA;
    dst[i + 2] = (bb * srcA + dst[i + 2] * dstA * (1 - srcA)) / outA;
    dst[i + 3] = outA * 255;
  }
}

export function flattenDocument(doc: ImageDocument): Uint8ClampedArray {
  const out = new Uint8ClampedArray(doc.width * doc.height * 4);
  for (let i = 0; i < doc.layers.length; i++) {
    const layer = doc.layers[i];
    if (!layer.visible || (layer.kind || "raster") !== "raster") {
      continue;
    }
    compositeLayer(out, layer.pixels, layer.opacity, layer.blend);
  }
  return out;
}
