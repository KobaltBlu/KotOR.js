import * as KotOR from '@/apps/forge/KotOR';

export type DLGNodeTypeLabel = 'starting' | 'entry' | 'reply';
export type DLGTreeItemKind = 'node' | 'link';

export interface DLGEditorSelection {
  kind: DLGTreeItemKind;
  nodeType: DLGNodeTypeLabel;
  nodeIndex: number;
  node?: KotOR.DLGNode;
  link?: KotOR.DLGNode;
  targetType?: DLGNodeTypeLabel;
  targetIndex?: number;
  targetNode?: KotOR.DLGNode;
  path?: string;
}

export interface DLGTreeNode {
  id: string;
  path: string;
  kind: DLGTreeItemKind;
  nodeType: DLGNodeTypeLabel;
  nodeIndex: number;
  label: string;
  summary?: string;
  node?: KotOR.DLGNode;
  link?: KotOR.DLGNode;
  targetType?: DLGNodeTypeLabel;
  targetIndex?: number;
  targetNode?: KotOR.DLGNode;
  depth: number;
  isCycle?: boolean;
  children: DLGTreeNode[];
}
