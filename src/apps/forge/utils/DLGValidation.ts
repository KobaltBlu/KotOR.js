/**
 * DLGValidation utility.
 *
 * Validation utilities for DLG nodes and dialogs.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGValidation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { DLGNodeType } from '@/enums/dialog/DLGNodeType';
import { DLGNode } from '@/resource/DLGNode';
import { DLGObject } from '@/resource/DLGObject';

export enum ValidationSeverity {
  Error = 0,
  Warning = 1,
  Info = 2
}

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  node?: DLGNode;
  nodeIndex?: number;
  nodeType?: DLGNodeType;
  code: string;
  autoFix?: boolean;
}

export class DLGValidation {
  private dlg: DLGObject;
  private issues: ValidationIssue[] = [];

  constructor(dlg: DLGObject) {
    this.dlg = dlg;
  }

  /**
   * Validate the entire dialog
   */
  public validate(): ValidationIssue[] {
    this.issues = [];

    this.validateStartingNodes();
    this.validateEntryNodes();
    this.validateReplyNodes();
    this.validateOrphans();
    this.validateCircularReferences();
    this.validateScripts();
    this.validateAudioReferences();

    return this.issues;
  }

  /**
   * Validate starting nodes
   */
  private validateStartingNodes(): void {
    if (this.dlg.startingList.length === 0) {
      this.issues.push({
        severity: ValidationSeverity.Error,
        message: 'Dialog has no starting nodes',
        code: 'NO_STARTING_NODES',
        autoFix: false
      });
    }

    this.dlg.startingList.forEach((startNode, index) => {
      if (!startNode.entries || startNode.entries.length === 0) {
        this.issues.push({
          severity: ValidationSeverity.Error,
          message: `Starting node [${index}] has no entry links`,
          node: startNode,
          nodeIndex: index,
          nodeType: DLGNodeType.STARTING,
          code: 'STARTING_NO_ENTRIES',
          autoFix: false
        });
      }
    });
  }

  /**
   * Validate entry nodes
   */
  private validateEntryNodes(): void {
    this.dlg.entryList.forEach((entry, index) => {
      // Check for empty text
      if (!entry.text || entry.text.trim() === '') {
        this.issues.push({
          severity: ValidationSeverity.Warning,
          message: `Entry [${index}] has no text`,
          node: entry,
          nodeIndex: index,
          nodeType: DLGNodeType.ENTRY,
          code: 'EMPTY_TEXT',
          fixable: false
        });
      }

      // Check for speaker
      if (!entry.speakerTag || entry.speakerTag.trim() === '') {
        this.issues.push({
          severity: ValidationSeverity.Warning,
          message: `Entry [${index}] has no speaker tag`,
          node: entry,
          nodeIndex: index,
          nodeType: DLGNodeType.ENTRY,
          code: 'NO_SPEAKER',
          autoFix: false
        });
      }

      // Check for VO if text exists
      if (entry.text && entry.text.trim() !== '' && !entry.vo_resref && this.dlg.vo_id) {
        this.issues.push({
          severity: ValidationSeverity.Info,
          message: `Entry [${index}] has text but no voice-over`,
          node: entry,
          nodeIndex: index,
          nodeType: DLGNodeType.ENTRY,
          code: 'NO_VO',
          autoFix: false
        });
      }

      // Check for reply links
      if (entry.replies.length === 0 && !this.isEndNode(entry)) {
        this.issues.push({
          severity: ValidationSeverity.Warning,
          message: `Entry [${index}] has no reply links (not marked as end node)`,
          node: entry,
          nodeIndex: index,
          nodeType: DLGNodeType.ENTRY,
          code: 'NO_REPLIES',
          autoFix: false
        });
      }
    });
  }

  /**
   * Validate reply nodes
   */
  private validateReplyNodes(): void {
    this.dlg.replyList.forEach((reply, index) => {
      // Check for empty text
      if (!reply.text || reply.text.trim() === '') {
        this.issues.push({
          severity: ValidationSeverity.Warning,
          message: `Reply [${index}] has no text`,
          node: reply,
          nodeIndex: index,
          nodeType: DLGNodeType.REPLY,
          code: 'EMPTY_TEXT',
          autoFix: false
        });
      }

      // Check for entry links
      if (reply.entries.length === 0 && !this.isEndNode(reply)) {
        this.issues.push({
          severity: ValidationSeverity.Warning,
          message: `Reply [${index}] has no entry links (not marked as end node)`,
          node: reply,
          nodeIndex: index,
          nodeType: DLGNodeType.REPLY,
          code: 'NO_ENTRIES',
          autoFix: false
        });
      }
    });
  }

  /**
   * Check if a node is marked as an end node
   */
  private isEndNode(node: DLGNode): boolean {
    // A node is considered an end node if it has specific text patterns
    // or if it's explicitly marked (would need to check node flags)
    const text = node.text?.toLowerCase() || '';
    return text.includes('[end]') || text.includes('goodbye') || text.includes('farewell');
  }

  /**
   * Validate for orphan nodes (unreferenced)
   */
  private validateOrphans(): void {
    const referencedEntries = new Set<number>();
    const referencedReplies = new Set<number>();

    // Collect all referenced entries and replies
    this.dlg.startingList.forEach(start => {
      start.entries.forEach(entry => {
        referencedEntries.add(entry.index);
      });
    });

    this.dlg.entryList.forEach(entry => {
      entry.replies.forEach(reply => {
        referencedReplies.add(reply.index);
      });
    });

    this.dlg.replyList.forEach(reply => {
      reply.entries.forEach(entry => {
        referencedEntries.add(entry.index);
      });
    });

    // Check for orphans
    this.dlg.entryList.forEach((entry, index) => {
      if (!referencedEntries.has(index)) {
        this.issues.push({
          severity: ValidationSeverity.Warning,
          message: `Entry [${index}] is never referenced (orphan)`,
          node: entry,
          nodeIndex: index,
          nodeType: DLGNodeType.ENTRY,
          code: 'ORPHAN_NODE',
          autoFix: true
        });
      }
    });

    this.dlg.replyList.forEach((reply, index) => {
      if (!referencedReplies.has(index)) {
        this.issues.push({
          severity: ValidationSeverity.Warning,
          message: `Reply [${index}] is never referenced (orphan)`,
          node: reply,
          nodeIndex: index,
          nodeType: DLGNodeType.REPLY,
          code: 'ORPHAN_NODE',
          fixable: true
        });
      }
    });
  }

  /**
   * Validate for circular references
   */
  private validateCircularReferences(): void {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const checkCircular = (node: DLGNode, path: string): boolean => {
      const nodeId = `${node.nodeType}-${node.index}`;

      if (stack.has(nodeId)) {
        return true; // Circular reference found
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      stack.add(nodeId);

      // Check children
      const children = node.nodeType === DLGNodeType.ENTRY ? node.replies : node.entries;
      for (const child of children) {
        if (checkCircular(child, `${path} -> ${child.nodeType}-${child.index}`)) {
          return true;
        }
      }

      stack.delete(nodeId);
      return false;
    };

    this.dlg.startingList.forEach((start, index) => {
      start.entries.forEach(entry => {
        visited.clear();
        stack.clear();

        if (checkCircular(entry, `Start[${index}] -> Entry[${entry.index}]`)) {
          this.issues.push({
            severity: ValidationSeverity.Error,
            message: `Circular reference detected starting from Entry [${entry.index}]`,
            node: entry,
            nodeIndex: entry.index,
            nodeType: DLGNodeType.ENTRY,
            code: 'CIRCULAR_REFERENCE',
            autoFix: false
          });
        }
      });
    });
  }

  /**
   * Validate script references
   */
  private validateScripts(): void {
    const checkScript = (node: DLGNode | null, scriptName: string, scriptType: string) => {
      if (scriptName && scriptName.trim() !== '') {
        // Would need to check if script exists in game files
        // For now, just check if it's a valid format
        if (!/^[a-z0-9_]+$/i.test(scriptName)) {
          this.issues.push({
            severity: ValidationSeverity.Warning,
            message: `Invalid ${scriptType} script name format: "${scriptName}"`,
            ...(node !== null && {
              node,
              nodeIndex: node.index,
              nodeType: node.nodeType
            }),
            code: 'INVALID_SCRIPT_NAME',
            autoFix: false
          });
        }
      }
    };

    // Check dialog-level scripts
    if (this.dlg.scripts.onEndConversation?.name) {
      checkScript(null, this.dlg.scripts.onEndConversation.name, 'end conversation');
    }

    if (this.dlg.scripts.onEndConversationAbort?.name) {
      checkScript(null, this.dlg.scripts.onEndConversationAbort.name, 'end conversation abort');
    }

    // Check node scripts
    [...this.dlg.entryList, ...this.dlg.replyList].forEach(node => {
      if (node.script?.name) {
        checkScript(node, node.script.name, 'action');
      }
      if (node.script2?.name) {
        checkScript(node, node.script2.name, 'action 2');
      }
      if (node.isActive?.name) {
        checkScript(node, node.isActive.name, 'condition');
      }
      if (node.isActive2?.name) {
        checkScript(node, node.isActive2.name, 'condition 2');
      }
    });
  }

  /**
   * Validate audio references
   */
  private validateAudioReferences(): void {
    [...this.dlg.entryList, ...this.dlg.replyList].forEach(node => {
      if (node.vo_resref && !/^[a-z0-9_]+$/i.test(node.vo_resref)) {
        this.issues.push({
          severity: ValidationSeverity.Warning,
          message: `Invalid VO ResRef format: "${node.vo_resref}"`,
          node,
          nodeIndex: node.index,
          nodeType: node.nodeType,
          code: 'INVALID_VO_FORMAT',
          autoFix: false
        });
      }

      if (node.sound && !/^[a-z0-9_]+$/i.test(node.sound)) {
        this.issues.push({
          severity: ValidationSeverity.Warning,
          message: `Invalid sound ResRef format: "${node.sound}"`,
          node,
          nodeIndex: node.index,
          nodeType: node.nodeType,
          code: 'INVALID_SOUND_FORMAT',
          autoFix: false
        });
      }
    });
  }

  /**
   * Get issues by severity
   */
  public getIssuesBySeverity(severity: ValidationSeverity): ValidationIssue[] {
    return this.issues.filter(issue => issue.severity === severity);
  }

  /**
   * Get issue count
   */
  public getIssueCount(): { errors: number; warnings: number; info: number } {
    return {
      errors: this.getIssuesBySeverity(ValidationSeverity.Error).length,
      warnings: this.getIssuesBySeverity(ValidationSeverity.Warning).length,
      info: this.getIssuesBySeverity(ValidationSeverity.Info).length
    };
  }

  /**
   * Check if dialog is valid (no errors)
   */
  public isValid(): boolean {
    return this.getIssuesBySeverity(ValidationSeverity.Error).length === 0;
  }

  /**
   * Auto-fix fixable issues
   */
  public autoFix(): number {
    let fixed = 0;

    // Remove orphan nodes
    const orphanIssues = this.issues.filter(
      issue => issue.code === 'ORPHAN_NODE' && issue.autoFix
    );

    orphanIssues.forEach(issue => {
      if (issue.nodeType === DLGNodeType.ENTRY && issue.nodeIndex !== undefined) {
        this.dlg.entryList.splice(issue.nodeIndex, 1);
        // Re-index remaining nodes
        this.dlg.entryList.forEach((node, idx) => {
          node.index = idx;
        });
        fixed++;
      } else if (issue.nodeType === DLGNodeType.REPLY && issue.nodeIndex !== undefined) {
        this.dlg.replyList.splice(issue.nodeIndex, 1);
        // Re-index remaining nodes
        this.dlg.replyList.forEach((node, idx) => {
          node.index = idx;
        });
        fixed++;
      }
    });

    // Re-validate after fixes
    if (fixed > 0) {
      this.validate();
    }

    return fixed;
  }
}
