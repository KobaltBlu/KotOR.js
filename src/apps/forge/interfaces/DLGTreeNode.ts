/**
 * DLGTreeNode interface.
 *
 * Represents a node in the DLG tree hierarchy for the editor.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGTreeNode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { DLGNodeType } from '@/enums/dialog/DLGNodeType';
import { DLGNode } from '@/resource/DLGNode';

export interface DLGTreeNode {
  /** Unique ID for this tree node */
  id: string;

  /** The actual DLG node data */
  dlgNode: DLGNode;

  /** Parent tree node */
  parent?: DLGTreeNode;

  /** Child tree nodes */
  children: DLGTreeNode[];

  /** Index in the entry/reply/starting list */
  listIndex: number;

  /** Type of node (entry, reply, starting) */
  nodeType: DLGNodeType;

  /** Whether this node is expanded in the tree */
  expanded: boolean;

  /** Whether this node is selected */
  selected: boolean;

  /** Whether this node is a copy (for drag/drop) */
  isCopy: boolean;

  /** Whether children have been loaded */
  childrenLoaded: boolean;

  /** Link index (for reply/entry links) */
  linkIndex?: number;

  /** Path from root (for navigation) */
  path: number[];

  /** Whether this node is visible (for filtering) */
  visible: boolean;

  /** Whether this node has conditional scripts */
  hasConditions: boolean;

  /** Whether this node has action scripts */
  hasActions: boolean;

  /** Whether this node is an orphan (no references) */
  isOrphan: boolean;

  /** Visual depth in tree */
  depth: number;
}

export interface DLGTreeNodeData {
  node: DLGTreeNode;
  index: number;
  type: 'starting' | 'entry' | 'reply';
}

export interface DLGNodePath {
  indices: number[];
  nodeType: DLGNodeType;
}

export interface DLGNodeReference {
  sourceNode: DLGTreeNode;
  targetNode: DLGTreeNode;
  linkIndex: number;
}
