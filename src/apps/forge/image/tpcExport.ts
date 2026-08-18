/**
 * TPC buffer writer from display-space RGBA + TXI text.
 *
 * @file tpcExport.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ENCODING } from "@/enums/graphics/tpc/Encoding";
import { TXIPROCEDURETYPE } from "@/enums/graphics/txi/TXIPROCEDURETYPE";
import { TXITexType } from "@/enums/graphics/txi/TXITexType";
import { TPCObject } from "@/resource/TPCObject";
import { TXI } from "@/resource/TXI";
import { PixelManager } from "@/utility/PixelManager";
import { displayRgbaToTpc, hasMeaningfulAlpha } from "@/apps/forge/image/imageIo";
import {
  DEFAULT_ENCODE_POLICY,
  type ImageEncodePolicy,
  type ImageTpcFormat,
} from "@/apps/forge/image/imageTypes";

const CUBE_FACE_ROTATIONS_CW = [3, 1, 0, 2, 0, 0];

function rotateRgbaCW(pixels: Uint8Array, width: number, height: number, turns: number): Uint8Array {
  let buf = new Uint8Array(pixels);
  let w = width;
  let h = height;
  const count = ((turns % 4) + 4) % 4;
  for (let i = 0; i < count; i++) {
    buf = PixelManager.Rotate90deg(buf, 4, w, h);
    const next = w;
    w = h;
    h = next;
  }
  return buf;
}

function unrotateCubemapStrip(rgba: Uint8Array, faceSize: number): Uint8Array {
  const out = new Uint8Array(faceSize * faceSize * 6 * 4);
  for (let face = 0; face < 6; face++) {
    const src = TPCObject.extractRgbaRect(rgba, faceSize, 0, face * faceSize, faceSize, faceSize);
    const loadTurns = CUBE_FACE_ROTATIONS_CW[face];
    const saveTurns = (4 - loadTurns) % 4;
    const restored = rotateRgbaCW(src, faceSize, faceSize, saveTurns);
    out.set(restored, face * faceSize * faceSize * 4);
  }
  return out;
}

export function encodePolicyFromTpc(tpc: TPCObject): ImageEncodePolicy {
  return {
    ...DEFAULT_ENCODE_POLICY,
    format: formatFromTpcHeader(tpc),
    alphaTest: Number.isFinite(tpc.header.alphaTest) ? tpc.header.alphaTest : 1.0,
    isCubemap: !!tpc.header.isCubemap || tpc.txi?.textureType === TXITexType.ENVMAP,
    mipPolicy: tpc.header.mipMapCount <= 1 ? "single-level" : "full-chain",
  };
}

export function formatFromTpcHeader(tpc: TPCObject): ImageTpcFormat {
  if (tpc.header.compressed) {
    return tpc.header.encoding == ENCODING.RGBA ? "dxt5" : "dxt1";
  }
  switch (tpc.header.encoding) {
    case ENCODING.GRAY:
      return "gray";
    case ENCODING.RGB:
      return "rgb";
    case ENCODING.BGRA:
      return "bgra";
    case ENCODING.RGBA:
    default:
      return "rgba";
  }
}

export function resolveTpcEncoding(
  policy: ImageEncodePolicy,
  rgba: Uint8Array | Uint8ClampedArray,
): { encoding: ENCODING; compressed: boolean } {
  switch (policy.format) {
    case "dxt1":
      return { encoding: ENCODING.RGB, compressed: true };
    case "dxt5":
      return { encoding: ENCODING.RGBA, compressed: true };
    case "rgb":
      return { encoding: ENCODING.RGB, compressed: false };
    case "rgba":
      return { encoding: ENCODING.RGBA, compressed: false };
    case "gray":
      return { encoding: ENCODING.GRAY, compressed: false };
    case "bgra":
      return { encoding: ENCODING.BGRA, compressed: false };
    case "auto":
    default:
      return hasMeaningfulAlpha(rgba, policy)
        ? { encoding: ENCODING.RGBA, compressed: true }
        : { encoding: ENCODING.RGB, compressed: true };
  }
}

export function cycleGridFromTxi(txiText: string): { numx: number; numy: number } | undefined {
  const txi = new TXI(txiText || "");
  if (txi.procedureType != TXIPROCEDURETYPE.CYCLE || txi.numx <= 0 || txi.numy <= 0) {
    return undefined;
  }
  return { numx: txi.numx, numy: txi.numy };
}

export function buildTpcExportBuffer(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  txiText: string,
  policy: ImageEncodePolicy,
): Uint8Array {
  const fileRgba = displayRgbaToTpc(rgba, width, height);
  const cycle = cycleGridFromTxi(txiText);
  const cubemap = !!policy.isCubemap && !cycle && height === width * 6;
  const packed = cubemap ? unrotateCubemapStrip(fileRgba, width) : fileRgba;
  const resolved = resolveTpcEncoding(policy, rgba);
  return TPCObject.toExportBuffer({
    rgba: packed,
    width,
    height,
    encoding: resolved.encoding,
    compressed: resolved.compressed,
    alphaTest: policy.alphaTest,
    mipMapCount: policy.mipPolicy === "single-level" ? 1 : undefined,
    isCubemap: cubemap,
    cycle,
    txi: txiText,
  });
}
