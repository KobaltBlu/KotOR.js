/**
 * Shared types for the Forge image editor document.
 *
 * @file imageTypes.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { Layer, Psd } from "ag-psd";

export type ImageBlendMode = "normal" | "multiply" | "screen" | "overlay" | "add" | "darken" | "lighten";

export type ImageLayerKind = "raster" | "group" | "passthrough";

export type ImageToolId = "move" | "marquee" | "crop" | "brush" | "eraser" | "fill" | "eyedropper";

export type ImageEastPane = "layers" | "encode" | "txi";

export interface ImageRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ImageTpcFormat = "auto" | "dxt1" | "dxt5" | "rgb" | "rgba" | "gray" | "bgra";

export interface ImageEncodePolicy {
  format: ImageTpcFormat;
  alphaTest: number;
  isCubemap: boolean;
  alphaPolicy: "opaque-threshold" | "strict-alpha";
  opaqueAlphaThreshold: number;
  mipPolicy: "full-chain" | "single-level";
}

export interface ImageLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blend: ImageBlendMode;
  lockTransparent: boolean;
  pixels: Uint8ClampedArray;
  kind: ImageLayerKind;
  groupDepth: number;
  editable: boolean;
  /** Original PSD blend when it is not one of Forge's modes. */
  foreignBlend?: string;
}

/** Live ag-psd tree kept so unknown Photoshop features can round-trip. */
export interface ImagePsdPassthrough {
  source: Psd;
  nodes: Record<string, Layer>;
}

export interface ImageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ImageDocument {
  width: number;
  height: number;
  layers: ImageLayer[];
  activeLayerId: string;
  selection: Uint8Array | null;
  txiText: string;
  encode: ImageEncodePolicy;
  foreground: ImageRgba;
  background: ImageRgba;
  psd?: ImagePsdPassthrough;
}

export const IMAGE_BLEND_MODES: ImageBlendMode[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "add",
  "darken",
  "lighten",
];

export const DEFAULT_ENCODE_POLICY: ImageEncodePolicy = {
  format: "auto",
  alphaTest: 1.0,
  isCubemap: false,
  alphaPolicy: "opaque-threshold",
  opaqueAlphaThreshold: 250,
  mipPolicy: "full-chain",
};

export const IMAGE_TPC_FORMATS: { id: ImageTpcFormat; label: string }[] = [
  { id: "auto", label: "Auto (DXT1 / DXT5)" },
  { id: "dxt1", label: "DXT1 (compressed RGB)" },
  { id: "dxt5", label: "DXT5 (compressed RGBA)" },
  { id: "rgb", label: "Uncompressed RGB" },
  { id: "rgba", label: "Uncompressed RGBA" },
  { id: "gray", label: "Uncompressed grayscale" },
  { id: "bgra", label: "Uncompressed BGRA" },
];

export const DEFAULT_RGBA_WHITE: ImageRgba = { r: 255, g: 255, b: 255, a: 255 };
export const DEFAULT_RGBA_BLACK: ImageRgba = { r: 0, g: 0, b: 0, a: 255 };

export const IMAGE_TOOLS: { id: ImageToolId; label: string; shortcut: string; icon: string }[] = [
  { id: "move", label: "Move", shortcut: "V", icon: "fa-up-down-left-right" },
  { id: "marquee", label: "Marquee", shortcut: "M", icon: "fa-object-ungroup" },
  { id: "crop", label: "Crop", shortcut: "C", icon: "fa-crop" },
  { id: "brush", label: "Brush", shortcut: "B", icon: "fa-paintbrush" },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: "fa-eraser" },
  { id: "fill", label: "Fill", shortcut: "G", icon: "fa-fill-drip" },
  { id: "eyedropper", label: "Eyedropper", shortcut: "I", icon: "fa-eye-dropper" },
];
