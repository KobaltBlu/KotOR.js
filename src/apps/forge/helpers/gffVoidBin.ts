/**
 * Helpers for GFF VOID binary payloads.
 *
 * @file gffVoidBin.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GFFField } from "@/resource/GFFField";
import { clampGffLabel } from "@/apps/forge/helpers/gffFieldValue";

export function voidBinFileName(label: string): string {
  const base = clampGffLabel(label).replace(/[<>:"/\\|?*\s]/g, "") || "void";
  return base.toLowerCase().endsWith(".bin") ? base : `${base}.bin`;
}

export function gffVoidBytes(field: GFFField): Uint8Array {
  const data = field.getVoid() || field.data;
  return data instanceof Uint8Array ? data : new Uint8Array(0);
}
