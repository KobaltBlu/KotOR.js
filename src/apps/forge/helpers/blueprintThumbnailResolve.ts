/**
 * Resolve UT* blueprint GFF bytes from game / override / project sources.
 *
 * @file blueprintThumbnailResolve.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as KotOR from "@/apps/forge/KotOR";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { sanitizeResRef } from "@/apps/forge/helpers/UTxEditorHelpers";
import type { BlueprintItem, BlueprintType } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";

export async function resolveBlueprintBuffer(
  item: BlueprintItem,
  type: BlueprintType
): Promise<Uint8Array | undefined> {
  if (item.gff) {
    try {
      return item.gff.getExportBuffer();
    } catch {
      /* fall through */
    }
  }

  const resref = sanitizeResRef(item.resref || "");
  if (!resref) {
    return undefined;
  }

  if (item.path && ProjectFileSystem.hasRoot()) {
    try {
      const fromProject = await ProjectFileSystem.readFile(item.path);
      if (fromProject?.byteLength) {
        return fromProject;
      }
    } catch {
      /* fall through */
    }
  }

  if (item.path) {
    try {
      const rel = String(item.path).replace(/\\/g, "/");
      const fromOverride = await KotOR.GameFileSystem.readFile(
        rel.startsWith("Override/") ? rel : `Override/${rel.split("/").pop()}`
      );
      if (fromOverride?.byteLength) {
        return fromOverride;
      }
    } catch {
      /* fall through */
    }
  }

  const resType = KotOR.ResourceTypes[type];
  if (resType == null) {
    return undefined;
  }
  try {
    return await KotOR.ResourceLoader.loadResource(resType, resref);
  } catch {
    return undefined;
  }
}
