import { EditorFile } from "../EditorFile";
import { FileBrowserNode } from "../FileBrowserNode";
import { ProjectFileSystem } from "../ProjectFileSystem";
import { EditorFileProtocol } from "../enum/EditorFileProtocol";
import {
  ReferenceFileResource,
  ReferenceSearchResult,
  ReferenceFinderOptions,
  ReferenceFinderResrefOptions,
  findResrefReferences,
  findFieldValueReferences,
  findScriptReferences,
  findTagReferences,
  findTemplateResrefReferences,
  findConversationReferences,
  createKeyResources,
  countOccurrencesInBuffer,
  countOccurrencesInText,
  findAllReferencesInText,
  getWordAtIndex,
  findStrRefReferences,
} from "./ReferenceFinderCore";

export type ReferenceScope = "project" | "game" | "both";

export interface ReferenceHit {
  scope: Exclude<ReferenceScope, "both">;
  displayName: string;
  path: string;
  occurrences: number;
  editorFile: EditorFile;
}

export interface ReferenceSearchOptions {
  query: string;
  scope?: ReferenceScope;
  caseSensitive?: boolean;
  /** Optional glob pattern for project paths (e.g. "*.mod"). */
  filePattern?: string | null;
  /** Optional set of file type extensions to include (e.g. ARE, DLG). When null/empty, all files are searched. */
  fileTypes?: Set<string> | null;
  maxFiles?: number;
  maxBytesPerFile?: number;
  excludePaths?: RegExp[];
  gameRootNodes?: FileBrowserNode[];
}

export function flattenResourceNodes(nodes: FileBrowserNode[]): FileBrowserNode[] {
  const out: FileBrowserNode[] = [];
  const visit = (n: FileBrowserNode) => {
    if (!n) return;
    if (n.type === "resource") {
      out.push(n);
      return;
    }
    if (Array.isArray(n.nodes)) {
      for (const child of n.nodes) visit(child);
    }
  };
  for (const n of nodes) visit(n);
  return out;
}

export { countOccurrencesInBuffer, countOccurrencesInText };

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

export async function searchProjectReferences(
  options: ReferenceSearchOptions
): Promise<ReferenceHit[]> {
  const {
    query,
    caseSensitive = false,
    filePattern = null,
    fileTypes = null,
    maxFiles = 5000,
    maxBytesPerFile = 50 * 1024 * 1024,
    excludePaths = [/^\.forge\//i],
  } = options;

  if (!query?.trim()) return [];

  const files = await ProjectFileSystem.readdir("", { recursive: true });
  let filtered = files
    .map((p) => p.replace(/\\/g, "/"))
    .filter((p) => p && !excludePaths.some((re) => re.test(p)));

  if (fileTypes != null && fileTypes.size > 0) {
    const extSet = new Set([...fileTypes].map((t) => t.toLowerCase()));
    filtered = filtered.filter((p) => {
      const ext = p.split(/[/\\]/).pop()?.split(".").pop()?.toLowerCase() ?? "";
      return extSet.has(ext);
    });
  }
  if (filePattern != null && filePattern.trim()) {
    const matcher = globToRegExp(filePattern.trim());
    filtered = filtered.filter((p) => {
      const name = p.split(/[/\\]/).pop() ?? p;
      return matcher.test(name);
    });
  }

  const limited = filtered.slice(0, maxFiles);

  const needleBytes = caseSensitive ? new TextEncoder().encode(query) : undefined;

  const hits: ReferenceHit[] = [];
  for (const relPath of limited) {
    try {
      const buffer = await ProjectFileSystem.readFile(relPath);
      if (!buffer || buffer.length === 0) continue;
      if (buffer.length > maxBytesPerFile) continue;

      let occurrences = 0;
      if (caseSensitive && needleBytes) {
        occurrences = countOccurrencesInBuffer(buffer, needleBytes);
      } else {
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const text = decoder.decode(buffer);
        occurrences = countOccurrencesInText(text, query, false);
      }

      if (occurrences > 0) {
        const editorFile = new EditorFile({
          path: `${EditorFileProtocol.FILE}//project.dir/${relPath}`,
          useProjectFileSystem: true,
        });
        hits.push({
          scope: "project",
          displayName: relPath,
          path: relPath,
          occurrences,
          editorFile,
        });
      }
    } catch (e) {
      // ignore unreadable files
    }
  }

  return hits.sort((a, b) => b.occurrences - a.occurrences);
}

export async function searchGameReferencesByName(
  options: ReferenceSearchOptions
): Promise<ReferenceHit[]> {
  const { query, filePattern = null, fileTypes = null, gameRootNodes = [] } = options;
  if (!query?.trim() || !gameRootNodes.length) return [];

  const nodes = flattenResourceNodes(gameRootNodes);
  const q = query.toLowerCase();
  const hits: ReferenceHit[] = [];

  const extSet =
    fileTypes != null && fileTypes.size > 0
      ? new Set([...fileTypes].map((t) => t.toLowerCase()))
      : null;
  const patternMatcher =
    filePattern != null && filePattern.trim()
      ? globToRegExp(filePattern.trim())
      : null;

  for (const node of nodes) {
    const name = node.name || "";
    if (!name.toLowerCase().includes(q)) continue;

    const path = node.data?.path;
    if (!path) continue;

    if (extSet) {
      const ext = path.split(/[/\\]/).pop()?.split(".").pop()?.toLowerCase() ?? "";
      if (!extSet.has(ext)) continue;
    }
    if (patternMatcher) {
      const fileName = path.split(/[/\\]/).pop() ?? path;
      if (!patternMatcher.test(fileName)) continue;
    }

    const editorFile = new EditorFile({
      path,
      useGameFileSystem: true,
    });

    hits.push({
      scope: "game",
      displayName: name,
      path,
      occurrences: 1,
      editorFile,
    });
  }

  return hits;
}

export async function searchReferences(
  options: ReferenceSearchOptions
): Promise<ReferenceHit[]> {
  const scope = options.scope ?? "project";
  const results: ReferenceHit[] = [];

  if (scope === "project" || scope === "both") {
    results.push(...(await searchProjectReferences(options)));
  }
  if (scope === "game" || scope === "both") {
    results.push(...(await searchGameReferencesByName(options)));
  }

  // Grouping isn't necessary yet; keep stable ordering (project hits already sorted)
  return results;
}

export {
  ReferenceFileResource,
  ReferenceSearchResult,
  ReferenceFinderOptions,
  ReferenceFinderResrefOptions,
  findResrefReferences,
  findFieldValueReferences,
  findScriptReferences,
  findTagReferences,
  findTemplateResrefReferences,
  findConversationReferences,
  findStrRefReferences,
  findAllReferencesInText,
  getWordAtIndex,
  createKeyResources,
};
