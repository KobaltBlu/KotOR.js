import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";

/**
 * Project explorer paths relative to workspace root using `/`.
 * Recursive readdir yields files only — empty dirs are omitted (possible Phase 2).
 */
export function normalizeProjectExplorerPath(relPath: string): string {
  return relPath
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/");
}

export function getWorkspaceRootLabel(): string {
  const dirPath = ProjectFileSystem.rootDirectoryPath;
  if (typeof dirPath === "string" && dirPath.length) {
    const base = normalizeProjectExplorerPath(dirPath.split(/[/\\]/).pop() || dirPath);
    return base.length ? base : "Project";
  }
  const h = ProjectFileSystem.rootDirectoryHandle;
  if (h?.name) return h.name;
  return "Project";
}

/** VS Code ordering: folders (group) before files (resource), case-insensitive name. */
export function sortExplorerSubtree(node: FileBrowserNode): void {
  node.nodes.sort((a: FileBrowserNode, b: FileBrowserNode) => {
    const dirA = a.type === "group" ? 0 : 1;
    const dirB = b.type === "group" ? 0 : 1;
    if (dirA !== dirB) return dirA - dirB;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  for (const child of node.nodes) {
    if (child.type === "group") sortExplorerSubtree(child);
  }
}

function ensureFolder(parent: FileBrowserNode, segment: string, relPathAccum: string): FileBrowserNode {
  let folder = parent.nodes.find(
    (c) => c.type === "group" && c.name.toLowerCase() === segment.toLowerCase()
  );
  if (!folder) {
    folder = new FileBrowserNode({
      name: segment,
      type: "group",
      canOrphan: true,
      data: { relPath: relPathAccum },
    });
    parent.addChildNode(folder);
  }
  return folder;
}

function insertFileRelPath(root: FileBrowserNode, norm: string): void {
  const parts = norm.split("/").filter(Boolean);
  if (!parts.length) return;
  const fileName = parts.pop()!;
  let cur = root;
  let acc = "";
  for (const seg of parts) {
    acc = acc ? `${acc}/${seg}` : seg;
    cur = ensureFolder(cur, seg, acc);
  }
  const dup = cur.nodes.some(
    (n) => n.type === "resource" && n.name.toLowerCase() === fileName.toLowerCase()
  );
  if (dup) return;
  cur.addChildNode(
    new FileBrowserNode({
      name: fileName,
      type: "resource",
      canOrphan: true,
      data: {
        path: `${EditorFileProtocol.FILE}//project.dir/${norm}`,
        relPath: norm,
      },
    })
  );
}

/** Builds a VS Code-style folder tree wrapped in one workspace root row. */
export function buildProjectExplorerTree(paths: string[]): FileBrowserNode {
  const root = new FileBrowserNode({
    name: getWorkspaceRootLabel(),
    type: "group",
    canOrphan: true,
    data: { relPath: "", explorerRoot: true },
  });

  const unique = [...new Set(paths.map(normalizeProjectExplorerPath).filter(Boolean))];
  unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  for (const norm of unique) {
    insertFileRelPath(root, norm);
  }
  sortExplorerSubtree(root);
  return root;
}
