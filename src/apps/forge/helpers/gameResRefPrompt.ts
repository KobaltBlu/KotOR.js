/**
 * ResRef fallback when Forge has no KEY/BIF catalog to browse.
 *
 * @file gameResRefPrompt.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { sanitizeResRef } from "@/apps/forge/helpers/UTxEditorHelpers";
import type { BlueprintType, BlueprintItem } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";
import type { UTIItem } from "@/apps/forge/states/modal/ModalItemBrowserState";

export const NO_GAME_RESREF_HINT =
  "Game data is not loaded. Enter a ResRef (max 16 characters).";

const BLUEPRINT_RESREF_TITLES: Record<BlueprintType, string> = {
  utc: "Creature ResRef",
  utd: "Door ResRef",
  ute: "Encounter ResRef",
  uti: "Item ResRef",
  utp: "Placeable ResRef",
  utm: "Store ResRef",
  uts: "Sound ResRef",
  utt: "Trigger ResRef",
  utw: "Waypoint ResRef",
};

export function catalogNeedsResRefPrompt(hasGameData: boolean): boolean {
  return !hasGameData;
}

export function confirmTypedResRef(raw: string): string | undefined {
  const resref = sanitizeResRef(raw);
  return resref || undefined;
}

export function blueprintResRefTitle(type: BlueprintType): string {
  return BLUEPRINT_RESREF_TITLES[type] || "Blueprint ResRef";
}

export function utiFromTypedResRef(raw: string): UTIItem {
  const resref = sanitizeResRef(raw);
  return {
    resref,
    baseItem: 0,
    localizedName: resref,
    iconResRef: "",
    equipableSlots: 0,
    droidOrHuman: 0,
  };
}

export function blueprintFromTypedResRef(raw: string): BlueprintItem {
  const resref = sanitizeResRef(raw);
  return {
    resref,
    localizedName: resref,
  };
}
