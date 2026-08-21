/**
 * Map recent files/projects into menubar rows (header + siblings, not children of a title).
 *
 * @file recentMenuItems.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { ForgeMenuItem } from "@/apps/forge/components/common/forgeMenuItem";

export function truncatePath(path: string, max = 48): string {
  const value = path || "";
  if (value.length <= max) {
    return value;
  }
  if (max <= 1) {
    return "…";
  }
  return `…${value.slice(1 - max)}`;
}

export interface RecentFileEntry {
  getFilename: () => string;
  getPrettyPath: () => string;
}

export interface RecentProjectEntry {
  getDisplayName: () => string;
  path?: string;
  virtual?: boolean;
}

export function mapRecentFilesToMenuItems(
  files: RecentFileEntry[],
  onOpen: (index: number) => void,
): ForgeMenuItem[] {
  return files.map((file, index) => {
    const path = truncatePath(file.getPrettyPath() || "");
    return {
      label: file.getFilename() || "untitled",
      detail: path,
      onClick: () => onOpen(index),
    };
  });
}

export function mapRecentProjectsToMenuItems(
  projects: RecentProjectEntry[],
  onOpen: (index: number) => void,
): ForgeMenuItem[] {
  return projects.map((project, index) => {
    const name = project.getDisplayName() || "Untitled Project";
    const path = truncatePath(project.path || "");
    const detail = path && path !== name ? path : (project.virtual ? "Virtual folder" : undefined);
    return {
      label: name,
      detail,
      onClick: () => onOpen(index),
    };
  });
}

export function buildOpenRecentMenuItems(args: {
  projects: RecentProjectEntry[];
  files: RecentFileEntry[];
  onOpenProject: (index: number) => void;
  onOpenFile: (index: number) => void;
  onClear?: () => void;
}): ForgeMenuItem[] {
  const items: ForgeMenuItem[] = [];
  items.push({ header: true, label: "Recent Projects" });
  if (args.projects.length) {
    items.push(...mapRecentProjectsToMenuItems(args.projects, args.onOpenProject));
  } else {
    items.push({ label: "No recent projects", disabled: true });
  }
  items.push({ separator: true });
  items.push({ header: true, label: "Recent Files" });
  if (args.files.length) {
    items.push(...mapRecentFilesToMenuItems(args.files, args.onOpenFile));
  } else {
    items.push({ label: "No recent files", disabled: true });
  }
  if (args.onClear) {
    items.push({ separator: true });
    items.push({
      label: "Clear Recently Opened",
      onClick: args.onClear,
    });
  }
  return items;
}
