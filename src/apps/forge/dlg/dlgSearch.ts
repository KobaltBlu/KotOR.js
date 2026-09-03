import { locStringPreview } from "@/apps/forge/dlg/dlgLocString";
import type { ForgeDLG } from "@/apps/forge/dlg/ForgeDLG";
import type { ForgeDLGNode } from "@/apps/forge/dlg/ForgeDLGTypes";

/**
 * Catalog search over conversation node text, tags, and resrefs.
 *
 * @file dlgSearch.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface DLGSearchHit {
  node: ForgeDLGNode;
  haystack: string;
}

function nodeHaystack(node: ForgeDLGNode, texts?: ReadonlyMap<string, string>): string {
  return [
    texts?.get(node.id) || locStringPreview(node.text),
    node.comment,
    node.speaker,
    node.listener,
    node.voResRef,
    node.sound,
    node.script,
    node.script2,
    node.quest,
    node.id,
  ]
    .join(" ")
    .toLowerCase();
}

export function searchDlgNodes(
  dlg: ForgeDLG,
  query: string,
  texts?: ReadonlyMap<string, string>,
): DLGSearchHit[] {
  const q = query.trim().toLowerCase();
  const nodes = dlg.allNodes();
  const hits: DLGSearchHit[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const haystack = nodeHaystack(nodes[i], texts);
    if (!q || haystack.indexOf(q) >= 0) {
      hits.push({ node: nodes[i], haystack });
    }
  }
  return hits;
}
