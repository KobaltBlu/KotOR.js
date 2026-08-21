/**
 * Image document: layers, selection, clone, and layer stack ops.
 *
 * @file imageDocument.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { compositeLayer, flattenDocument } from "@/apps/forge/image/imageBlend";
import {
  DEFAULT_ENCODE_POLICY,
  DEFAULT_RGBA_BLACK,
  DEFAULT_RGBA_WHITE,
  type ImageDocument,
  type ImageEncodePolicy,
  type ImageLayer,
  type ImageRect,
  type ImageRgba,
} from "@/apps/forge/image/imageTypes";

let nextLayerSeq = 1;

export function allocLayerId(): string {
  nextLayerSeq += 1;
  return `L${nextLayerSeq}`;
}

export function isRasterLayer(layer: ImageLayer): boolean {
  return (layer.kind || "raster") === "raster";
}

export function isLayerEditable(layer: ImageLayer | undefined): layer is ImageLayer {
  if (!layer) {
    return false;
  }
  if (layer.editable === false) {
    return false;
  }
  return isRasterLayer(layer);
}

export function hasPaintBuffer(layer: ImageLayer, width: number, height: number): boolean {
  return isRasterLayer(layer) && layer.pixels.length >= width * height * 4;
}

export function transparentPixels(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(Math.max(0, width) * Math.max(0, height) * 4);
}

export function cloneLayer(layer: ImageLayer): ImageLayer {
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    blend: layer.blend,
    lockTransparent: layer.lockTransparent,
    pixels: new Uint8ClampedArray(layer.pixels),
    kind: layer.kind || "raster",
    groupDepth: layer.groupDepth || 0,
    editable: layer.editable !== false && (layer.kind || "raster") === "raster",
    foreignBlend: layer.foreignBlend,
  };
}

export function cloneDocument(doc: ImageDocument): ImageDocument {
  return {
    width: doc.width,
    height: doc.height,
    layers: doc.layers.map(cloneLayer),
    activeLayerId: doc.activeLayerId,
    selection: doc.selection ? new Uint8Array(doc.selection) : null,
    txiText: doc.txiText,
    encode: { ...doc.encode },
    foreground: { ...doc.foreground },
    background: { ...doc.background },
    psd: doc.psd ? { source: doc.psd.source, nodes: { ...doc.psd.nodes } } : undefined,
  };
}

export function createLayer(
  width: number,
  height: number,
  options: Partial<Omit<ImageLayer, "pixels">> & { pixels?: Uint8ClampedArray | Uint8Array } = {},
): ImageLayer {
  const kind = options.kind || "raster";
  const pixels = options.pixels
    ? new Uint8ClampedArray(options.pixels)
    : kind === "raster"
      ? transparentPixels(width, height)
      : new Uint8ClampedArray(0);
  return {
    id: options.id || allocLayerId(),
    name: options.name || "Layer",
    visible: options.visible !== false,
    opacity: options.opacity ?? 1,
    blend: options.blend || "normal",
    lockTransparent: !!options.lockTransparent,
    pixels,
    kind,
    groupDepth: options.groupDepth ?? 0,
    editable: options.editable !== undefined ? options.editable : kind === "raster",
    foreignBlend: options.foreignBlend,
  };
}

export function createUntitledDocument(width = 256, height = 256, txiText = ""): ImageDocument {
  const layer = createLayer(width, height, { name: "Background" });
  return {
    width,
    height,
    layers: [layer],
    activeLayerId: layer.id,
    selection: null,
    txiText,
    encode: { ...DEFAULT_ENCODE_POLICY },
    foreground: { ...DEFAULT_RGBA_WHITE },
    background: { ...DEFAULT_RGBA_BLACK },
  };
}

export function createDocumentFromRgba(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  txiText = "",
  encode?: ImageEncodePolicy,
): ImageDocument {
  const layer = createLayer(width, height, { name: "Background", pixels });
  return {
    width,
    height,
    layers: [layer],
    activeLayerId: layer.id,
    selection: null,
    txiText,
    encode: encode ? { ...encode } : { ...DEFAULT_ENCODE_POLICY },
    foreground: { ...DEFAULT_RGBA_WHITE },
    background: { ...DEFAULT_RGBA_BLACK },
  };
}

export function getActiveLayer(doc: ImageDocument): ImageLayer | undefined {
  return doc.layers.find((layer) => layer.id === doc.activeLayerId) || doc.layers[doc.layers.length - 1];
}

export function getActiveLayerIndex(doc: ImageDocument): number {
  const index = doc.layers.findIndex((layer) => layer.id === doc.activeLayerId);
  return index >= 0 ? index : doc.layers.length - 1;
}

function layerNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function usedLayerNameKeys(doc: ImageDocument): Set<string> {
  const used = new Set<string>();
  for (let i = 0; i < doc.layers.length; i++) {
    used.add(layerNameKey(doc.layers[i].name));
  }
  return used;
}

/** Next unused "Layer N" name in the document stack. */
export function nextUniqueLayerName(doc: ImageDocument, base = "Layer"): string {
  const used = usedLayerNameKeys(doc);
  const prefix = base.trim() || "Layer";
  let n = 1;
  while (used.has(layerNameKey(`${prefix} ${n}`))) {
    n += 1;
  }
  return `${prefix} ${n}`;
}

