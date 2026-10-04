/**
 * Helpers for copying WebGL framebuffer pixels into an OffscreenCanvas.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file framebufferCapture.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/**
 * Flip rows top↔bottom and force every alpha channel to 255.
 * WebGL `readPixels` origin is bottom-left; 2D canvas / TGA expect top-left.
 */
export function flipYForceOpaque(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray<ArrayBuffer> {
  const flipped = new Uint8ClampedArray(new ArrayBuffer(pixels.length));
  const rowBytes = width * 4;
  for(let y = 0; y < height; y++){
    const src = (height - 1 - y) * rowBytes;
    const dst = y * rowBytes;
    flipped.set(pixels.subarray(src, src + rowBytes), dst);
  }
  for(let i = 3; i < flipped.length; i += 4){
    flipped[i] = 255;
  }
  return flipped;
}

/**
 * Write RGBA pixels (already top-left, opaque alpha) into a new OffscreenCanvas.
 */
export function pixelsToOffscreenCanvas(
  pixels: Uint8ClampedArray<ArrayBuffer>,
  width: number,
  height: number,
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if(!ctx){
    throw new Error('OffscreenCanvas 2d context unavailable');
  }
  ctx.putImageData(new ImageData(pixels as unknown as ImageDataArray, width, height), 0, 0);
  return canvas;
}
