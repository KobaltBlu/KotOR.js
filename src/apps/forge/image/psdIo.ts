/**
 * Photoshop PSD read/write for the Forge image editor.
 * Raster layers Forge can edit are patched onto the original ag-psd tree;
 * groups, masks, effects, and other extra fields round-trip unless geometry
 * ops drop passthrough.
 *
 * @file psdIo.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { initializeCanvas, readPsd, writePsdUint8Array, type BlendMode, type Layer, type PixelArray, type Psd } from "ag-psd";
import { flattenDocument } from "@/apps/forge/image/imageBlend";
import {
  allocLayerId,
  createDocumentFromRgba,
  createLayer,
  isRasterLayer,
  transparentPixels,
} from "@/apps/forge/image/imageDocument";
import { copyRect } from "@/apps/forge/image/imageOps";
import {
  DEFAULT_ENCODE_POLICY,
  DEFAULT_RGBA_BLACK,
  DEFAULT_RGBA_WHITE,
  type ImageBlendMode,
  type ImageDocument,
  type ImageLayer,
  type ImagePsdPassthrough,
} from "@/apps/forge/image/imageTypes";

const PSD_READ_OPTIONS = { useImageData: true, useRawThumbnail: true } as const;
const PSD_WRITE_OPTIONS = { trimImageData: false } as const;

function ensurePsdImageData(): void {
  if (typeof document !== "undefined") {
    return;
  }
  initializeCanvas(
    (width: number, height: number) => {
      throw new Error(`PSD canvas (${width}x${height}) is not available in this environment`);
    },
    (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(Math.max(0, width) * Math.max(0, height) * 4),
      colorSpace: "srgb",
    } as ImageData),
  );
}

ensurePsdImageData();

const SECTION_OPEN_FOLDER = 1;
const SECTION_CLOSED_FOLDER = 2;

const FORGE_TO_PSD: Record<ImageBlendMode, BlendMode> = {
  normal: "normal",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  add: "linear dodge",
  darken: "darken",
  lighten: "lighten",
};

const PSD_TO_FORGE: Partial<Record<BlendMode, ImageBlendMode>> = {
  normal: "normal",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  "linear dodge": "add",
  darken: "darken",
  lighten: "lighten",
};

function psdBufferLike(buffer: Uint8Array): Uint8Array {
  return buffer;
}

function isGroupNode(node: Layer): boolean {
  if (Array.isArray(node.children)) {
    return true;
  }
  const divider = node.sectionDivider?.type;
  return divider === SECTION_OPEN_FOLDER || divider === SECTION_CLOSED_FOLDER;
}

function isPassthroughNode(node: Layer): boolean {
  if (node.text || node.placedLayer || node.adjustment) {
    return true;
  }
  if (node.vectorFill && !node.imageData && !node.canvas) {
    return true;
  }
  return false;
}

function classifyNode(node: Layer): ImageLayer["kind"] {
  if (isGroupNode(node)) {
    return "group";
  }
  if (isPassthroughNode(node)) {
    return "passthrough";
  }
  return "raster";
}

function mapBlendFromPsd(mode?: BlendMode): { blend: ImageBlendMode; foreignBlend?: string } {
  if (!mode || mode === "normal") {
    return { blend: "normal" };
  }
  const mapped = PSD_TO_FORGE[mode];
  if (mapped) {
    return { blend: mapped };
  }
  return { blend: "normal", foreignBlend: mode };
}

function applyBlendToNode(node: Layer, layer: ImageLayer): void {
  if (layer.foreignBlend && layer.blend === "normal") {
    node.blendMode = layer.foreignBlend as BlendMode;
    return;
  }
  node.blendMode = FORGE_TO_PSD[layer.blend];
}

function pixelArrayToRgba8(data: PixelArray, width: number, height: number): Uint8ClampedArray {
  const count = Math.max(0, width) * Math.max(0, height) * 4;
  if (count <= 0) {
    return new Uint8ClampedArray(0);
  }
  if (data instanceof Uint8ClampedArray) {
    if (data.length === count) {
      return new Uint8ClampedArray(data);
    }
    const out = new Uint8ClampedArray(count);
    out.set(data.subarray(0, Math.min(data.length, count)));
    return out;
  }
  if (data instanceof Uint8Array) {
    const out = new Uint8ClampedArray(count);
    out.set(data.subarray(0, Math.min(data.length, count)));
    return out;
  }
  const out = new Uint8ClampedArray(count);
  const n = Math.min(data.length, count);
  if (data instanceof Uint16Array) {
    for (let i = 0; i < n; i++) {
      out[i] = data[i] / 257;
    }
    return out;
  }
  for (let i = 0; i < n; i++) {
    const value = data[i];
    out[i] = Math.round(Math.max(0, Math.min(1, value)) * 255);
  }
  return out;
}

function expandLayerPixels(node: Layer, docW: number, docH: number): Uint8ClampedArray {
  const out = transparentPixels(docW, docH);
  const imageData = node.imageData;
  if (!imageData || imageData.width <= 0 || imageData.height <= 0) {
    return out;
  }
  const src = pixelArrayToRgba8(imageData.data, imageData.width, imageData.height);
  copyRect(
    src,
    imageData.width,
    imageData.height,
    0,
    0,
    imageData.width,
    imageData.height,
    out,
    docW,
    node.left || 0,
    node.top || 0,
  );
  return out;
}

function convertNodeImageDataTo8Bit(node: Layer): void {
  if (node.imageData && node.imageData.data && !(node.imageData.data instanceof Uint8ClampedArray) && !(node.imageData.data instanceof Uint8Array)) {
    node.imageData = {
      width: node.imageData.width,
      height: node.imageData.height,
      data: pixelArrayToRgba8(node.imageData.data, node.imageData.width, node.imageData.height),
    };
  }
  const children = node.children;
  if (!children) {
    return;
  }
  for (let i = 0; i < children.length; i++) {
    convertNodeImageDataTo8Bit(children[i]);
  }
}

function convertPsdTo8Bit(psd: Psd, warnings: string[]): void {
  const bits = psd.bitsPerChannel || 8;
  if (bits === 8) {
    return;
  }
  warnings.push(`PSD is ${bits}-bit; converted to 8-bit for editing.`);
  psd.bitsPerChannel = 8;
  if (psd.imageData) {
    psd.imageData = {
      width: psd.imageData.width,
      height: psd.imageData.height,
      data: pixelArrayToRgba8(psd.imageData.data, psd.imageData.width, psd.imageData.height),
    };
  }
  const children = psd.children || [];
  for (let i = 0; i < children.length; i++) {
    convertNodeImageDataTo8Bit(children[i]);
  }
}

function opacityFromPsd(node: Layer): number {
  const value = node.opacity;
  if (value == null) {
    return 1;
  }
  return Math.max(0, Math.min(1, value));
}

function walkPsdChildren(
  nodes: Layer[],
  depth: number,
  docW: number,
  docH: number,
  layers: ImageLayer[],
  map: Record<string, Layer>,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const kind = classifyNode(node);
    const id = allocLayerId();
    map[id] = node;
    const blendInfo = mapBlendFromPsd(node.blendMode);
    if (kind === "group") {
      layers.push(createLayer(docW, docH, {
        id,
        name: node.name || "Group",
        visible: !node.hidden,
        opacity: opacityFromPsd(node),
        blend: blendInfo.blend,
        foreignBlend: blendInfo.foreignBlend,
        kind: "group",
        groupDepth: depth,
        editable: false,
        pixels: new Uint8ClampedArray(0),
      }));
      walkPsdChildren(node.children || [], depth + 1, docW, docH, layers, map);
      continue;
    }
    if (kind === "passthrough") {
      layers.push(createLayer(docW, docH, {
        id,
        name: node.name || "Layer",
        visible: !node.hidden,
        opacity: opacityFromPsd(node),
        blend: blendInfo.blend,
        foreignBlend: blendInfo.foreignBlend,
        kind: "passthrough",
        groupDepth: depth,
        editable: false,
        pixels: new Uint8ClampedArray(0),
      }));
      continue;
    }
    layers.push(createLayer(docW, docH, {
      id,
      name: node.name || "Layer",
      visible: !node.hidden,
      opacity: opacityFromPsd(node),
      blend: blendInfo.blend,
      foreignBlend: blendInfo.foreignBlend,
      lockTransparent: !!(node.transparencyProtected || node.protected?.transparency),
      kind: "raster",
      groupDepth: depth,
      editable: true,
      pixels: expandLayerPixels(node, docW, docH),
    }));
  }
}

function forgeLayerToPsdNode(layer: ImageLayer, doc: ImageDocument): Layer {
  const node: Layer = {
    name: layer.name,
    hidden: !layer.visible,
    opacity: Math.max(0, Math.min(1, layer.opacity)),
    blendMode: FORGE_TO_PSD[layer.blend],
    transparencyProtected: layer.lockTransparent,
  };
  if (layer.kind === "group") {
    node.children = [];
    node.opened = true;
    return node;
  }
  node.left = 0;
  node.top = 0;
  node.right = doc.width;
  node.bottom = doc.height;
  node.imageData = {
    width: doc.width,
    height: doc.height,
    data: layer.pixels,
  };
  return node;
}

function patchPsdNode(node: Layer, layer: ImageLayer, doc: ImageDocument): void {
  node.name = layer.name;
  node.hidden = !layer.visible;
  node.opacity = Math.max(0, Math.min(1, layer.opacity));
  if (!isRasterLayer(layer)) {
    if (layer.kind !== "group") {
      applyBlendToNode(node, layer);
    }
    return;
  }
  applyBlendToNode(node, layer);
  node.transparencyProtected = layer.lockTransparent;
  if (node.protected) {
    node.protected.transparency = layer.lockTransparent;
  }
  node.left = 0;
  node.top = 0;
  node.right = doc.width;
  node.bottom = doc.height;
  node.canvas = undefined;
  node.imageData = {
    width: doc.width,
    height: doc.height,
    data: layer.pixels,
  };
}

function rebuildPsdChildren(doc: ImageDocument, passthrough: ImagePsdPassthrough): Layer[] {
  const layers = doc.layers;
  const nodes = passthrough.nodes;
  let i = 0;
  const take = (parentDepth: number): Layer[] => {
    const out: Layer[] = [];
    while (i < layers.length) {
      const layer = layers[i];
      const depth = layer.groupDepth || 0;
      if (depth < parentDepth) {
        break;
      }
      i += 1;
      let node = nodes[layer.id];
      if (!node) {
        node = forgeLayerToPsdNode(layer, doc);
        nodes[layer.id] = node;
      } else {
        patchPsdNode(node, layer, doc);
      }
      if (layer.kind === "group") {
        node.children = take(depth + 1);
      }
      out.push(node);
    }
    return out;
  };
  return take(0);
}

function buildSimplePsd(doc: ImageDocument): Psd {
  const children: Layer[] = [];
  for (let i = 0; i < doc.layers.length; i++) {
    const layer = doc.layers[i];
    if (!isRasterLayer(layer)) {
      continue;
    }
    children.push(forgeLayerToPsdNode(layer, doc));
  }
  const composite = flattenDocument(doc);
  return {
    width: doc.width,
    height: doc.height,
    bitsPerChannel: 8,
    children,
    imageData: {
      width: doc.width,
      height: doc.height,
      data: composite,
    },
  };
}

function stripCanvasThumbnail(psd: Psd): void {
  const resources = psd.imageResources as { thumbnail?: unknown } | undefined;
  if (!resources || !resources.thumbnail) {
    return;
  }
  const thumb = resources.thumbnail as { getContext?: unknown };
  if (typeof thumb.getContext === "function") {
    delete resources.thumbnail;
  }
}

/**
 * Open a PSD into a Forge image document, keeping the original layer tree.
 */
