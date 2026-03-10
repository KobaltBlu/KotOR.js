/**
 * AddResourceToErf – add a resource to an existing ERF/MOD and return the new buffer.
 * Used when saving a resource into an open ERF/MOD file.
 */

import type { IERFKeyEntry } from "@/interface/resource/IERFKeyEntry";
import type { IERFResource } from "@/interface/resource/IERFResource";
import { ERFObject } from "@/resource/ERFObject";

export interface AddResourceToErfOptions {
  /** Existing ERF/MOD buffer. */
  erfBuffer: Uint8Array;
  resRef: string;
  resType: number;
  data: Uint8Array;
}

/** Resource entry that may not have data loaded yet (e.g. from buffer). */
interface ERFResourceWithOptionalData {
  offset: number;
  size: number;
  data?: Uint8Array;
}

/** Ensure all ERF resources have .data populated (from buffer) so getExportBuffer works. */
function ensureResourcesHaveData(erf: ERFObject, buffer: Uint8Array): void {
  const resources = erf.resources as ERFResourceWithOptionalData[];
  for (let i = 0; i < resources.length; i++) {
    const r = resources[i];
    if (!r.data && r.offset >= 0 && r.size > 0) {
      r.data = new Uint8Array(buffer.slice(r.offset, r.offset + r.size));
    }
  }
}

/**
 * Add a resource to an ERF/MOD buffer and return the new buffer.
 * Replaces existing resource with same resRef+resType if present.
 */
export async function addResourceToErf(options: AddResourceToErfOptions): Promise<Uint8Array> {
  const { erfBuffer, resRef, resType, data } = options;

  const erf = new ERFObject(erfBuffer);
  await erf.load();
  ensureResourcesHaveData(erf, erfBuffer);

  const normalizedRef = resRef.toLowerCase().trim();
  const keyList: IERFKeyEntry[] = erf.keyList;
  const resources: IERFResource[] = erf.resources;

  const existingIndex = keyList.findIndex(
    (k) => k.resRef.toLowerCase() === normalizedRef && k.resType === resType
  );
  if (existingIndex >= 0) {
    const resId = keyList[existingIndex].resId;
    resources[resId] = { offset: -1, size: data.length, data };
  } else {
    erf.addResource(normalizedRef, resType, data);
  }

  return erf.getExportBuffer();
}
