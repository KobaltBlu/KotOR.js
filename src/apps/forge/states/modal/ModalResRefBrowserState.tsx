/**
 * KEY / Override / project / stream-folder resref browser modal state.
 *
 * @file ModalResRefBrowserState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ModalResRefBrowser } from "@/apps/forge/components/modal/ModalResRefBrowser";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import {
  ResRefCatalogEntry,
  mergeResRefCatalog,
  resRefFromPath,
} from "@/apps/forge/helpers/resRefCatalog";
import { sanitizeResRef } from "@/apps/forge/helpers/UTxEditorHelpers";
import * as KotORNs from "@/apps/forge/KotOR";

export type ResRefKind = "wav" | "mdl" | "audio";

export interface ResRefKindSpec {
  title: string;
  kindLabel: string;
  extensions: string[];
  resourceTypeKeys: string[];
  streamDirs: string[];
}

export const RESREF_KIND_SPEC: Record<ResRefKind, ResRefKindSpec> = {
  wav: {
    title: "Sound Browser",
    kindLabel: "sound",
    extensions: ["wav"],
    resourceTypeKeys: ["wav"],
    streamDirs: ["streamvoice", "streamwaves", "streamsounds"],
  },
  audio: {
    title: "Audio Browser",
    kindLabel: "track",
    extensions: ["wav", "mp3", "bmu"],
    resourceTypeKeys: ["wav", "mp3", "bmu"],
    streamDirs: ["streammusic"],
  },
  mdl: {
    title: "Model Browser",
    kindLabel: "model",
    extensions: ["mdl"],
    resourceTypeKeys: ["mdl"],
    streamDirs: [],
  },
};

const keyCache = new Map<string, string[]>();

export class ModalResRefBrowserState extends ModalState {
  items: ResRefCatalogEntry[] = [];
  filteredItems: ResRefCatalogEntry[] = [];
  searchQuery: string = "";
  kind: ResRefKind;
  kindLabel: string;
  onSelect?: (resref: string) => void;

  constructor(kind: ResRefKind, onSelect?: (resref: string) => void) {
    super();
    this.kind = kind;
    const spec = RESREF_KIND_SPEC[kind];
    this.title = spec.title;
    this.kindLabel = spec.kindLabel;
    this.onSelect = onSelect;
    this.setView(<ModalResRefBrowser modal={this} />);
  }

  static invalidateKeyCache(): void {
    keyCache.clear();
  }

  static loadKeyResrefs(kind: ResRefKind): string[] {
    const cached = keyCache.get(kind);
    if (cached) {
      return cached;
    }
    const spec = RESREF_KIND_SPEC[kind];
    const KotOR = (globalThis as any).KotOR ?? KotORNs;
    const resrefs: string[] = [];
    const keys = KotOR?.KEYManager?.Key?.keys;
    if (!Array.isArray(keys)) {
      keyCache.set(kind, resrefs);
      return resrefs;
    }
    const types = new Set<number>();
    for (let i = 0; i < spec.resourceTypeKeys.length; i++) {
      const key = spec.resourceTypeKeys[i];
      const value = KotOR?.ResourceTypes?.[key];
      if (typeof value === "number") {
        types.add(value);
      }
    }
    for (let i = 0; i < keys.length; i++) {
      const entry = keys[i];
      if (types.has(entry.resType)) {
        resrefs.push(entry.resRef);
      }
    }
    keyCache.set(kind, resrefs);
    return resrefs;
  }

  applyFilters() {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredItems = this.items.slice();
      return;
    }
    this.filteredItems = this.items.filter((item) => item.resref.toLowerCase().includes(query));
  }

  async loadItems() {
    const spec = RESREF_KIND_SPEC[this.kind];
    const KotOR = (globalThis as any).KotOR ?? KotORNs;
    try {
      const [override, project, streams] = await Promise.all([
        listDirectoryResrefs(() => KotOR.GameFileSystem.readdir("Override", { recursive: true }), spec.extensions),
        listDirectoryResrefs(async () => {
          if (!ProjectFileSystem.hasRoot()) {
            return [];
          }
          return ProjectFileSystem.readdir("", { recursive: true });
        }, spec.extensions),
        listStreamResrefs(KotOR, spec.streamDirs, spec.extensions),
      ]);
      this.items = mergeResRefCatalog([
        { source: "game", resrefs: ModalResRefBrowserState.loadKeyResrefs(this.kind).concat(streams) },
        { source: "override", resrefs: override },
        { source: "project", resrefs: project },
      ]);
      this.applyFilters();
      this.processEventListener("onItemsLoaded", [this]);
    } catch (error) {
      console.error("Failed to load resources", error);
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

  selectResRef(item: ResRefCatalogEntry | string) {
    const raw = typeof item === "string" ? item : item.resref;
    const resref = sanitizeResRef(raw);
    if (this.onSelect) {
      this.onSelect(resref);
    }
    this.close();
  }
}

async function listDirectoryResrefs(read: () => Promise<string[]>, extensions: string[]): Promise<string[]> {
  try {
    const entries = await read();
    const resrefs: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const resref = resRefFromPath(String(entries[i] || ""), extensions);
      if (resref) {
        resrefs.push(resref);
      }
    }
    return resrefs;
  } catch {
    return [];
  }
}

async function listStreamResrefs(KotOR: any, dirs: string[], extensions: string[]): Promise<string[]> {
  const all: string[] = [];
  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];
    try {
      const entries = await KotOR.GameFileSystem.readdir(dir, { recursive: true });
      for (let j = 0; j < entries.length; j++) {
        const resref = resRefFromPath(String(entries[j] || ""), extensions);
        if (resref) {
          all.push(resref);
        }
      }
    } catch {
      // Folder may be missing for this game (e.g. streamvoice vs streamwaves).
    }
  }
  return all;
}
