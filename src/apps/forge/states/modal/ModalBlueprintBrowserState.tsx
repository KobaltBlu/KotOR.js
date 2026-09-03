/**
 * Blueprint browser modal state — KEY / Override / project UT* templates.
 *
 * @file ModalBlueprintBrowserState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ModalBlueprintBrowser } from "@/apps/forge/components/modal/ModalBlueprintBrowser";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import { invalidateBlueprintSuggestCache } from "@/apps/forge/helpers/blueprintResRefSuggest";
import { invalidateBlueprintThumbnailCache } from "@/apps/forge/helpers/blueprintThumbnailCache";
import { resolveBlueprintBuffer } from "@/apps/forge/helpers/blueprintThumbnailResolve";
import {
  BlueprintCatalogEntry,
  BlueprintCatalogSource,
  blueprintResRefFromPath,
  mergeBlueprintCatalog,
} from "@/apps/forge/helpers/blueprintCatalog";
import * as KotOR from "@/apps/forge/KotOR";

export type BlueprintType = "utc" | "utd" | "ute" | "uti" | "utp" | "utm" | "uts" | "utt" | "utw";

export interface BlueprintItem {
  resref: string;
  localizedName: string;
  source?: BlueprintCatalogSource;
  path?: string;
  gff?: KotOR.GFFObject;
}

const BLUEPRINT_TYPE_LABELS: Record<BlueprintType, string> = {
  utc: "Creatures",
  utd: "Doors",
  ute: "Encounters",
  uti: "Items",
  utp: "Placeables",
  utm: "Stores",
  uts: "Sounds",
  utt: "Triggers",
  utw: "Waypoints",
};

export class ModalBlueprintBrowserState extends ModalState {
  static gameCache: Map<BlueprintType, BlueprintItem[]> = new Map();
  static gameCacheLoaded: Map<BlueprintType, boolean> = new Map();

  selectedBlueprintType: BlueprintType;
  items: BlueprintItem[] = [];
  filteredItems: BlueprintItem[] = [];
  searchQuery: string = "";
  onBlueprintSelect?: (blueprint: BlueprintItem, type: BlueprintType) => void;

  static invalidateCache(): void {
    ModalBlueprintBrowserState.gameCache = new Map();
    ModalBlueprintBrowserState.gameCacheLoaded = new Map();
    ForgeGameObject.invalidateProjectTemplatePathCache();
    invalidateBlueprintSuggestCache();
    void invalidateBlueprintThumbnailCache();
  }

  constructor(blueprintType: BlueprintType, onBlueprintSelect?: (blueprint: BlueprintItem, type: BlueprintType) => void) {
    super();
    this.selectedBlueprintType = blueprintType;
    this.title = `Blueprint Browser - ${BLUEPRINT_TYPE_LABELS[blueprintType]}`;
    this.onBlueprintSelect = onBlueprintSelect;
    this.setView(<ModalBlueprintBrowser modal={this} />);
    void this.loadBlueprints();
  }

  async loadGameBlueprints(type: BlueprintType): Promise<BlueprintItem[]> {
    if (ModalBlueprintBrowserState.gameCacheLoaded.get(type)) {
      return (ModalBlueprintBrowserState.gameCache.get(type) || []).slice(0);
    }

    const items: BlueprintItem[] = [];
    const resType = KotOR.ResourceTypes[type];
    if (!resType) {
      return items;
    }

    const blueprintKeys = (KotOR.KEYManager?.Key?.keys || []).filter(
      (key: KotOR.IKEYEntry) => key.resType === resType
    );

    for (const key of blueprintKeys) {
      try {
        const buffer = await KotOR.KEYManager.Key.getFileBuffer(key);
        if (!buffer) continue;

        const gff = new KotOR.GFFObject(buffer);
        gff.parse(buffer);
        const root = gff.RootNode;
        if (!root) continue;

        let localizedName = "";
        if (root.hasField("LocalizedName")) {
          const localizedNameField = root.getFieldByLabel("LocalizedName");
          const locString = localizedNameField?.getCExoLocString();
          if (locString) {
            localizedName = locString.getValue() || "";
          }
        }
        if (!localizedName && root.hasField("FirstName")) {
          const firstNameField = root.getFieldByLabel("FirstName");
          const locString = firstNameField?.getCExoLocString();
          if (locString) {
            localizedName = locString.getValue() || "";
          }
        }
        if (!localizedName && root.hasField("Tag")) {
          localizedName = root.getFieldByLabel("Tag").getValue() || "";
        }
        if (!localizedName) {
          localizedName = key.resRef;
        }

        items.push({
          resref: key.resRef,
          localizedName,
          source: "game",
          gff,
        });
      } catch (error) {
        console.error(`Failed to load ${type}: ${key.resRef}`, error);
      }
    }

    ModalBlueprintBrowserState.gameCache.set(type, items.slice(0));
    ModalBlueprintBrowserState.gameCacheLoaded.set(type, true);
    return items;
  }

  async loadBlueprints() {
    const type = this.selectedBlueprintType;
    try {
      const [gameItems, overrideEntries, projectEntries] = await Promise.all([
        this.loadGameBlueprints(type),
        listDirectoryBlueprintEntries(
          () => KotOR.GameFileSystem.readdir("Override", { recursive: true }),
          type,
          async (rel) => KotOR.GameFileSystem.readFile(rel)
        ),
        listDirectoryBlueprintEntries(
          async () => {
            if (!ProjectFileSystem.hasRoot()) {
              return [];
            }
            return ProjectFileSystem.readdir("", { recursive: true });
          },
          type,
          async (rel) => ProjectFileSystem.readFile(rel)
        ),
      ]);

      const merged = mergeBlueprintCatalog([
        {
          source: "game",
          entries: gameItems.map((item) => ({
            resref: item.resref,
            localizedName: item.localizedName,
          })),
        },
        { source: "override", entries: overrideEntries },
        { source: "project", entries: projectEntries },
      ]);

      const gameByResref = new Map(gameItems.map((item) => [item.resref.toLowerCase(), item]));
      this.items = merged.map((entry: BlueprintCatalogEntry) => {
        const game = gameByResref.get(entry.resref.toLowerCase());
        return {
          resref: entry.resref,
          localizedName: entry.localizedName || game?.localizedName || entry.resref,
          source: entry.source,
          path: entry.path,
          gff: entry.source === "game" ? game?.gff : undefined,
        };
      });
      this.filteredItems = this.items.slice(0);
      await Promise.resolve();
      this.processEventListener("onBlueprintsLoaded", [this]);
    } catch (error) {
      console.error(`Failed to load ${type} blueprints`, error);
      this.items = [];
      this.filteredItems = [];
      this.processEventListener("onBlueprintsLoaded", [this]);
    }
  }

  setSearchQuery(query: string) {
    this.searchQuery = query.toLowerCase();
    this.filteredItems = this.items.filter(
      (item) =>
        item.resref.toLowerCase().includes(this.searchQuery) ||
        item.localizedName.toLowerCase().includes(this.searchQuery)
    );
    this.processEventListener("onSearchChanged", [this]);
  }

  selectBlueprint(blueprint: BlueprintItem) {
    if (this.onBlueprintSelect) {
      this.onBlueprintSelect(blueprint, this.selectedBlueprintType);
    }
    this.close();
  }
}

export { resolveBlueprintBuffer };

async function listDirectoryBlueprintEntries(
  read: () => Promise<string[]>,
  type: BlueprintType,
  readFile: (path: string) => Promise<Uint8Array>
): Promise<Array<{ resref: string; localizedName?: string; path?: string }>> {
  try {
    const entries = await read();
    const out: Array<{ resref: string; localizedName?: string; path?: string }> = [];
    for (let i = 0; i < entries.length; i++) {
      const rel = String(entries[i] || "");
      const resref = blueprintResRefFromPath(rel, type);
      if (!resref) {
        continue;
      }
      let localizedName = resref;
      try {
        const buffer = await readFile(rel);
        if (buffer?.byteLength) {
          const gff = new KotOR.GFFObject(buffer);
          gff.parse(buffer);
          const root = gff.RootNode;
          if (root?.hasField("LocalizedName")) {
            localizedName = root.getFieldByLabel("LocalizedName").getCExoLocString()?.getValue() || localizedName;
          } else if (root?.hasField("FirstName")) {
            localizedName = root.getFieldByLabel("FirstName").getCExoLocString()?.getValue() || localizedName;
          } else if (root?.hasField("Tag")) {
            localizedName = root.getFieldByLabel("Tag").getValue() || localizedName;
          }
        }
      } catch {
        // Keep resref as display name when GFF parse fails.
      }
      out.push({ resref, localizedName, path: rel });
    }
    return out;
  } catch {
    return [];
  }
}
