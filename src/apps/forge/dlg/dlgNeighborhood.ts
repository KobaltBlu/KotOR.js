import { DLG_NEIGHBOR_CAP } from "@/apps/forge/dlg/ForgeDLGTypes";
import type { ForgeDLGLink, ForgeDLGNode } from "@/apps/forge/dlg/ForgeDLGTypes";

export interface DLGNeighborhoodSource {
  startingLinks: ForgeDLGLink[];
  getNode(id: string): ForgeDLGNode | undefined;
  allNodes(): ForgeDLGNode[];
}

/**
 * Bounded 1-hop neighborhood for the focus-graph (independent of file size).
 *
 * @file dlgNeighborhood.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface DLGNeighborhoodEdge {
  link: ForgeDLGLink;
  node: ForgeDLGNode | undefined;
  fromId: string;
}

export interface DLGNeighborhood {
  center: ForgeDLGNode | undefined;
  inbound: DLGNeighborhoodEdge[];
  outbound: DLGNeighborhoodEdge[];
  inboundHidden: number;
  outboundHidden: number;
  inboundTotal: number;
  outboundTotal: number;
}

export function buildFocusNeighborhood(
  dlg: DLGNeighborhoodSource,
  selectedId: string | undefined,
  cap: number = DLG_NEIGHBOR_CAP,
): DLGNeighborhood {
  const empty: DLGNeighborhood = {
    center: undefined,
    inbound: [],
    outbound: [],
    inboundHidden: 0,
    outboundHidden: 0,
    inboundTotal: 0,
    outboundTotal: 0,
  };
  if (!selectedId) {
    return empty;
  }
  const center = dlg.getNode(selectedId);
  if (!center) {
    return empty;
  }

  const inboundAll: DLGNeighborhoodEdge[] = [];
  for (let i = 0; i < dlg.startingLinks.length; i++) {
    const link = dlg.startingLinks[i];
    if (link.targetId === selectedId) {
      inboundAll.push({ link, node: undefined, fromId: "start" });
    }
  }
  const allNodes = dlg.allNodes();
  for (let n = 0; n < allNodes.length; n++) {
    const parent = allNodes[n];
    for (let l = 0; l < parent.links.length; l++) {
      const link = parent.links[l];
      if (link.targetId === selectedId) {
        inboundAll.push({ link, node: parent, fromId: parent.id });
      }
    }
  }

  const outboundAll: DLGNeighborhoodEdge[] = [];
  for (let i = 0; i < center.links.length; i++) {
    const link = center.links[i];
    outboundAll.push({
      link,
      node: dlg.getNode(link.targetId),
      fromId: center.id,
    });
  }

  const inbound = inboundAll.slice(0, cap);
  const outbound = outboundAll.slice(0, cap);
  return {
    center,
    inbound,
    outbound,
    inboundHidden: Math.max(0, inboundAll.length - inbound.length),
    outboundHidden: Math.max(0, outboundAll.length - outbound.length),
    inboundTotal: inboundAll.length,
    outboundTotal: outboundAll.length,
  };
}
