/**
 * Script ResRef browser modal state.
 *
 * @file ModalScriptBrowserState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ModalScriptBrowser } from "@/apps/forge/components/modal/ModalScriptBrowser";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import {
  ScriptCatalogEntry,
  mergeScriptCatalog,
  scriptResRefFromPath,
} from "@/apps/forge/helpers/scriptResRefCatalog";
import { sanitizeResRef } from "@/apps/forge/helpers/UTxEditorHelpers";
import * as KotOR from "@/apps/forge/KotOR";

export class ModalScriptBrowserState extends ModalState {
  static keyCache: string[] | null = null;

  items: ScriptCatalogEntry[] = [];
  filteredItems: ScriptCatalogEntry[] = [];
  searchQuery: string = "";
  onScriptSelect?: (resref: string) => void;

  constructor(onScriptSelect?: (resref: string) => void) {
    super();
    this.title = "Script Browser";
    this.onScriptSelect = onScriptSelect;
    this.setView(<ModalScriptBrowser modal={this} />);
  }

  static loadKeyResrefs(): string[] {
    if (ModalScriptBrowserState.keyCache) {
      return ModalScriptBrowserState.keyCache;
    }
    const resrefs: string[] = [];
    const keys = KotOR.KEYManager?.Key?.keys;
    if (!Array.isArray(keys)) {
      ModalScriptBrowserState.keyCache = resrefs;
      return resrefs;
    }
    const ncs = KotOR.ResourceTypes.ncs;
    const nss = KotOR.ResourceTypes.nss;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.resType === ncs || key.resType === nss) {
        resrefs.push(key.resRef);
      }
    }
    ModalScriptBrowserState.keyCache = resrefs;
    return resrefs;
  }

  static invalidateKeyCache(): void {
    ModalScriptBrowserState.keyCache = null;
  }

  applyFilters() {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredItems = this.items.slice();
      return;
    }
    this.filteredItems = this.items.filter((item) => item.resref.toLowerCase().includes(query));
  }

  async loadScripts() {
    try {
      const [override, project] = await Promise.all([
        listDirectoryScriptResrefs(() => KotOR.GameFileSystem.readdir("Override", { recursive: true })),
        listDirectoryScriptResrefs(async () => {
          if (!ProjectFileSystem.hasRoot()) {
            return [];
          }
          return ProjectFileSystem.readdir("", { recursive: true });
        }),
      ]);
      this.items = mergeScriptCatalog([
        { source: "game", resrefs: ModalScriptBrowserState.loadKeyResrefs() },
        { source: "override", resrefs: override },
        { source: "project", resrefs: project },
      ]);
      this.applyFilters();
      this.processEventListener("onItemsLoaded", [this]);
    } catch (error) {
      console.error("Failed to load scripts", error);
      this.items = [];
      this.filteredItems = [];
      this.processEventListener("onItemsLoaded", [this]);
    }
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
    this.applyFilters();
    this.processEventListener("onSearchChanged", [this]);
  }

  selectScript(item: ScriptCatalogEntry | string) {
    const raw = typeof item === "string" ? item : item.resref;
    const resref = sanitizeResRef(raw);
    if (this.onScriptSelect) {
      this.onScriptSelect(resref);
    }
    this.close();
  }
}

async function listDirectoryScriptResrefs(read: () => Promise<string[]>): Promise<string[]> {
  try {
    const entries = await read();
    const resrefs: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const resref = scriptResRefFromPath(String(entries[i] || ""));
      if (resref) {
        resrefs.push(resref);
      }
    }
    return resrefs;
  } catch {
    return [];
  }
}
