/**
 * DLGUndoManager class.
 *
 * Manages undo/redo operations for the DLG editor.
 * Based on PyKotor's QUndoStack implementation.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGUndoManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { DLGNode } from '@/resource/DLGNode';
import { DLGObject } from '@/resource/DLGObject';
import { UndoCommand, UndoManager } from '@/apps/forge/managers/UndoManager';

export interface UndoAction extends UndoCommand {}

export class DLGUndoManager extends UndoManager {
  constructor(maxStackSize: number = 100) {
    super(maxStackSize);
  }
}

/**
 * Factory functions for creating common undo actions
 */
export class DLGUndoActions {
  /**
   * Create an action for editing node text
   */
  static editNodeText(
    node: DLGNode,
    oldText: string,
    newText: string
  ): UndoAction {
    return {
      type: 'edit-node-text',
      description: `Edit node text`,
      undo: () => {
        node.text = oldText;
      },
      redo: () => {
        node.text = newText;
      }
    };
  }

  /**
   * Create an action for editing node comment
   */
  static editNodeComment(
    node: DLGNode,
    oldComment: string,
    newComment: string
  ): UndoAction {
    return {
      type: 'edit-node-comment',
      description: `Edit node comment`,
      undo: () => {
        node.comment = oldComment;
      },
      redo: () => {
        node.comment = newComment;
      }
    };
  }

  /**
   * Create an action for editing node speaker
   */
  static editNodeSpeaker(
    node: DLGNode,
    oldSpeaker: string,
    newSpeaker: string
  ): UndoAction {
    return {
      type: 'edit-node-speaker',
      description: `Edit node speaker`,
      undo: () => {
        node.speakerTag = oldSpeaker;
      },
      redo: () => {
        node.speakerTag = newSpeaker;
      }
    };
  }

  /**
   * Create an action for editing node listener
   */
  static editNodeListener(
    node: DLGNode,
    oldListener: string,
    newListener: string
  ): UndoAction {
    return {
      type: 'edit-node-listener',
      description: `Edit node listener`,
      undo: () => {
        node.listenerTag = oldListener;
      },
      redo: () => {
        node.listenerTag = newListener;
      }
    };
  }

  /**
   * Create an action for editing node VO
   */
  static editNodeVO(
    node: DLGNode,
    oldVO: string,
    newVO: string
  ): UndoAction {
    return {
      type: 'edit-node-vo',
      description: `Edit node voice-over`,
      undo: () => {
        node.vo_resref = oldVO;
      },
      redo: () => {
        node.vo_resref = newVO;
      }
    };
  }

  /**
   * Create an action for editing node sound
   */
  static editNodeSound(
    node: DLGNode,
    oldSound: string,
    newSound: string
  ): UndoAction {
    return {
      type: 'edit-node-sound',
      description: `Edit node sound`,
      undo: () => {
        node.sound = oldSound;
      },
      redo: () => {
        node.sound = newSound;
      }
    };
  }

  /**
   * Create an action for editing node delay
   */
  static editNodeDelay(
    node: DLGNode,
    oldDelay: number,
    newDelay: number
  ): UndoAction {
    return {
      type: 'edit-node-delay',
      description: `Edit node delay`,
      undo: () => {
        node.delay = oldDelay;
      },
      redo: () => {
        node.delay = newDelay;
      }
    };
  }

  /**
   * Create an action for editing node camera angle
   */
  static editNodeCameraAngle(
    node: DLGNode,
    oldAngle: number,
    newAngle: number
  ): UndoAction {
    return {
      type: 'edit-node-camera-angle',
      description: `Edit node camera angle`,
      undo: () => {
        node.cameraAngle = oldAngle;
      },
      redo: () => {
        node.cameraAngle = newAngle;
      }
    };
  }

  /**
   * Create an action for editing node camera ID
   */
  static editNodeCameraID(
    node: DLGNode,
    oldID: number,
    newID: number
  ): UndoAction {
    return {
      type: 'edit-node-camera-id',
      description: `Edit node camera ID`,
      undo: () => {
        node.cameraID = oldID;
      },
      redo: () => {
        node.cameraID = newID;
      }
    };
  }

  /**
   * Create an action for adding a link
   */
  static addLink(
    sourceNode: DLGNode,
    targetNode: DLGNode,
    isReply: boolean
  ): UndoAction {
    return {
      type: 'add-link',
      description: `Add link`,
      undo: () => {
        const list = isReply ? sourceNode.replies : sourceNode.entries;
        const index = list.indexOf(targetNode);
        if (index > -1) {
          list.splice(index, 1);
        }
      },
      redo: () => {
        const list = isReply ? sourceNode.replies : sourceNode.entries;
        if (!list.includes(targetNode)) {
          list.push(targetNode);
        }
      }
    };
  }

  /**
   * Create an action for removing a link
   */
  static removeLink(
    sourceNode: DLGNode,
    targetNode: DLGNode,
    index: number,
    isReply: boolean
  ): UndoAction {
    return {
      type: 'remove-link',
      description: `Remove link`,
      undo: () => {
        const list = isReply ? sourceNode.replies : sourceNode.entries;
        list.splice(index, 0, targetNode);
      },
      redo: () => {
        const list = isReply ? sourceNode.replies : sourceNode.entries;
        list.splice(index, 1);
      }
    };
  }

  /**
   * Create an action for moving a link
   */
  static moveLink(
    sourceNode: DLGNode,
    fromIndex: number,
    toIndex: number,
    isReply: boolean
  ): UndoAction {
    return {
      type: 'move-link',
      description: `Move link`,
      undo: () => {
        const list = isReply ? sourceNode.replies : sourceNode.entries;
        const [moved] = list.splice(toIndex, 1);
        list.splice(fromIndex, 0, moved);
      },
      redo: () => {
        const list = isReply ? sourceNode.replies : sourceNode.entries;
        const [moved] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, moved);
      }
    };
  }

  /**
   * Create an action for adding a starting node
   */
  static addStartingNode(
    dlg: DLGObject,
    node: DLGNode,
    index: number
  ): UndoAction {
    return {
      type: 'add-starting-node',
      description: `Add starting node`,
      undo: () => {
        dlg.startingList.splice(index, 1);
      },
      redo: () => {
        dlg.startingList.splice(index, 0, node);
      }
    };
  }

  /**
   * Create an action for removing a starting node
   */
  static removeStartingNode(
    dlg: DLGObject,
    node: DLGNode,
    index: number
  ): UndoAction {
    return {
      type: 'remove-starting-node',
      description: `Remove starting node`,
      undo: () => {
        dlg.startingList.splice(index, 0, node);
      },
      redo: () => {
        dlg.startingList.splice(index, 1);
      }
    };
  }

  /**
   * Create a batch action
   */
  static batch(actions: UndoAction[], description: string): UndoAction {
    return {
      type: 'batch',
      description,
      undo: () => {
        // Undo in reverse order
        for (let i = actions.length - 1; i >= 0; i--) {
          actions[i].undo();
        }
      },
      redo: () => {
        // Redo in forward order
        for (const action of actions) {
          action.redo();
        }
      }
    };
  }
}
