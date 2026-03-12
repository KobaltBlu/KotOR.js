/**
 * Builds nodes and edges for the DLG graph view from a DLGObject.
 * One node per starting/entry/reply list entry; edges follow entries/replies links.
 */

import { DLGNodeType } from "@/enums/dialog/DLGNodeType";
import { DLGNode } from "@/resource/DLGNode";
import { DLGObject } from "@/resource/DLGObject";

const MAX_LABEL_LEN = 24;
const NODE_WIDTH = 160;
const NODE_HEIGHT = 40;
const LEVEL_GAP = 70;
const NODE_GAP = 24;

export type DLGGraphNodeType = "starting" | "entry" | "reply";

export interface DLGGraphNode {
  id: string;
  type: DLGGraphNodeType;
  listIndex: number;
  dlgNode: DLGNode;
  label: string;
  x: number;
  y: number;
}

export interface DLGGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface DLGGraphData {
  nodes: DLGGraphNode[];
  edges: DLGGraphEdge[];
}

function nodeId(type: DLGGraphNodeType, listIndex: number): string {
  return `${type}-${listIndex}`;
}

function truncate(s: string, max: number = MAX_LABEL_LEN): string {
  if (!s || typeof s !== "string") return "(no text)";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}

function getNodeText(node: DLGNode): string {
  const raw = node.text ?? "";
  return truncate(typeof raw === "string" ? raw : String(raw));
}

/**
 * Build graph nodes: one per starting, one per entry, one per reply.
 */
function buildNodes(dlg: DLGObject): DLGGraphNode[] {
  const nodes: DLGGraphNode[] = [];

  dlg.startingList.forEach((n, i) => {
    nodes.push({
      id: nodeId("starting", i),
      type: "starting",
      listIndex: i,
      dlgNode: n,
      label: `Start ${i + 1}`,
      x: 0,
      y: 0,
    });
  });

  dlg.entryList.forEach((n, i) => {
    nodes.push({
      id: nodeId("entry", i),
      type: "entry",
      listIndex: i,
      dlgNode: n,
      label: getNodeText(n),
      x: 0,
      y: 0,
    });
  });

  dlg.replyList.forEach((n, i) => {
    nodes.push({
      id: nodeId("reply", i),
      type: "reply",
      listIndex: i,
      dlgNode: n,
      label: getNodeText(n),
      x: 0,
      y: 0,
    });
  });

  return nodes;
}

/**
 * Build edges from entries/replies links.
 */
function buildEdges(dlg: DLGObject): DLGGraphEdge[] {
  const edges: DLGGraphEdge[] = [];
  let edgeIdx = 0;

  dlg.startingList.forEach((start, i) => {
    start.entries.forEach((entry) => {
      const listIndex = entry.index;
      if (listIndex >= 0 && listIndex < dlg.entryList.length) {
        edges.push({
          id: `e${edgeIdx++}`,
          sourceId: nodeId("starting", i),
          targetId: nodeId("entry", listIndex),
        });
      }
    });
  });

  dlg.entryList.forEach((entry, i) => {
    entry.replies.forEach((reply) => {
      const listIndex = reply.index;
      if (listIndex >= 0 && listIndex < dlg.replyList.length) {
        edges.push({
          id: `e${edgeIdx++}`,
          sourceId: nodeId("entry", i),
          targetId: nodeId("reply", listIndex),
        });
      }
    });
  });

  dlg.replyList.forEach((reply, i) => {
    reply.entries.forEach((entry) => {
      const listIndex = entry.index;
      if (listIndex >= 0 && listIndex < dlg.entryList.length) {
        edges.push({
          id: `e${edgeIdx++}`,
          sourceId: nodeId("reply", i),
          targetId: nodeId("entry", listIndex),
        });
      }
    });
  });

  return edges;
}

/**
 * Assign x,y using level-based layout: BFS from startings, then spread by level.
 */
function layoutNodes(nodes: DLGGraphNode[], edges: DLGGraphEdge[]): void {
  const nodeMap = new Map<string, DLGGraphNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const outEdges = new Map<string, string[]>();
  edges.forEach((e) => {
    const list = outEdges.get(e.sourceId) ?? [];
    list.push(e.targetId);
    outEdges.set(e.sourceId, list);
  });

  const levels = new Map<string, number>();
  const queue: string[] = [];
  nodes.filter((n) => n.type === "starting").forEach((n) => {
    levels.set(n.id, 0);
    queue.push(n.id);
  });
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const level = levels.get(id) ?? 0;
    (outEdges.get(id) ?? []).forEach((targetId) => {
      if (!levels.has(targetId)) {
        levels.set(targetId, level + 1);
        queue.push(targetId);
      }
    });
  }
  nodes.forEach((n) => {
    if (!levels.has(n.id)) levels.set(n.id, 0);
  });

  const byLevel = new Map<number, DLGGraphNode[]>();
  nodes.forEach((n) => {
    const l = levels.get(n.id) ?? 0;
    const list = byLevel.get(l) ?? [];
    list.push(n);
    byLevel.set(l, list);
  });

  const levelOrder = Array.from(byLevel.keys()).sort((a, b) => a - b);
  levelOrder.forEach((level) => {
    const list = byLevel.get(level) ?? [];
    const levelWidth = list.length * NODE_WIDTH + (list.length - 1) * NODE_GAP;
    const startX = -levelWidth / 2 + NODE_WIDTH / 2 + NODE_GAP / 2;
    list.forEach((n, i) => {
      n.x = startX + i * (NODE_WIDTH + NODE_GAP);
      n.y = level * (NODE_HEIGHT + LEVEL_GAP);
    });
  });
}

/**
 * Build full graph data (nodes + edges + layout) from a DLG.
 */
export function buildDLGGraph(dlg: DLGObject): DLGGraphData {
  const nodes = buildNodes(dlg);
  const edges = buildEdges(dlg);
  layoutNodes(nodes, edges);
  return { nodes, edges };
}
