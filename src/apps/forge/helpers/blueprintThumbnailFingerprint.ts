/**
 * Content fingerprint for blueprint browser thumbnail cache invalidation.
 *
 * @file blueprintThumbnailFingerprint.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { BlueprintType } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";

export const THUMBNAIL_MODEL_TYPES: BlueprintType[] = ["utc", "utd", "utp"];

export function isBlueprintThumbnailType(type: BlueprintType): boolean {
  return THUMBNAIL_MODEL_TYPES.includes(type);
}

/** FNV-1a 32-bit over bytes, returned as 8-char hex. */
export function fnv1aHex(buffer: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < buffer.length; i++) {
    hash ^= buffer[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildBlueprintThumbnailCacheKey(
  profileKey: string,
  type: BlueprintType,
  source: string,
  resref: string
): string {
  const profile = String(profileKey || "default").toLowerCase();
  const src = String(source || "game").toLowerCase();
  const ref = String(resref || "").toLowerCase();
  return `v2/${profile}/${type}/${src}/${ref}`;
}

function fieldNumber(root: { hasField?: (l: string) => boolean; getFieldByLabel?: (l: string) => { getValue: () => unknown } } | undefined, label: string, fallback = 0): number {
  if (!root?.hasField?.(label)) {
    return fallback;
  }
  try {
    return Number(root.getFieldByLabel!(label).getValue() ?? fallback);
  } catch {
    return fallback;
  }
}

function fieldString(root: { hasField?: (l: string) => boolean; getFieldByLabel?: (l: string) => { getValue: () => unknown } } | undefined, label: string): string {
  if (!root?.hasField?.(label)) {
    return "";
  }
  try {
    return String(root.getFieldByLabel!(label).getValue() ?? "");
  } catch {
    return "";
  }
}

/** Appearance-affecting subset plus full-buffer hash for project edits. */
export function computeBlueprintThumbnailFingerprint(type: BlueprintType, buffer: Uint8Array): string {
  const bytesHash = fnv1aHex(buffer);
  if (!buffer?.byteLength) {
    return `${type}:empty:${bytesHash}`;
  }

  let appearanceKey = "";
  try {
    // Lazy import keeps unit tests free of the full KotOR bundle.
    const KotOR = require("@/apps/forge/KotOR") as typeof import("@/apps/forge/KotOR");
    const gff = new KotOR.GFFObject(buffer);
    gff.parse(buffer);
    const root = gff.RootNode;
    if (type === "utc") {
      appearanceKey = [
        fieldNumber(root, "Appearance_Type"),
        fieldNumber(root, "BodyVariation"),
        fieldNumber(root, "TextureVar"),
        fieldString(root, "Equip_ItemList"),
        fieldString(root, "ItemList"),
      ].join("|");
    } else if (type === "utd") {
      appearanceKey = [
        fieldNumber(root, "GenericType"),
        fieldNumber(root, "Appearance"),
      ].join("|");
    } else if (type === "utp") {
      appearanceKey = String(fieldNumber(root, "Appearance"));
    }
  } catch {
    appearanceKey = "parse-failed";
  }

  return `${type}:${appearanceKey}:${bytesHash}`;
}
