/**
 * Pixel IO helpers: TGA/TPC color layout and Y-flip in display space.
 *
 * @file imageIo.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { ImageEncodePolicy, ImageRgba } from "@/apps/forge/image/imageTypes";

export function flipYInPlace(pixelData: Uint8Array | Uint8ClampedArray, width = 1, height = 1): void {
  const stride = width * 4;
  const copy = Uint8Array.from(pixelData);
  let offset = 0;
  for (let pos = copy.length - stride; pos >= 0; pos -= stride) {
    pixelData.set(copy.subarray(pos, pos + stride), offset);
    offset += stride;
  }
}

export function swapRB(pixelData: Uint8Array | Uint8ClampedArray): Uint8Array {
  const fixed = Uint8Array.from(pixelData);
  for (let i = 0; i < pixelData.length; i += 4) {
    fixed[i] = pixelData[i + 2];
    fixed[i + 1] = pixelData[i + 1];
    fixed[i + 2] = pixelData[i];
    fixed[i + 3] = pixelData[i + 3];
  }
  return fixed;
}

export function rgbToRgba(pixelData: Uint8Array, width = 1, height = 1): Uint8Array {
  const data = new Uint8Array(4 * width * height);
  let s = 0;
  let d = 0;
  const n = data.length;
  while (d < n) {
    data[d++] = pixelData[s++];
    data[d++] = pixelData[s++];
    data[d++] = pixelData[s++];
    data[d++] = 255;
  }
  return data;
}

export function grayToRgba(pixelData: Uint8Array): Uint8Array {
  const fixed = new Uint8Array(pixelData.length * 4);
  for (let i = 0; i < pixelData.length; i++) {
    const color = pixelData[i];
    const offset = i * 4;
    fixed[offset] = color;
    fixed[offset + 1] = color;
    fixed[offset + 2] = color;
    fixed[offset + 3] = 255;
  }
  return fixed;
}

/** Convert TGA file pixels (bottom-up BGR) into display-space RGBA. */
export function tgaToDisplayRgba(raw: Uint8Array, width: number, height: number, bitsPerPixel: number): Uint8ClampedArray {
  let rgba: Uint8Array;
  switch (bitsPerPixel) {
    case 32:
      rgba = swapRB(raw);
      break;
    case 24:
      rgba = swapRB(rgbToRgba(raw, width, height));
      break;
    case 8:
      rgba = grayToRgba(raw);
      break;
    default:
      rgba = new Uint8Array(width * height * 4);
      break;
  }
  flipYInPlace(rgba, width, height);
  return new Uint8ClampedArray(rgba);
}

/** Convert display-space RGBA into TGA file pixels (bottom-up BGR). */
export function displayRgbaToTga(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number): Uint8Array {
  const copy = new Uint8Array(rgba);
  flipYInPlace(copy, width, height);
  return swapRB(copy);
}

export function tpcDecodedToDisplayRgba(raw: Uint8Array, width: number, height: number): Uint8ClampedArray {
  const copy = new Uint8Array(raw);
  flipYInPlace(copy, width, height);
  return new Uint8ClampedArray(copy);
}

/** Convert display-space RGBA into TPC file pixels (top-down, inverse of decode). */
export function displayRgbaToTpc(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number): Uint8Array {
  const copy = new Uint8Array(rgba);
  flipYInPlace(copy, width, height);
  return copy;
}

export function hasMeaningfulAlpha(pixelData: Uint8Array | Uint8ClampedArray, policy: ImageEncodePolicy): boolean {
  if (policy.alphaPolicy === "strict-alpha") {
    for (let i = 3; i < pixelData.length; i += 4) {
      if (pixelData[i] < 255) {
        return true;
      }
    }
    return false;
  }
  for (let i = 3; i < pixelData.length; i += 4) {
    if (pixelData[i] < policy.opaqueAlphaThreshold) {
      return true;
    }
  }
  return false;
}

export function sampleRgba(pixels: Uint8Array | Uint8ClampedArray, width: number, x: number, y: number): ImageRgba {
  const i = (y * width + x) * 4;
  return {
    r: pixels[i] || 0,
    g: pixels[i + 1] || 0,
    b: pixels[i + 2] || 0,
    a: pixels[i + 3] || 0,
  };
}

export function packRgba(color: ImageRgba): [number, number, number, number] {
  return [
    Math.max(0, Math.min(255, color.r | 0)),
    Math.max(0, Math.min(255, color.g | 0)),
    Math.max(0, Math.min(255, color.b | 0)),
    Math.max(0, Math.min(255, color.a | 0)),
  ];
}
