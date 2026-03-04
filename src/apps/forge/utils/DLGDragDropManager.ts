/**
 * DLGDragDropManager class.
 *
 * Manages drag and drop operations for DLG tree nodes.
 * Based on PyKotor's drag/drop implementation.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGDragDropManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */


import { DLGTreeNode } from '@/apps/forge/interfaces/DLGTreeNode';
import { DLGTreeModel } from '@/apps/forge/utils/DLGTreeModel';
import { DLGNodeType } from '@/enums/dialog/DLGNodeType';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export enum DropPosition {
  BEFORE = 'before',
  AFTER = 'after',
  ON = 'on',
  INVALID = 'invalid'
}

export interface DropTarget {
  node: DLGTreeNode;
  position: DropPosition;
  canDrop: boolean;
  reason?: string;
}

export interface DragData {
  nodeId: string;
  listIndex: number;
  nodeType: DLGNodeType;
  sourceParentId?: string;
  sourceLinkIndex?: number;
}

export class DLGDragDropManager {
  private model: DLGTreeModel;
  private currentDrag: DragData | null = null;
  private currentDropTarget: DropTarget | null = null;

  constructor(model: DLGTreeModel) {
    this.model = model;
  }

  /**
   * Start a drag operation
   */
  public startDrag(dragData: DragData): void {
    this.currentDrag = dragData;
  }

  /**
   * End the drag operation
   */
  public endDrag(): void {
    this.currentDrag = null;
    this.currentDropTarget = null;
  }

  /**
   * Get the current drag data
   */
  public getDragData(): DragData | null {
    return this.currentDrag;
  }

  /**
   * Validate if a drop is allowed
   */
  public validateDrop(targetNode: DLGTreeNode, position: DropPosition): DropTarget {
    if (!this.currentDrag) {
      return {
        node: targetNode,
        position,
        canDrop: false,
        reason: 'No active drag operation'
      };
    }

    const dragNode = this.model.getNode(this.currentDrag.nodeId);
    if (!dragNode) {
      return {
        node: targetNode,
        position,
        canDrop: false,
        reason: 'Drag node not found'
      };
    }

    // Can't drop on self
    if (dragNode.id === targetNode.id) {
      return {
        node: targetNode,
        position,
        canDrop: false,
        reason: 'Cannot drop on self'
      };
    }

    // Can't drop on descendants
    if (this.isDescendant(targetNode, dragNode)) {
      return {
        node: targetNode,
        position,
        canDrop: false,
        reason: 'Cannot drop on descendant'
      };
    }

    // Validate node type compatibility
    const typeValidation = this.validateNodeTypeCompatibility(dragNode, targetNode, position);
    if (!typeValidation.valid) {
      return {
        node: targetNode,
        position,
        canDrop: false,
        reason: typeValidation.reason
      };
    }

    return {
      node: targetNode,
      position,
      canDrop: true
    };
  }

  /**
   * Check if a node is a descendant of another
   */
  private isDescendant(potentialDescendant: DLGTreeNode, ancestor: DLGTreeNode): boolean {
    let current: DLGTreeNode | undefined = potentialDescendant;

    while (current) {
      if (current.id === ancestor.id) {
        return true;
      }
      current = current.parent;
    }

    return false;
  }

