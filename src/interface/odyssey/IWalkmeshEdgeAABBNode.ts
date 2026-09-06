import type * as THREE from "three";
import type { WalkmeshEdge } from "@/odyssey/WalkmeshEdge";

/**
 * Runtime AABB node for walkmesh edge spatial queries.
 * Separate from IOdysseyModelAABBNode (WOK on-disk face AABB layout).
 */
export interface IWalkmeshEdgeAABBNode {
  box: THREE.Box3;
  /** Set on leaf nodes; undefined on internal nodes. */
  edge?: WalkmeshEdge;
  leftNode?: IWalkmeshEdgeAABBNode;
  rightNode?: IWalkmeshEdgeAABBNode;
}