/** Photoshop-style copy names: "Name copy", then "Name copy 2". */
export function nextCopyLayerName(doc: ImageDocument, sourceName: string): string {
  const used = usedLayerNameKeys(doc);
  const trimmed = sourceName.trim() || "Layer";
  const copyMatch = /^(.*?) copy(?: (\d+))?$/i.exec(trimmed);
  const stem = (copyMatch ? copyMatch[1] : trimmed).trim() || "Layer";
  const first = `${stem} copy`;
  if (!used.has(layerNameKey(first))) {
    return first;
  }
  let n = 2;
  while (used.has(layerNameKey(`${stem} copy ${n}`))) {
    n += 1;
  }
  return `${stem} copy ${n}`;
}

export function renameLayer(doc: ImageDocument, layerId: string, name: string): boolean {
  const layer = doc.layers.find((item) => item.id === layerId);
  if (!layer) {
    return false;
  }
  const next = name.replace(/\s+/g, " ").trim();
  if (!next || next === layer.name) {
    return false;
  }
  layer.name = next;
  return true;
}

export function addLayer(doc: ImageDocument, name?: string): ImageLayer {
  const resolved = name && name.trim() ? name.trim() : nextUniqueLayerName(doc);
  const layer = createLayer(doc.width, doc.height, { name: resolved, kind: "raster", groupDepth: 0, editable: true });
  const index = getActiveLayerIndex(doc);
  const insertAt = layerBlockEnd(doc, layerRootStart(doc, index));
  doc.layers.splice(insertAt, 0, layer);
  doc.activeLayerId = layer.id;
  return layer;
}

export function duplicateLayer(doc: ImageDocument): ImageLayer | undefined {
  const index = getActiveLayerIndex(doc);
  const source = doc.layers[index];
  if (!source || !isRasterLayer(source)) {
    return undefined;
  }
  const copy = cloneLayer(source);
  copy.id = allocLayerId();
  copy.name = nextCopyLayerName(doc, source.name);
  doc.layers.splice(index + 1, 0, copy);
  doc.activeLayerId = copy.id;
  return copy;
}

export function layerBlockEnd(doc: ImageDocument, index: number): number {
  const depth = doc.layers[index]?.groupDepth || 0;
  let end = index + 1;
  while (end < doc.layers.length && (doc.layers[end].groupDepth || 0) > depth) {
    end += 1;
  }
  return end;
}

function layerRootStart(doc: ImageDocument, index: number): number {
  let start = Math.max(0, index);
  while (start > 0 && (doc.layers[start].groupDepth || 0) > 0) {
    start -= 1;
  }
  return start;
}

export function canDeleteLayer(doc: ImageDocument): boolean {
  if (doc.layers.length <= 1) {
    return false;
  }
  const index = getActiveLayerIndex(doc);
  const removed = layerBlockEnd(doc, index) - index;
  return doc.layers.length - removed >= 1;
}

export function deleteLayer(doc: ImageDocument): boolean {
  if (!canDeleteLayer(doc)) {
    return false;
  }
  const index = getActiveLayerIndex(doc);
  const end = layerBlockEnd(doc, index);
  doc.layers.splice(index, end - index);
  const next = doc.layers[Math.min(index, doc.layers.length - 1)];
  doc.activeLayerId = next.id;
  return true;
}

export function canMoveLayer(doc: ImageDocument, direction: 1 | -1): boolean {
  const index = getActiveLayerIndex(doc);
  const depth = doc.layers[index]?.groupDepth || 0;
  const end = layerBlockEnd(doc, index);
  if (direction === 1) {
    if (end >= doc.layers.length) {
      return false;
    }
    return (doc.layers[end].groupDepth || 0) === depth;
  }
  if (index <= 0) {
    return false;
  }
  let prev = index - 1;
  while (prev > 0 && (doc.layers[prev].groupDepth || 0) > depth) {
    prev -= 1;
  }
  return (doc.layers[prev].groupDepth || 0) === depth;
}

