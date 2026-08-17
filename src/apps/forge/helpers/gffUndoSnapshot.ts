/**
 * Clone and restore GFF documents for editor undo snapshots.
 *
 * @file gffUndoSnapshot.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GFFObject } from "@/resource/GFFObject";

export function snapshotGff(gff?: GFFObject): Uint8Array | undefined {
  if (!gff) {
    return undefined;
  }
  return new Uint8Array(gff.getExportBuffer());
}

export function gffFromSnapshot(bytes: Uint8Array): GFFObject {
  return new GFFObject(bytes);
}
