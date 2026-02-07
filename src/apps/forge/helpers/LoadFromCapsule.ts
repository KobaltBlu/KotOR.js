/**
 * LoadFromCapsule – load resource list and data from ERF/MOD or RIM buffer.
 * Used by ModalLoadFromModule to pick a resource from a capsule file.
 */

import { ERFObject } from "../../../resource/ERFObject";
import { RIMObject } from "../../../resource/RIMObject";
import { ResourceTypes } from "../../../resource/ResourceTypes";

export interface CapsuleResourceEntry {
  resref: string;
  resType: number;
  ext: string;
}

export interface LoadFromCapsuleResult {
  type: "erf" | "rim";
  entries: CapsuleResourceEntry[];
  getResourceBuffer: (resref: string, resType: number) => Promise<Uint8Array>;
  /** Optional file path (Electron) or filename (browser) for display */
  filepath?: string;
}

function getExtFromResType(resType: number): string {
  const ext = (ResourceTypes as any).getKeyByValue?.(resType);
  return typeof ext === "string" ? ext : "res";
}

/**
 * Load an ERF/MOD or RIM buffer and return resource list + getter.
 * Buffer must start with "MOD ", "ERF ", or "RIM ".
 */
export async function loadFromCapsuleBuffer(
  buffer: Uint8Array,
  supportedTypes?: number[] | null
): Promise<LoadFromCapsuleResult | null> {
  if (buffer.length < 4) return null;
  const sig = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);

  if (sig === "MOD " || sig === "ERF ") {
    const erf = new ERFObject(buffer);
    await erf.load();
    const keyList = (erf as any).keyList as Array<{ resRef: string; resId: number; resType: number }>;
    if (!keyList || !keyList.length) return null;
    const entries: CapsuleResourceEntry[] = keyList.map((k) => ({
      resref: (k.resRef || "").toLowerCase(),
      resType: k.resType,
      ext: getExtFromResType(k.resType),
    }));
    const filtered = supportedTypes?.length
      ? entries.filter((e) => supportedTypes.includes(e.resType))
      : entries;
    return {
      type: "erf",
      entries: filtered,
      getResourceBuffer: (resref: string, resType: number) =>
        erf.getResourceBufferByResRef(resref, resType),
    };
  }

  if (sig === "RIM ") {
    const rim = new RIMObject(buffer);
    await rim.load();
    const resources = (rim as any).resources as Array<{ resRef?: string; resType: number }>;
    if (!resources || !resources.length) return null;
    const entries: CapsuleResourceEntry[] = resources.map((r: any) => ({
      resref: (r.resRef || "").toLowerCase(),
      resType: r.resType,
      ext: getExtFromResType(r.resType),
    }));
    const filtered = supportedTypes?.length
      ? entries.filter((e) => supportedTypes.includes(e.resType))
      : entries;
    return {
      type: "rim",
      entries: filtered,
      getResourceBuffer: (resref: string, resType: number) =>
        rim.getResourceBufferByResRef(resref, resType),
    };
  }

  return null;
}
