/**
 * Document-wide pixel operations: flip, rotate, resize, invert, crop.
 *
 * @file imageOps.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { clearPsdPassthrough, hasPaintBuffer, isSelected, transparentPixels } from "@/apps/forge/image/imageDocument";
import type { ImageDocument, ImageLayer, ImageRect } from "@/apps/forge/image/imageTypes";

function pixelCount(width: number, height: number): number {
  return width * height * 4;
}

export function flipHorizontal(pixels: Uint8ClampedArray, width: number, height: number): void {
  const copy = new Uint8ClampedArray(pixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = (y * width + (width - 1 - x)) * 4;
      pixels[dst] = copy[src];
      pixels[dst + 1] = copy[src + 1];
      pixels[dst + 2] = copy[src + 2];
      pixels[dst + 3] = copy[src + 3];
    }
  }
}

export function flipVertical(pixels: Uint8ClampedArray, width: number, height: number): void {
  const copy = new Uint8ClampedArray(pixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = ((height - 1 - y) * width + x) * 4;
      pixels[dst] = copy[src];
      pixels[dst + 1] = copy[src + 1];
      pixels[dst + 2] = copy[src + 2];
      pixels[dst + 3] = copy[src + 3];
    }
  }
}

export function rotate90(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixelCount(height, width));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const nx = height - 1 - y;
      const ny = x;
      const dst = (ny * height + nx) * 4;
      out[dst] = pixels[src];
      out[dst + 1] = pixels[src + 1];
      out[dst + 2] = pixels[src + 2];
      out[dst + 3] = pixels[src + 3];
    }
  }
  return out;
}

export function resizeBilinear(
  pixels: Uint8ClampedArray | Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8ClampedArray {
  if (srcW === dstW && srcH === dstH) {
    return new Uint8ClampedArray(pixels);
  }
  const out = new Uint8ClampedArray(pixelCount(dstW, dstH));
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    const sy = (y + 0.5) * yRatio - 0.5;
    const y0 = Math.max(0, Math.min(srcH - 1, Math.floor(sy)));
    const y1 = Math.max(0, Math.min(srcH - 1, y0 + 1));
    const fy = sy - y0;
    for (let x = 0; x < dstW; x++) {
      const sx = (x + 0.5) * xRatio - 0.5;
      const x0 = Math.max(0, Math.min(srcW - 1, Math.floor(sx)));
      const x1 = Math.max(0, Math.min(srcW - 1, x0 + 1));
      const fx = sx - x0;
      const dst = (y * dstW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = pixels[(y0 * srcW + x0) * 4 + c];
        const p10 = pixels[(y0 * srcW + x1) * 4 + c];
        const p01 = pixels[(y1 * srcW + x0) * 4 + c];
        const p11 = pixels[(y1 * srcW + x1) * 4 + c];
        const top = p00 + (p10 - p00) * fx;
        const bot = p01 + (p11 - p01) * fx;
        out[dst + c] = top + (bot - top) * fy;
      }
    }
  }
  return out;
}

function transformSelection(
  mask: Uint8Array | null,
  width: number,
  height: number,
  map: (x: number, y: number) => { x: number; y: number },
  outW: number,
  outH: number,
): Uint8Array | null {
  if (!mask) {
    return null;
  }
  const next = new Uint8Array(outW * outH);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = mask[y * width + x];
      if (!value) continue;
      const dest = map(x, y);
      if (dest.x >= 0 && dest.y >= 0 && dest.x < outW && dest.y < outH) {
        next[dest.y * outW + dest.x] = value;
      }
    }
  }
  return next;
}

export function flipDocumentHorizontal(doc: ImageDocument): void {
  clearPsdPassthrough(doc, { dropNonRaster: true });
  for (let i = 0; i < doc.layers.length; i++) {
    if (!hasPaintBuffer(doc.layers[i], doc.width, doc.height)) continue;
    flipHorizontal(doc.layers[i].pixels, doc.width, doc.height);
  }
  doc.selection = transformSelection(
    doc.selection,
    doc.width,
    doc.height,
    (x, y) => ({ x: doc.width - 1 - x, y }),
    doc.width,
    doc.height,
  );
}

export function flipDocumentVertical(doc: ImageDocument): void {
  clearPsdPassthrough(doc, { dropNonRaster: true });
  for (let i = 0; i < doc.layers.length; i++) {
    if (!hasPaintBuffer(doc.layers[i], doc.width, doc.height)) continue;
    flipVertical(doc.layers[i].pixels, doc.width, doc.height);
  }
  doc.selection = transformSelection(
    doc.selection,
    doc.width,
    doc.height,
    (x, y) => ({ x, y: doc.height - 1 - y }),
    doc.width,
    doc.height,
  );
}

export function rotateDocument90(doc: ImageDocument, times = 1): void {
  const count = ((times % 4) + 4) % 4;
  if (count) {
    clearPsdPassthrough(doc, { dropNonRaster: true });
  }
  for (let n = 0; n < count; n++) {
    const width = doc.width;
    const height = doc.height;
    for (let i = 0; i < doc.layers.length; i++) {
      if (!hasPaintBuffer(doc.layers[i], width, height)) continue;
      doc.layers[i].pixels = rotate90(doc.layers[i].pixels, width, height);
    }
    doc.selection = transformSelection(
      doc.selection,
      width,
      height,
      (x, y) => ({ x: height - 1 - y, y: x }),
      height,
      width,
    );
    doc.width = height;
    doc.height = width;
  }
}

export function invertLayer(layer: ImageLayer, doc: ImageDocument): void {
  if (!hasPaintBuffer(layer, doc.width, doc.height)) return;
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      if (!isSelected(doc, x, y)) continue;
      const i = (y * doc.width + x) * 4;
      if (layer.lockTransparent && layer.pixels[i + 3] === 0) continue;
      layer.pixels[i] = 255 - layer.pixels[i];
      layer.pixels[i + 1] = 255 - layer.pixels[i + 1];
      layer.pixels[i + 2] = 255 - layer.pixels[i + 2];
    }
  }
}

export function desaturateLayer(layer: ImageLayer, doc: ImageDocument): void {
  if (!hasPaintBuffer(layer, doc.width, doc.height)) return;
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      if (!isSelected(doc, x, y)) continue;
      const i = (y * doc.width + x) * 4;
      if (layer.lockTransparent && layer.pixels[i + 3] === 0) continue;
      const g = (layer.pixels[i] * 0.299 + layer.pixels[i + 1] * 0.587 + layer.pixels[i + 2] * 0.114) | 0;
      layer.pixels[i] = g;
      layer.pixels[i + 1] = g;
      layer.pixels[i + 2] = g;
    }
  }
}

export function resizeDocument(doc: ImageDocument, width: number, height: number): void {
  const w = Math.max(1, width | 0);
  const h = Math.max(1, height | 0);
  if (w === doc.width && h === doc.height) {
    return;
  }
  clearPsdPassthrough(doc, { dropNonRaster: true });
  for (let i = 0; i < doc.layers.length; i++) {
    if (!hasPaintBuffer(doc.layers[i], doc.width, doc.height)) continue;
    doc.layers[i].pixels = resizeBilinear(doc.layers[i].pixels, doc.width, doc.height, w, h);
  }
  if (doc.selection) {
    const maskRgba = new Uint8ClampedArray(doc.width * doc.height * 4);
    for (let i = 0; i < doc.selection.length; i++) {
      const v = doc.selection[i];
      const o = i * 4;
      maskRgba[o] = v;
      maskRgba[o + 1] = v;
      maskRgba[o + 2] = v;
      maskRgba[o + 3] = 255;
    }
    const scaled = resizeBilinear(maskRgba, doc.width, doc.height, w, h);
    const next = new Uint8Array(w * h);
    for (let i = 0; i < next.length; i++) {
      next[i] = scaled[i * 4] > 127 ? 255 : 0;
    }
    doc.selection = next;
  }
  doc.width = w;
  doc.height = h;
}

export function canvasSize(doc: ImageDocument, width: number, height: number, anchorX = 0.5, anchorY = 0.5): void {
  const w = Math.max(1, width | 0);
  const h = Math.max(1, height | 0);
  if (w === doc.width && h === doc.height) {
    return;
  }
  clearPsdPassthrough(doc, { dropNonRaster: true });
  const ox = Math.round((w - doc.width) * anchorX);
  const oy = Math.round((h - doc.height) * anchorY);
  for (let i = 0; i < doc.layers.length; i++) {
    if (!hasPaintBuffer(doc.layers[i], doc.width, doc.height)) continue;
    const src = doc.layers[i].pixels;
    const next = transparentPixels(w, h);
    copyRect(src, doc.width, doc.height, 0, 0, doc.width, doc.height, next, w, ox, oy);
    doc.layers[i].pixels = next;
  }
  if (doc.selection) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < doc.height; y++) {
      const ny = y + oy;
      if (ny < 0 || ny >= h) continue;
      for (let x = 0; x < doc.width; x++) {
        const nx = x + ox;
        if (nx < 0 || nx >= w) continue;
        next[ny * w + nx] = doc.selection[y * doc.width + x];
      }
    }
    doc.selection = next;
  }
  doc.width = w;
  doc.height = h;
}

export function cropDocument(doc: ImageDocument, rect: ImageRect): void {
  const x = Math.max(0, Math.min(doc.width, Math.round(rect.x)));
  const y = Math.max(0, Math.min(doc.height, Math.round(rect.y)));
  const w = Math.max(1, Math.min(doc.width - x, Math.round(rect.w)));
  const h = Math.max(1, Math.min(doc.height - y, Math.round(rect.h)));
  clearPsdPassthrough(doc, { dropNonRaster: true });
  for (let i = 0; i < doc.layers.length; i++) {
    if (!hasPaintBuffer(doc.layers[i], doc.width, doc.height)) continue;
    const next = transparentPixels(w, h);
    copyRect(doc.layers[i].pixels, doc.width, doc.height, x, y, w, h, next, w, 0, 0);
    doc.layers[i].pixels = next;
  }
  if (doc.selection) {
    const next = new Uint8Array(w * h);
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        next[yy * w + xx] = doc.selection[(y + yy) * doc.width + (x + xx)];
      }
    }
    doc.selection = next;
  }
  doc.width = w;
  doc.height = h;
}

export function copyRect(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  sx: number,
  sy: number,
  w: number,
  h: number,
  dst: Uint8ClampedArray,
  dstW: number,
  dx: number,
  dy: number,
): void {
  const dstH = (dst.length / (dstW * 4)) | 0;
  for (let y = 0; y < h; y++) {
    const srcY = sy + y;
    const dstY = dy + y;
    if (srcY < 0 || srcY >= srcH || dstY < 0 || dstY >= dstH) continue;
    for (let x = 0; x < w; x++) {
      const srcX = sx + x;
      const dstX = dx + x;
      if (srcX < 0 || srcX >= srcW || dstX < 0 || dstX >= dstW) continue;
      const si = (srcY * srcW + srcX) * 4;
      const di = (dstY * dstW + dstX) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }
}

export function translateLayerPixels(layer: ImageLayer, doc: ImageDocument, dx: number, dy: number): void {
  if (!dx && !dy) return;
  if (!hasPaintBuffer(layer, doc.width, doc.height)) return;
  const next = transparentPixels(doc.width, doc.height);
  copyRect(layer.pixels, doc.width, doc.height, 0, 0, doc.width, doc.height, next, doc.width, dx, dy);
  layer.pixels = next;
}

export function clearSelected(layer: ImageLayer, doc: ImageDocument): void {
  if (!hasPaintBuffer(layer, doc.width, doc.height)) return;
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      if (!isSelected(doc, x, y)) continue;
      const i = (y * doc.width + x) * 4;
      if (layer.lockTransparent && layer.pixels[i + 3] === 0) continue;
      layer.pixels[i] = 0;
      layer.pixels[i + 1] = 0;
      layer.pixels[i + 2] = 0;
      layer.pixels[i + 3] = 0;
    }
  }
}