export function moveLayer(doc: ImageDocument, direction: 1 | -1): boolean {
  if (!canMoveLayer(doc, direction)) {
    return false;
  }
  const index = getActiveLayerIndex(doc);
  const depth = doc.layers[index].groupDepth || 0;
  const end = layerBlockEnd(doc, index);
  if (direction === 1) {
    const nextEnd = layerBlockEnd(doc, end);
    const block = doc.layers.splice(index, end - index);
    doc.layers.splice(index + (nextEnd - end), 0, ...block);
    return true;
  }
  let prev = index - 1;
  while (prev > 0 && (doc.layers[prev].groupDepth || 0) > depth) {
    prev -= 1;
  }
  const block = doc.layers.splice(index, end - index);
  doc.layers.splice(prev, 0, ...block);
  return true;
}

export function mergeDown(doc: ImageDocument): boolean {
  const index = getActiveLayerIndex(doc);
  if (index <= 0) {
    return false;
  }
  const upper = doc.layers[index];
  const lower = doc.layers[index - 1];
  if (!isRasterLayer(upper) || !isRasterLayer(lower)) {
    return false;
  }
  if (upper.visible) {
    compositeLayer(lower.pixels, upper.pixels, upper.opacity, upper.blend);
  }
  doc.layers.splice(index, 1);
  doc.activeLayerId = lower.id;
  clearPsdPassthrough(doc);
  return true;
}

export function flattenLayers(doc: ImageDocument): void {
  const flat = flattenDocument(doc);
  const layer = createLayer(doc.width, doc.height, { name: "Background", pixels: flat });
  doc.layers = [layer];
  doc.activeLayerId = layer.id;
  clearPsdPassthrough(doc);
}

/** Drop the original PSD tree. Geometry rebuilds also drop non-raster rows. */
export function clearPsdPassthrough(doc: ImageDocument, options?: { dropNonRaster?: boolean }): void {
  if (!doc.psd && !options?.dropNonRaster) {
    return;
  }
  doc.psd = undefined;
  if (!options?.dropNonRaster) {
    return;
  }
  const rasters = doc.layers.filter(isRasterLayer);
  if (rasters.length === doc.layers.length) {
    return;
  }
  if (rasters.length) {
    doc.layers = rasters;
    for (let i = 0; i < doc.layers.length; i++) {
      doc.layers[i].groupDepth = 0;
    }
  } else {
    const layer = createLayer(doc.width, doc.height, { name: "Background" });
    doc.layers = [layer];
  }
  if (!doc.layers.some((layer) => layer.id === doc.activeLayerId)) {
    doc.activeLayerId = doc.layers[doc.layers.length - 1].id;
  }
}

export function selectionSize(doc: ImageDocument): number {
  return doc.width * doc.height;
}

export function createSelectionMask(doc: ImageDocument, fill = 0): Uint8Array {
  const mask = new Uint8Array(selectionSize(doc));
  if (fill) {
    mask.fill(fill);
  }
  return mask;
}

export function selectAll(doc: ImageDocument): void {
  const mask = createSelectionMask(doc, 255);
  doc.selection = mask;
}

export function deselect(doc: ImageDocument): void {
  doc.selection = null;
}

export function invertSelection(doc: ImageDocument): void {
  if (!doc.selection) {
    selectAll(doc);
    return;
  }
  for (let i = 0; i < doc.selection.length; i++) {
    doc.selection[i] = doc.selection[i] ? 0 : 255;
  }
}

export function clampRect(doc: ImageDocument, rect: ImageRect): ImageRect {
  const x = Math.max(0, Math.min(doc.width, Math.round(rect.x)));
  const y = Math.max(0, Math.min(doc.height, Math.round(rect.y)));
  const x2 = Math.max(0, Math.min(doc.width, Math.round(rect.x + rect.w)));
  const y2 = Math.max(0, Math.min(doc.height, Math.round(rect.y + rect.h)));
  return {
    x: Math.min(x, x2),
    y: Math.min(y, y2),
    w: Math.abs(x2 - x),
    h: Math.abs(y2 - y),
  };
}

export function setSelectionRect(doc: ImageDocument, rect: ImageRect): void {
  const r = clampRect(doc, rect);
  if (r.w <= 0 || r.h <= 0) {
    doc.selection = null;
    return;
  }
  const mask = createSelectionMask(doc, 0);
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      mask[y * doc.width + x] = 255;
    }
  }
  doc.selection = mask;
}

export function isSelected(doc: ImageDocument, x: number, y: number): boolean {
  if (!doc.selection) {
    return true;
  }
  return !!doc.selection[y * doc.width + x];
}

export function rgbaAt(pixels: Uint8ClampedArray, width: number, x: number, y: number): ImageRgba {
  const i = (y * width + x) * 4;
  return { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: pixels[i + 3] };
}
