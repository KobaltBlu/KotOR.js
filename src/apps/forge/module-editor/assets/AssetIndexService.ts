/**
 * Project + KEY asset index for search and drag-drop placement.
 *
 * @file AssetIndexService.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import * as KotOR from "@/apps/forge/KotOR";
import { PerformanceBaseline } from "@/apps/forge/module-editor/kernel/PerformanceBaseline";
import {
  AssetIndexEntry,
  AssetIndexSnapshot,
} from "@/apps/forge/module-editor/assets/AssetIndexTypes";

const BLUEPRINT_EXTS = new Set(["utc", "utd", "ute", "uti", "utm", "utp", "uts", "utt", "utw", "dlg", "nss", "ncs", "jrl"]);

function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

function resrefOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return (idx >= 0 ? name.slice(0, idx) : name).toLowerCase();
}

export class AssetIndexService extends EventListenerModel {
  private snapshot: AssetIndexSnapshot = {
    entries: [],
    builtAt: 0,
    durationMs: 0,
    projectCount: 0,
    keyCount: 0,
  };
  private building = false;
  private favorites = new Set<string>();
  private recent: string[] = [];

  getSnapshot(): AssetIndexSnapshot {
    return this.snapshot;
  }

  getFavorites(): string[] {
    return Array.from(this.favorites);
  }

  getRecent(): string[] {
    return this.recent.slice();
  }

  toggleFavorite(resref: string): void {
    const key = resref.toLowerCase();
    if (this.favorites.has(key)) {
      this.favorites.delete(key);
    } else {
      this.favorites.add(key);
    }
    this.processEventListener("onFavoritesChanged", [this.getFavorites()]);
  }

  touchRecent(resref: string): void {
    const key = resref.toLowerCase();
    this.recent = [key, ...this.recent.filter((item) => item !== key)].slice(0, 40);
    this.processEventListener("onRecentChanged", [this.getRecent()]);
  }

  search(query: string, extensions?: string[]): AssetIndexEntry[] {
    const q = query.trim().toLowerCase();
    const extFilter = extensions?.map((e) => e.toLowerCase());
    return this.snapshot.entries.filter((entry) => {
      if (extFilter && extFilter.length && extFilter.indexOf(entry.extension) < 0) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        entry.resref.includes(q) ||
        (entry.localizedName || "").toLowerCase().includes(q) ||
        (entry.path || "").toLowerCase().includes(q)
      );
    });
  }

  findByResref(resref: string, extension?: string): AssetIndexEntry | undefined {
    const key = resref.toLowerCase();
    return this.snapshot.entries.find((entry) => {
      if (entry.resref !== key) return false;
      if (extension && entry.extension !== extension.toLowerCase()) return false;
      return true;
    });
  }

  async rebuild(): Promise<AssetIndexSnapshot> {
    if (this.building) {
      return this.snapshot;
    }
    this.building = true;
    return PerformanceBaseline.measure("index.build", async () => {
      try {
        const entries: AssetIndexEntry[] = [];
        let projectCount = 0;
        let keyCount = 0;

        if (ProjectFileSystem.hasRoot()) {
          const files = await this.listProjectFilesRecursive("");
          for (const path of files) {
            const extension = extOf(path);
            if (!BLUEPRINT_EXTS.has(extension) && extension !== "mdl" && extension !== "tga" && extension !== "tpc") {
              continue;
            }
            const resref = resrefOf(path.split("/").pop() || path);
            entries.push({
              resref,
              resType: (KotOR.ResourceTypes as any)[extension] ?? 0,
              extension,
              origin: "project",
              path,
            });
            projectCount += 1;
          }
        }

        try {
          const keys = KotOR.KEYManager?.Key?.keys || [];
          for (const key of keys) {
            const extension = KotOR.ResourceTypes.getKeyByValue?.(key.resType)
              || String(key.resType);
            const ext = typeof extension === "string" ? extension.toLowerCase() : "";
            if (!BLUEPRINT_EXTS.has(ext)) {
              continue;
            }
            const resref = String(key.resRef || "").toLowerCase();
            if (!resref) continue;
            const existing = entries.find((e) => e.resref === resref && e.extension === ext);
            if (existing) {
              existing.origin = "override";
              continue;
            }
            entries.push({
              resref,
              resType: key.resType,
              extension: ext,
              origin: "key",
            });
            keyCount += 1;
          }
        } catch (error) {
          console.warn("AssetIndexService: KEY scan failed", error);
        }

        this.snapshot = {
          entries,
          builtAt: Date.now(),
          durationMs: 0,
          projectCount,
          keyCount,
        };
        this.processEventListener("onIndexRebuilt", [this.snapshot]);
        return this.snapshot;
      } finally {
        this.building = false;
      }
    });
  }

  private async listProjectFilesRecursive(dir: string): Promise<string[]> {
    const out: string[] = [];
    let entries: string[] = [];
    try {
      entries = await ProjectFileSystem.readdir(dir || "");
    } catch {
      return out;
    }
    for (const entry of entries) {
      const rel = dir ? `${dir}/${entry}` : entry;
      const isDir = await ProjectFileSystem.isDirectory(rel).catch(() => false);
      if (isDir) {
        if (entry === ".forge" || entry === "node_modules") continue;
        out.push(...(await this.listProjectFilesRecursive(rel)));
      } else {
        out.push(rel.replace(/\\/g, "/"));
      }
    }
    return out;
  }
}