  /**
   * Validate node type compatibility for drop
   */
  private validateNodeTypeCompatibility(
    dragNode: DLGTreeNode,
    targetNode: DLGTreeNode,
    position: DropPosition
  ): { valid: boolean; reason?: string } {
    // Starting nodes can only be at root level
    if (dragNode.nodeType === DLGNodeType.STARTING && position === DropPosition.ON) {
      return { valid: false, reason: 'Starting nodes cannot be children' };
    }

    // Entries can link to replies, replies can link to entries
    if (position === DropPosition.ON) {
      if (targetNode.nodeType === DLGNodeType.STARTING) {
        // Starting nodes can only link to entries
        if (dragNode.nodeType !== DLGNodeType.ENTRY) {
          return { valid: false, reason: 'Starting nodes can only link to entries' };
        }
      } else if (targetNode.nodeType === DLGNodeType.ENTRY) {
        // Entries can only link to replies
        if (dragNode.nodeType !== DLGNodeType.REPLY) {
          return { valid: false, reason: 'Entries can only link to replies' };
        }
      } else if (targetNode.nodeType === DLGNodeType.REPLY) {
        // Replies can only link to entries
        if (dragNode.nodeType !== DLGNodeType.ENTRY) {
          return { valid: false, reason: 'Replies can only link to entries' };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Execute a drop operation
   */
  public executeDrop(targetNode: DLGTreeNode, position: DropPosition): boolean {
    if (!this.currentDrag) return false;

    const validation = this.validateDrop(targetNode, position);
    if (!validation.canDrop) {
      log.warn('Drop not allowed:', validation.reason);
      return false;
    }

    const dragNode = this.model.getNode(this.currentDrag.nodeId);
    if (!dragNode) return false;

    try {
      switch (position) {
        case DropPosition.ON:
          this.dropOn(dragNode, targetNode);
          break;
        case DropPosition.BEFORE:
          this.dropBefore(dragNode, targetNode);
          break;
        case DropPosition.AFTER:
          this.dropAfter(dragNode, targetNode);
          break;
        default:
          return false;
      }

      this.endDrag();
      return true;
    } catch (error) {
      log.error('Drop operation failed:', error);
      return false;
    }
  }

  /**
   * Drop a node onto another (create link)
   */
  private dropOn(dragNode: DLGTreeNode, targetNode: DLGTreeNode): void {
    // Add a link from target to drag node
    this.model.addLink(targetNode.id, dragNode.listIndex, dragNode.nodeType);
  }

  /**
   * Drop a node before another (reorder)
   */
  private dropBefore(dragNode: DLGTreeNode, targetNode: DLGTreeNode): void {
    if (!targetNode.parent) {
      // Moving at root level
      this.moveStartingNode(dragNode, targetNode, true);
    } else {
      // Moving within parent's children
      this.moveLink(dragNode, targetNode, true);
    }
  }

  /**
   * Drop a node after another (reorder)
   */
  private dropAfter(dragNode: DLGTreeNode, targetNode: DLGTreeNode): void {
    if (!targetNode.parent) {
      // Moving at root level
      this.moveStartingNode(dragNode, targetNode, false);
    } else {
      // Moving within parent's children
      this.moveLink(dragNode, targetNode, false);
    }
  }

  /**
   * Move a starting node
   */
  private moveStartingNode(dragNode: DLGTreeNode, targetNode: DLGTreeNode, _before: boolean): void {
    if (dragNode.nodeType !== DLGNodeType.STARTING || targetNode.nodeType !== DLGNodeType.STARTING) {
      throw new Error('Both nodes must be starting nodes');
    }

    // This would require implementing starting node reordering in the model
    log.warn('Starting node reordering not yet implemented');
  }

  /**
   * Move a link (reorder children)
   */
  private moveLink(dragNode: DLGTreeNode, targetNode: DLGTreeNode, before: boolean): void {
    const parent = targetNode.parent;
    if (!parent) {
      throw new Error('Target node has no parent');
    }

    // Find indices
    const dragIndex = parent.children.findIndex(c => c.id === dragNode.id);
    let targetIndex = parent.children.findIndex(c => c.id === targetNode.id);

    if (dragIndex === -1) {
      throw new Error('Drag node not found in parent children');
    }

    if (targetIndex === -1) {
      throw new Error('Target node not found in parent children');
    }

    // Adjust target index if needed
    if (!before) {
      targetIndex++;
    }

    // If dragging within same parent, adjust indices
    if (dragIndex < targetIndex) {
      targetIndex--;
    }

    this.model.moveLink(parent.id, dragIndex, targetIndex);
  }

  /**
   * Set the current drop target for visual feedback
   */
  public setDropTarget(target: DropTarget | null): void {
    this.currentDropTarget = target;
  }

  /**
   * Get the current drop target
   */
  public getDropTarget(): DropTarget | null {
    return this.currentDropTarget;
  }

  /**
   * Calculate drop position from mouse coordinates
   */
  public calculateDropPosition(
    targetElement: HTMLElement,
    mouseY: number
  ): DropPosition {
    const rect = targetElement.getBoundingClientRect();
    const y = mouseY - rect.top;
    const height = rect.height;
    const threshold = height * 0.25;

    if (y < threshold) {
      return DropPosition.BEFORE;
    } else if (y > height - threshold) {
      return DropPosition.AFTER;
    } else {
      return DropPosition.ON;
    }
  }

  /**
   * Create a copy of a node for drag operation
   */
  public createDragCopy(node: DLGTreeNode): DragData {
    return {
      nodeId: node.id,
      listIndex: node.listIndex,
      nodeType: node.nodeType,
      sourceParentId: node.parent?.id,
      sourceLinkIndex: node.linkIndex
    };
  }
}