export function readForgePsd(buffer: Uint8Array): ImageDocument {
  const psd = readPsd(psdBufferLike(buffer), PSD_READ_OPTIONS);
  const warnings: string[] = [];
  convertPsdTo8Bit(psd, warnings);
  for (let i = 0; i < warnings.length; i++) {
    console.warn(warnings[i]);
  }
  const width = Math.max(1, psd.width | 0);
  const height = Math.max(1, psd.height | 0);
  const children = psd.children || [];
  if (!children.length) {
    const pixels = psd.imageData
      ? pixelArrayToRgba8(psd.imageData.data, psd.imageData.width, psd.imageData.height)
      : transparentPixels(width, height);
    const doc = createDocumentFromRgba(pixels, width, height);
    return doc;
  }
  const layers: ImageLayer[] = [];
  const nodes: Record<string, Layer> = {};
  walkPsdChildren(children, 0, width, height, layers, nodes);
  if (!layers.length) {
    return createDocumentFromRgba(transparentPixels(width, height), width, height);
  }
  const rasters = layers.filter(isRasterLayer);
  const active = rasters.length ? rasters[rasters.length - 1] : layers[layers.length - 1];
  return {
    width,
    height,
    layers,
    activeLayerId: active.id,
    selection: null,
    txiText: "",
    encode: { ...DEFAULT_ENCODE_POLICY },
    foreground: { ...DEFAULT_RGBA_WHITE },
    background: { ...DEFAULT_RGBA_BLACK },
    psd: { source: psd, nodes },
  };
}

/**
 * Write a Forge image document as PSD bytes. Uses the live passthrough tree
 * when still valid; otherwise rebuilds a simple raster stack.
 */
export function writeForgePsd(doc: ImageDocument): Uint8Array {
  if (doc.psd) {
    const psd = doc.psd.source;
    psd.width = doc.width;
    psd.height = doc.height;
    psd.bitsPerChannel = 8;
    psd.children = rebuildPsdChildren(doc, doc.psd);
    psd.canvas = undefined;
    psd.imageData = {
      width: doc.width,
      height: doc.height,
      data: flattenDocument(doc),
    };
    stripCanvasThumbnail(psd);
    return writePsdUint8Array(psd, PSD_WRITE_OPTIONS);
  }
  return writePsdUint8Array(buildSimplePsd(doc), PSD_WRITE_OPTIONS);
}
