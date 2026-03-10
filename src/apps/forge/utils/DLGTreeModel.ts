/**
 * DLGTreeModel class.
 *
 * Manages the tree structure and hierarchy for DLG nodes in the editor.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGTreeModel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { DLGTreeNode, DLGNodeReference } from "@/apps/forge/interfaces/DLGTreeNode";
import { DLGNodeType } from "@/enums/dialog/DLGNodeType";
import { DLGNode } from "@/resource/DLGNode";
import { DLGObject } from "@/resource/DLGObject";

export class DLGTreeModel {
  private rootNodes: DLGTreeNode[] = [];
  private nodeMap: Map<string, DLGTreeNode> = new Map();
  private dlg: DLGObject;
  private nextId: number = 0;
  private changeListeners: ((nodes: DLGTreeNode[]) => void)[] = [];
  private selectionListeners: ((node: DLGTreeNode | null) => void)[] = [];
  private selectedNode: DLGTreeNode | null = null;

  constructor(dlg: DLGObject) {
    this.dlg = dlg;
    this.buildTree();
  }

  /**
   * Build the complete tree structure from the DLG object
   */
  private buildTree(): void {
    this.rootNodes = [];
    this.nodeMap.clear();
    this.nextId = 0;

    // Create starting nodes (root level)
    this.dlg.startingList.forEach((startNode, index) => {
      const treeNode = this.createTreeNode(startNode, index, DLGNodeType.STARTING, null, [index]);
      this.rootNodes.push(treeNode);
    });

    this.notifyChange();
  }

  /**
   * Create a tree node from a DLG node
   */
  private createTreeNode(
    dlgNode: DLGNode,
    listIndex: number,
    nodeType: DLGNodeType,
    parent: DLGTreeNode | null,
    path: number[]
  ): DLGTreeNode {
    const id = this.generateId();
    const treeNode: DLGTreeNode = {
      id,
      dlgNode,
      parent: parent || undefined,
      children: [],
      listIndex,
      nodeType,
      expanded: false,
      selected: false,
      isCopy: false,
      childrenLoaded: false,
      path,
      visible: true,
      hasConditions: this.nodeHasConditions(dlgNode),
      hasActions: this.nodeHasActions(dlgNode),
      isOrphan: false,
      depth: parent ? parent.depth + 1 : 0
    };

    this.nodeMap.set(id, treeNode);
    return treeNode;
  }

  /**
   * Check if a node has conditional scripts
   */
  private nodeHasConditions(node: DLGNode): boolean {
    return !!(node.isActive || node.isActive2);
  }

  /**
   * Check if a node has action scripts
   */
  private nodeHasActions(node: DLGNode): boolean {
    return !!(node.script || node.script2);
  }

  /**
   * Generate a unique ID for a tree node
   */
  private generateId(): string {
    return `dlg-node-${this.nextId++}`;
  }

  /**
   * Load children for a tree node (lazy loading)
   */
  public loadChildren(treeNode: DLGTreeNode): void {
    if (treeNode.childrenLoaded) return;

    const dlgNode = treeNode.dlgNode;

    // For starting nodes, load the linked entry
    if (treeNode.nodeType === DLGNodeType.STARTING) {
      dlgNode.entries.forEach((entryNode, idx) => {
        const childPath = [...treeNode.path, idx];
        const entryTreeNode = this.createTreeNode(
          entryNode,
          entryNode.index,
          DLGNodeType.ENTRY,
          treeNode,
          childPath
        );
        treeNode.children.push(entryTreeNode);
      });
    }
    // For entry nodes, load reply links
    else if (treeNode.nodeType === DLGNodeType.ENTRY) {
      dlgNode.replies.forEach((replyNode, idx) => {
        const childPath = [...treeNode.path, idx];
        const replyTreeNode = this.createTreeNode(
          replyNode,
          replyNode.index,
          DLGNodeType.REPLY,
          treeNode,
          childPath
        );
        treeNode.children.push(replyTreeNode);
      });
    }
    // For reply nodes, load entry links
    else if (treeNode.nodeType === DLGNodeType.REPLY) {
      dlgNode.entries.forEach((entryNode, idx) => {
        const childPath = [...treeNode.path, idx];
        const entryTreeNode = this.createTreeNode(
          entryNode,
          entryNode.index,
          DLGNodeType.ENTRY,
          treeNode,
          childPath
        );
        treeNode.children.push(entryTreeNode);
      });
    }

    treeNode.childrenLoaded = true;
    this.notifyChange();
  }

  /**
   * Toggle node expansion
   */
  public toggleExpanded(nodeId: string): void {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;

    if (!node.expanded && !node.childrenLoaded) {
      this.loadChildren(node);
    }

    node.expanded = !node.expanded;
    this.notifyChange();
  }

  /**
   * Expand a node
   */
  public expandNode(nodeId: string): void {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;

    if (!node.childrenLoaded) {
      this.loadChildren(node);
    }

    node.expanded = true;
    this.notifyChange();
  }

  /**
   * Collapse a node
   */
  public collapseNode(nodeId: string): void {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;

    node.expanded = false;
    this.notifyChange();
  }

  /**
   * Expand all nodes in a subtree
   */
  public expandAll(nodeId?: string): void {
    const found = nodeId ? this.nodeMap.get(nodeId) : undefined;
    const nodes: DLGTreeNode[] = found !== undefined ? [found] : this.rootNodes;

    const expandRecursive = (node: DLGTreeNode) => {
      if (!node.childrenLoaded) {
        this.loadChildren(node);
      }
      node.expanded = true;
      node.children.forEach(expandRecursive);
    };

    nodes.forEach(expandRecursive);
    this.notifyChange();
  }

  /**
   * Collapse all nodes in a subtree
   */
  public collapseAll(nodeId?: string): void {
    const found = nodeId ? this.nodeMap.get(nodeId) : undefined;
    const nodes: DLGTreeNode[] = found !== undefined ? [found] : this.rootNodes;

    const collapseRecursive = (node: DLGTreeNode) => {
      node.expanded = false;
      node.children.forEach(collapseRecursive);
    };

    nodes.forEach(collapseRecursive);
    this.notifyChange();
  }

  /**
   * Select a node
   */
  public selectNode(nodeId: string | null): void {
    // Deselect previous
    if (this.selectedNode) {
      this.selectedNode.selected = false;
    }

    // Select new
    if (nodeId) {
      const node = this.nodeMap.get(nodeId);
      if (node) {
        node.selected = true;
        this.selectedNode = node;
        this.notifySelection(node);
      }
    } else {
      this.selectedNode = null;
      this.notifySelection(null);
    }

    this.notifyChange();
  }

  /**
   * Get the currently selected node
   */
  public getSelectedNode(): DLGTreeNode | null {
    return this.selectedNode;
  }

  /**
   * Get a node by ID
   */
  public getNode(nodeId: string): DLGTreeNode | undefined {
    return this.nodeMap.get(nodeId);
  }

  /**
   * Get all root nodes
   */
  public getRootNodes(): DLGTreeNode[] {
    return this.rootNodes;
  }

  /**
   * Get a flattened list of all visible nodes (respecting expansion state)
   */
  public getVisibleNodes(): DLGTreeNode[] {
    const visible: DLGTreeNode[] = [];

    const traverse = (node: DLGTreeNode) => {
      if (node.visible) {
        visible.push(node);
        if (node.expanded && node.childrenLoaded) {
          node.children.forEach(traverse);
        }
      }
    };

    this.rootNodes.forEach(traverse);
    return visible;
  }

  /**
   * Get all nodes (including non-visible)
   */
  public getAllNodes(): DLGTreeNode[] {
    return Array.from(this.nodeMap.values());
  }

  /**
   * Find nodes matching a filter
   */
  public filterNodes(predicate: (node: DLGTreeNode) => boolean): DLGTreeNode[] {
    return Array.from(this.nodeMap.values()).filter(predicate);
  }

  /**
   * Search for nodes by text
   */
  public searchByText(query: string, caseSensitive: boolean = false): DLGTreeNode[] {
    const searchTerm = caseSensitive ? query : query.toLowerCase();

    return this.filterNodes(node => {
      const text = caseSensitive ? node.dlgNode.text : node.dlgNode.text.toLowerCase();
      const comment = caseSensitive ? node.dlgNode.comment : node.dlgNode.comment.toLowerCase();
      const speaker = caseSensitive ? node.dlgNode.speakerTag : node.dlgNode.speakerTag.toLowerCase();

      return text.includes(searchTerm) ||
             comment.includes(searchTerm) ||
             speaker.includes(searchTerm);
    });
  }

  /**
   * Get the path to a node (list of indices from root)
   */
  public getNodePath(nodeId: string): number[] | null {
    const node = this.nodeMap.get(nodeId);
    return node ? node.path : null;
  }

  /**
   * Get a node by path
   */
  public getNodeByPath(path: number[]): DLGTreeNode | null {
    let current: DLGTreeNode[] = this.rootNodes;
    let node: DLGTreeNode | null = null;

    for (const index of path) {
      if (index >= current.length) return null;
      node = current[index];

      // Load children if not loaded
      if (!node.childrenLoaded && path[path.indexOf(index) + 1] !== undefined) {
        this.loadChildren(node);
      }

      current = node.children;
    }

    return node;
  }

  /**
   * Get all references to a specific entry/reply node
   */
  public getNodeReferences(listIndex: number, nodeType: DLGNodeType): DLGNodeReference[] {
    const references: DLGNodeReference[] = [];

    this.getAllNodes().forEach(treeNode => {
      treeNode.children.forEach((child, idx) => {
        if (child.listIndex === listIndex && child.nodeType === nodeType) {
          references.push({
            sourceNode: treeNode,
            targetNode: child,
            linkIndex: idx
          });
        }
      });
    });

    return references;
  }

  /**
   * Check if a node is an orphan (has no references)
   */
  public isNodeOrphan(listIndex: number, nodeType: DLGNodeType): boolean {
    const references = this.getNodeReferences(listIndex, nodeType);
    return references.length === 0;
  }

  /**
   * Mark orphan nodes
   */
  public markOrphans(): void {
    // Reset all orphan flags
    this.getAllNodes().forEach(node => {
      node.isOrphan = false;
    });

    // Check entries
    this.dlg.entryList.forEach((entry, index) => {
      const isOrphan = this.isNodeOrphan(index, DLGNodeType.ENTRY);
      // Mark all tree nodes representing this entry
      this.filterNodes(node =>
        node.listIndex === index && node.nodeType === DLGNodeType.ENTRY
      ).forEach(node => {
        node.isOrphan = isOrphan;
      });
    });

    // Check replies
    this.dlg.replyList.forEach((reply, index) => {
      const isOrphan = this.isNodeOrphan(index, DLGNodeType.REPLY);
      // Mark all tree nodes representing this reply
      this.filterNodes(node =>
        node.listIndex === index && node.nodeType === DLGNodeType.REPLY
      ).forEach(node => {
        node.isOrphan = isOrphan;
      });
    });

    this.notifyChange();
  }

  /**
   * Add a new starting node
   */
  public addStartingNode(entryIndex: number): void {
    // Create a minimal starting node structure
    const startNode = new DLGNode(this.dlg);
    startNode.nodeType = DLGNodeType.STARTING;

    // Link to the entry
    const entry = this.dlg.entryList[entryIndex];
    if (entry) {
      startNode.entries = [entry];
    }

    this.dlg.startingList.push(startNode);

    // Rebuild tree
    this.buildTree();
  }

  /**
   * Remove a starting node
   */
  public removeStartingNode(index: number): void {
    if (index >= 0 && index < this.dlg.startingList.length) {
      this.dlg.startingList.splice(index, 1);
      this.buildTree();
    }
  }

  /**
   * Add a link from source to target
   */
  public addLink(sourceNodeId: string, targetListIndex: number, targetType: DLGNodeType): void {
    const sourceNode = this.nodeMap.get(sourceNodeId);
    if (!sourceNode) return;

    const sourceDlgNode = sourceNode.dlgNode;

    // Get the target node from the appropriate list
    let targetDlgNode: DLGNode | undefined;
    if (targetType === DLGNodeType.ENTRY) {
      targetDlgNode = this.dlg.entryList[targetListIndex];
    } else if (targetType === DLGNodeType.REPLY) {
      targetDlgNode = this.dlg.replyList[targetListIndex];
    }

    if (!targetDlgNode) return;

    // Add the link
    if (sourceNode.nodeType === DLGNodeType.ENTRY || sourceNode.nodeType === DLGNodeType.STARTING) {
      // Add to replies
      if (!sourceDlgNode.replies.includes(targetDlgNode)) {
        sourceDlgNode.replies.push(targetDlgNode);
      }
    } else if (sourceNode.nodeType === DLGNodeType.REPLY) {
      // Add to entries
      if (!sourceDlgNode.entries.includes(targetDlgNode)) {
        sourceDlgNode.entries.push(targetDlgNode);
      }
    }

    // Reload children
    sourceNode.childrenLoaded = false;
    this.loadChildren(sourceNode);
    this.notifyChange();
  }

  /**
   * Remove a link
   */
  public removeLink(sourceNodeId: string, linkIndex: number): void {
    const sourceNode = this.nodeMap.get(sourceNodeId);
    if (!sourceNode) return;

    const sourceDlgNode = sourceNode.dlgNode;

    // Remove from appropriate list
    if (sourceNode.nodeType === DLGNodeType.ENTRY || sourceNode.nodeType === DLGNodeType.STARTING) {
      sourceDlgNode.replies.splice(linkIndex, 1);
    } else if (sourceNode.nodeType === DLGNodeType.REPLY) {
      sourceDlgNode.entries.splice(linkIndex, 1);
    }

    // Reload children
    sourceNode.children.splice(linkIndex, 1);
    this.notifyChange();
  }

  /**
   * Move a link within a node's children
   */
  public moveLink(sourceNodeId: string, fromIndex: number, toIndex: number): void {
    const sourceNode = this.nodeMap.get(sourceNodeId);
    if (!sourceNode) return;

    const sourceDlgNode = sourceNode.dlgNode;

    // Move in appropriate list
    let list: DLGNode[];
    if (sourceNode.nodeType === DLGNodeType.ENTRY || sourceNode.nodeType === DLGNodeType.STARTING) {
      list = sourceDlgNode.replies;
    } else if (sourceNode.nodeType === DLGNodeType.REPLY) {
      list = sourceDlgNode.entries;
    } else {
      return;
    }

    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    // Reload children
    sourceNode.childrenLoaded = false;
    this.loadChildren(sourceNode);
    this.notifyChange();
  }

  /**
   * Copy a node (creates a copy flag, not a deep clone)
   */
  public copyNode(nodeId: string): DLGTreeNode | null {
    const node = this.nodeMap.get(nodeId);
    if (!node) return null;

    // Create a shallow copy with copy flag
    const copy: DLGTreeNode = {
      ...node,
      id: this.generateId(),
      isCopy: true,
      selected: false,
      children: []
    };

    return copy;
  }

  /**
   * Register a change listener
   */
  public onChange(listener: (nodes: DLGTreeNode[]) => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Register a selection listener
   */
  public onSelectionChange(listener: (node: DLGTreeNode | null) => void): () => void {
    this.selectionListeners.push(listener);
    return () => {
      const index = this.selectionListeners.indexOf(listener);
      if (index > -1) {
        this.selectionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyChange(): void {
    this.changeListeners.forEach(listener => {
      listener(this.rootNodes);
    });
  }

  /**
   * Notify all listeners of selection changes
   */
  private notifySelection(node: DLGTreeNode | null): void {
    this.selectionListeners.forEach(listener => {
      listener(node);
    });
  }

  /**
   * Refresh the entire tree
   */
  public refresh(): void {
    this.buildTree();
  }

  /**
   * Get statistics about the dialog
   */
  public getStatistics() {
    return {
      startingNodes: this.dlg.startingList.length,
      entryNodes: this.dlg.entryList.length,
      replyNodes: this.dlg.replyList.length,
      totalTreeNodes: this.nodeMap.size
    };
  }
}
