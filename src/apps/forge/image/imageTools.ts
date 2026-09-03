/**
 * Paint, fill, and sampling tools for the image document.
 *
 * @file imageTools.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { isSelected } from "@/apps/forge/image/imageDocument";
import { packRgba } from "@/apps/forge/image/imageIo";
import type { ImageDocument, ImageLayer, ImageRgba } from "@/apps/forge/image/imageTypes";

function inBounds(doc: ImageDocument, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < doc.width && y < doc.height;
}

function writePixel(
  layer: ImageLayer,
  doc: ImageDocument,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number,
  erase: boolean,
): void {
  if (!inBounds(doc, x, y) || !isSelected(doc, x, y)) {
    return;
  }
  const i = (y * doc.width + x) * 4;
  if (layer.lockTransparent && layer.pixels[i + 3] === 0) {
    return;
  }
  if (erase) {
    const remain = 1 - a / 255;
    layer.pixels[i + 3] = layer.pixels[i + 3] * remain;
    return;
  }
  const srcA = a / 255;
  const dstA = layer.pixels[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) {
    layer.pixels[i + 3] = 0;
    return;
  }
  layer.pixels[i] = (r * srcA + layer.pixels[i] * dstA * (1 - srcA)) / outA;
  layer.pixels[i + 1] = (g * srcA + layer.pixels[i + 1] * dstA * (1 - srcA)) / outA;
  layer.pixels[i + 2] = (b * srcA + layer.pixels[i + 2] * dstA * (1 - srcA)) / outA;
  layer.pixels[i + 3] = outA * 255;
}

export function stampBrush(
  layer: ImageLayer,
  doc: ImageDocument,
  cx: number,
  cy: number,
  color: ImageRgba,
  size: number,
  hardness: number,
  opacity: number,
  erase = false,
): void {
  const radius = Math.max(0.5, size / 2);
  const hard = Math.max(0, Math.min(1, hardness));
  const op = Math.max(0, Math.min(1, opacity));
  const [r, g, b] = packRgba(color);
  const minX = Math.max(0, Math.floor(cx - radius - 1));
  const maxX = Math.min(doc.width - 1, Math.ceil(cx + radius + 1));
  const minY = Math.max(0, Math.floor(cy - radius - 1));
  const maxY = Math.min(doc.height - 1, Math.ceil(cy + radius + 1));
  const hardR = radius * hard;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      let cover = 1;
      if (dist > hardR) {
        cover = 1 - (dist - hardR) / Math.max(0.0001, radius - hardR);
      }
      const a = color.a * op * cover;
      if (a <= 0) continue;
      writePixel(layer, doc, x, y, r, g, b, a, erase);
    }
  }
}

export function strokeBrush(
  layer: ImageLayer,
  doc: ImageDocument,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: ImageRgba,
  size: number,
  hardness: number,
  opacity: number,
  erase = false,
): void {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const step = Math.max(1, size / 4);
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    stampBrush(layer, doc, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, color, size, hardness, opacity, erase);
  }
}

function colorDistance(a: ImageRgba, b: ImageRgba): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b), Math.abs(a.a - b.a));
}

export function floodFill(
  layer: ImageLayer,
  doc: ImageDocument,
  startX: number,
  startY: number,
  color: ImageRgba,
  tolerance: number,
): void {
  if (!inBounds(doc, startX, startY) || !isSelected(doc, startX, startY)) {
    return;
  }
  const i0 = (startY * doc.width + startX) * 4;
  const target: ImageRgba = {
    r: layer.pixels[i0],
    g: layer.pixels[i0 + 1],
    b: layer.pixels[i0 + 2],
    a: layer.pixels[i0 + 3],
  };
  const fill = packRgba(color);
  const seen = new Uint8Array(doc.width * doc.height);
  const stack = [startX, startY];
  while (stack.length) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    if (!inBounds(doc, x, y)) continue;
    const idx = y * doc.width + x;
    if (seen[idx]) continue;
    seen[idx] = 1;
    if (!isSelected(doc, x, y)) continue;
    const i = idx * 4;
    if (layer.lockTransparent && layer.pixels[i + 3] === 0) continue;
    const sample: ImageRgba = {
      r: layer.pixels[i],
      g: layer.pixels[i + 1],
      b: layer.pixels[i + 2],
      a: layer.pixels[i + 3],
    };
    if (colorDistance(sample, target) > tolerance) continue;
    layer.pixels[i] = fill[0];
    layer.pixels[i + 1] = fill[1];
    layer.pixels[i + 2] = fill[2];
    layer.pixels[i + 3] = fill[3];
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
}
