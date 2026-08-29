/**
 * Estimate placement-ghost size from a blueprint's appearance model AABB.
 *
 * @file ghostBlueprintBounds.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as THREE from "three";
import * as KotOR from "@/apps/forge/KotOR";
import { GameObjectType } from "@/apps/forge/states/tabs/TabModuleEditorState";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { sanitizeResRef } from "@/apps/forge/helpers/UTxEditorHelpers";

function cleanModelName(str: string = ""): string {
  return String(str || "")
    .replace(/\0[\s\S]*$/g, "")
    .trim()
    .toLowerCase();
}

async function readTemplateBuffer(resref: string, ext: string): Promise<Uint8Array | undefined> {
  const key = `${sanitizeResRef(resref)}.${ext}`.toLowerCase();
  if (ProjectFileSystem.hasRoot()) {
    try {
      const files = await ProjectFileSystem.readdir("", { recursive: true });
      for (let i = 0; i < files.length; i++) {
        const rel = String(files[i] || "").replace(/\\/g, "/");
        const base = (rel.split("/").pop() || "").toLowerCase();
        if (base === key) {
          return await ProjectFileSystem.readFile(rel);
        }
      }
    } catch {
      /* fall through to game KEY */
    }
  }
  try {
    const resType = (KotOR.ResourceTypes as any)[ext];
    if (resType == null) {
      return undefined;
    }
    return await KotOR.ResourceLoader.loadResource(resType, sanitizeResRef(resref));
  } catch {
    return undefined;
  }
}

function modelNameFromTemplate(gameObjectType: GameObjectType, gff: KotOR.GFFObject): string | undefined {
  const root = gff.RootNode;
  if (!root) {
    return undefined;
  }
  if (gameObjectType === GameObjectType.PLACEABLE) {
    const appearance = root.hasField("Appearance") ? root.getFieldByLabel("Appearance").getValue() : 0;
    const table = KotOR.TwoDAManager.datatables.get("placeables");
    const row = table?.getRowByIndex(appearance || 0);
    return cleanModelName(row?.modelname);
  }
  if (gameObjectType === GameObjectType.DOOR) {
    const genericType = root.hasField("GenericType") ? root.getFieldByLabel("GenericType").getValue() : 0;
    const table = KotOR.TwoDAManager.datatables.get("genericdoors");
    const row = table?.getRowByIndex(genericType || 0);
    return cleanModelName(row?.modelname);
  }
  if (gameObjectType === GameObjectType.ITEM) {
    const modelVar = root.hasField("ModelVariation") ? root.getFieldByLabel("ModelVariation").getValue() : 0;
    const baseItem = root.hasField("BaseItem") ? root.getFieldByLabel("BaseItem").getValue() : 0;
    const table = KotOR.TwoDAManager.datatables.get("baseitems");
    const row = table?.getRowByIndex(baseItem || 0);
    const modelCol = `model${Math.max(0, Number(modelVar) || 0)}`;
    return cleanModelName(row?.[modelCol] || row?.defaultmodel);
  }
  if (gameObjectType === GameObjectType.CREATURE) {
    const appearanceType = root.hasField("Appearance_Type")
      ? root.getFieldByLabel("Appearance_Type").getValue()
      : 0;
    const appearance = KotOR.AppearanceManager.GetCreatureAppearanceById(appearanceType || 0);
    return cleanModelName(appearance?.modela || appearance?.race);
  }
  if (gameObjectType === GameObjectType.ROOM) {
    return cleanModelName(sanitizeResRef(String((gff as any).resref || "")));
  }
  return undefined;
}

const EXT_BY_TYPE: Partial<Record<GameObjectType, string>> = {
  [GameObjectType.CREATURE]: "utc",
  [GameObjectType.DOOR]: "utd",
  [GameObjectType.ITEM]: "uti",
  [GameObjectType.PLACEABLE]: "utp",
};

/**
 * Returns axis-aligned size of the blueprint model, or undefined if unavailable.
 */
export async function estimateBlueprintGhostSize(
  gameObjectType: GameObjectType,
  resref: string
): Promise<THREE.Vector3 | undefined> {
  const cleaned = sanitizeResRef(resref);
  if (!cleaned) {
    return undefined;
  }
  if (gameObjectType === GameObjectType.ROOM) {
    try {
      const mdl = await KotOR.MDLLoader.loader.load(cleaned);
      if (!mdl) {
        return undefined;
      }
      const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
        context: KotOR.GameState,
        castShadow: false,
        receiveShadow: false,
        manageLighting: false,
      });
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      try {
        model.dispose();
      } catch {
        /* ignore */
      }
      if (size.x > 0.01 && size.y > 0.01 && size.z > 0.01) {
        return size;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  const ext = EXT_BY_TYPE[gameObjectType];
  if (!ext) {
    return undefined;
  }
  const buffer = await readTemplateBuffer(cleaned, ext);
  if (!buffer?.byteLength) {
    return undefined;
  }
  let modelName: string | undefined;
  try {
    const gff = new KotOR.GFFObject(buffer);
    modelName = modelNameFromTemplate(gameObjectType, gff);
  } catch {
    return undefined;
  }
  if (!modelName) {
    return undefined;
  }
  try {
    const mdl = await KotOR.MDLLoader.loader.load(modelName);
    if (!mdl) {
      return undefined;
    }
    const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
      context: KotOR.GameState,
      castShadow: false,
      receiveShadow: false,
      manageLighting: false,
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    try {
      model.dispose();
    } catch {
      /* ignore */
    }
    if (size.x > 0.01 && size.y > 0.01 && size.z > 0.01) {
      return size;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
