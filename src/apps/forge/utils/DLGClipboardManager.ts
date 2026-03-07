/**
 * DLGClipboardManager class.
 *
 * Manages copy/paste operations for DLG nodes.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGClipboardManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */


import { DLGNodeType } from '@/enums/dialog/DLGNodeType';
import { DLGNode } from '@/resource/DLGNode';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export interface DLGNodeSerialized {
  nodeType: number;
  text?: string;
  comment?: string;
  speakerTag?: string;
  listenerTag?: string;
  vo_resref?: string;
  sound?: string;
  delay?: number;
  cameraAngle?: number;
  cameraID?: number;
}

export interface ClipboardData {
  node: DLGNode;
  nodeType: DLGNodeType;
  listIndex: number;
  timestamp: number;
  isCut: boolean;
}

interface ClipboardImportData {
  type: string;
  node: DLGNodeSerialized;
  nodeType: DLGNodeType;
  listIndex: number;
  isCut?: boolean;
}

export class DLGClipboardManager {
  private clipboard: ClipboardData | null = null;
  private changeListeners: (() => void)[] = [];

  /**
   * Copy a node to clipboard
   */
  public copy(node: DLGNode, nodeType: DLGNodeType, listIndex: number): void {
    this.clipboard = {
      node: this.cloneNode(node),
      nodeType,
      listIndex,
      timestamp: Date.now(),
      isCut: false
    };

    this.notifyChange();
  }

  /**
   * Cut a node to clipboard
   */
  public cut(node: DLGNode, nodeType: DLGNodeType, listIndex: number): void {
    this.clipboard = {
      node: this.cloneNode(node),
      nodeType,
      listIndex,
      timestamp: Date.now(),
      isCut: true
    };

    this.notifyChange();
  }

  /**
   * Get clipboard data
   */
  public getClipboard(): ClipboardData | null {
    return this.clipboard;
  }

  /**
   * Check if clipboard has data
   */
  public hasClipboard(): boolean {
    return this.clipboard !== null;
  }

  /**
   * Check if clipboard is cut operation
   */
  public isCut(): boolean {
    return this.clipboard?.isCut || false;
  }

  /**
   * Clear clipboard
   */
  public clear(): void {
    this.clipboard = null;
    this.notifyChange();
  }

  /**
   * Clone a DLG node (deep copy)
   */
  private cloneNode(node: DLGNode): DLGNode {
    // Create a new node with the same dialog parent
    const cloned = new DLGNode(node.dialog);

    // Copy basic properties
    cloned.nodeType = node.nodeType;
    cloned.nodeEngineType = node.nodeEngineType;
    cloned.cameraAngle = node.cameraAngle;
    cloned.cameraID = node.cameraID;
    cloned.cameraAnimation = node.cameraAnimation;
    cloned.camFieldOfView = node.camFieldOfView;
    cloned.camVidEffect = node.camVidEffect;
    cloned.comment = node.comment;
    cloned.delay = node.delay;
    cloned.fadeType = node.fadeType;
    cloned.listenerTag = node.listenerTag;
    cloned.plotIndex = node.plotIndex;
    cloned.plotXPPercentage = node.plotXPPercentage;
    cloned.quest = node.quest;
    cloned.questEntry = node.questEntry;
    cloned.sound = node.sound;
    cloned.soundExists = node.soundExists;
    cloned.speakerTag = node.speakerTag;
    cloned.text = node.text;
    cloned.vo_resref = node.vo_resref;
    cloned.waitFlags = node.waitFlags;
    cloned.Logic = node.Logic;
    cloned.isChild = node.isChild;
    cloned.alienRaceNode = node.alienRaceNode;
    cloned.emotion = node.emotion;
    cloned.facialAnimation = node.facialAnimation;
    cloned.postProcessNode = node.postProcessNode;
    cloned.recordNoVOOverride = node.recordNoVOOverride;
    cloned.recordVO = node.recordVO;
    cloned.voTextChanged = node.voTextChanged;

    // Copy animations (shallow copy of array)
    cloned.animations = [...node.animations];

    // Don't copy references (replies/entries), as these will need to be re-linked
    // in the paste operation
    cloned.replies = [];
    cloned.entries = [];

    // Copy scripts (references, not deep clones)
    cloned.script = node.script;
    cloned.scriptParams = { ...node.scriptParams };
    cloned.script2 = node.script2;
    cloned.script2Params = { ...node.script2Params };
    cloned.isActive = node.isActive;
    cloned.isActiveParams = { ...node.isActiveParams };
    cloned.isActive2 = node.isActive2;
    cloned.isActive2Params = { ...node.isActive2Params };

    // Copy fade settings
    cloned.fade = {
      type: node.fade.type,
      length: node.fade.length,
      delay: node.fade.delay,
      color: { ...node.fade.color },
      started: false
    };

    return cloned;
  }

  /**
   * Register a change listener
   */
  public onChange(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners
   */
  private notifyChange(): void {
    this.changeListeners.forEach(listener => listener());
  }

  /**
   * Export clipboard to system clipboard
   */
  public async exportToSystemClipboard(): Promise<void> {
    if (!this.clipboard) return;

    const data = {
      type: 'kotor-dlg-node',
      node: this.serializeNode(this.clipboard.node),
      nodeType: this.clipboard.nodeType,
      listIndex: this.clipboard.listIndex,
      isCut: this.clipboard.isCut
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(data));
    } catch (error) {
      log.error('Failed to write to system clipboard:', error);
    }
  }

  /**
   * Import clipboard from system clipboard
   */
  public async importFromSystemClipboard(): Promise<boolean> {
    try {
      const text = await navigator.clipboard.readText();
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null) {
        return false;
      }
      const data = parsed as Partial<ClipboardImportData>;

      if (data.type !== 'kotor-dlg-node' || data.node == null || data.nodeType == null || data.listIndex == null) {
        return false;
      }

      const node = this.deserializeNode(data.node);
      this.clipboard = {
        node,
        nodeType: data.nodeType as DLGNodeType,
        listIndex: data.listIndex as number,
        timestamp: Date.now(),
        isCut: data.isCut || false
      };

      this.notifyChange();
      return true;
    } catch (error) {
      log.error('Failed to read from system clipboard:', error);
      return false;
    }
  }

  /**
   * Serialize a node for clipboard export
   */
  private serializeNode(node: DLGNode): DLGNodeSerialized {
    return {
      nodeType: node.nodeType,
      text: node.text,
      comment: node.comment,
      speakerTag: node.speakerTag,
      listenerTag: node.listenerTag,
      vo_resref: node.vo_resref,
      sound: node.sound,
      delay: node.delay,
      cameraAngle: node.cameraAngle,
      cameraID: node.cameraID,
      // ... include other serializable properties
    };
  }

  /**
   * Deserialize a node from clipboard import
   */
  private deserializeNode(data: DLGNodeSerialized): DLGNode {
    const node = new DLGNode();
    node.nodeType = data.nodeType as DLGNodeType;
    node.text = data.text ?? '';
    node.comment = data.comment ?? '';
    node.speakerTag = data.speakerTag ?? '';
    node.listenerTag = data.listenerTag ?? '';
    node.vo_resref = data.vo_resref ?? '';
    node.sound = data.sound ?? '';
    node.delay = data.delay ?? 0;
    node.cameraAngle = data.cameraAngle ?? 0;
    node.cameraID = data.cameraID ?? 0;
    // ... restore other properties
    return node;
  }
}
