/**
 * Shared types and helpers for the ERF/MOD Explorer-style browser.
 *
 * @file ERFBrowserTypes.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import type {
  ErfBrowserSortDir,
  ErfBrowserSortKey,
  ErfBrowserViewMode,
} from "@/apps/forge/settings/forgeEditorsSettings";

export type { ErfBrowserSortDir, ErfBrowserSortKey, ErfBrowserViewMode };

export interface ERFBrowserNodeData {
  archive: any;
  resource?: any;
  size: number;
  offset: number;
  resId: number;
  resType: number;
  typeLabel: string;
  isFolder: boolean;
}

export function isERFFolderNode(node: FileBrowserNode): boolean {
  return node.type === "group" || !!node.data?.isFolder;
}

export function getERFNodeExt(node: FileBrowserNode): string {
  return (node.data?.typeLabel as string) || node.name?.split(".").pop()?.toLowerCase() || "";
}

export function getERFFileIconClass(node: FileBrowserNode): string {
  if (isERFFolderNode(node)) {
    return "fa-folder";
  }
  const ext = getERFNodeExt(node);
  switch (ext) {
    case "tga":
    case "dds":
    case "tpc":
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
      return "fa-file-image";
    case "wav":
    case "mp3":
    case "ogg":
      return "fa-file-audio";
    case "bik":
      return "fa-file-video";
    case "nss":
    case "ncs":
    case "dlg":
    case "twoda":
    case "2da":
      return "fa-file-code";
    case "erf":
    case "mod":
    case "sav":
    case "rim":
    case "hak":
      return "fa-file-archive";
    default:
      return "fa-file";
  }
}

export function formatERFOffset(offset: number): string {
  if (!Number.isFinite(offset) || offset < 0) {
    return "—";
  }
  return `0x${offset.toString(16).toUpperCase()}`;
}

export function compareERFBrowserNodes(
  a: FileBrowserNode,
  b: FileBrowserNode,
  sortKey: ErfBrowserSortKey,
  sortDir: ErfBrowserSortDir,
): number {
  const aFolder = isERFFolderNode(a);
  const bFolder = isERFFolderNode(b);
  if (aFolder !== bFolder) {
    return aFolder ? -1 : 1;
  }

  let cmp = 0;
  const aData = a.data || {};
  const bData = b.data || {};
  switch (sortKey) {
    case "type":
      cmp = String(aData.typeLabel || "").localeCompare(String(bData.typeLabel || ""), undefined, {
        sensitivity: "base",
      });
      break;
    case "size":
      cmp = (aData.size || 0) - (bData.size || 0);
      break;
    case "offset":
      cmp = (aData.offset || 0) - (bData.offset || 0);
      break;
    case "resId":
      cmp = (aData.resId || 0) - (bData.resId || 0);
      break;
    case "name":
    default:
      cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      break;
  }

  if (cmp === 0 && sortKey !== "name") {
    cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  }

  return sortDir === "desc" ? -cmp : cmp;
}

export function filterERFBrowserNodes(nodes: FileBrowserNode[], query: string): FileBrowserNode[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return nodes;
  }
  return nodes.filter((node) => {
    const typeLabel = String(node.data?.typeLabel || "").toLowerCase();
    return node.name.toLowerCase().includes(q) || typeLabel.includes(q);
  });
}
