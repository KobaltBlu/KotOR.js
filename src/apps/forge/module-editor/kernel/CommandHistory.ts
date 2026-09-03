/**
 * Transactional undo/redo history for module editor operations.
 * Coexists with full-module snapshot undo as a compatibility fallback.
 *
 * @file CommandHistory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import {
  createEditorCommand,
  EditorCommand,
  EditorCommandDescriptor,
} from "@/apps/forge/module-editor/kernel/EditorCommand";

export class CommandHistory extends EventListenerModel {
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];
  private coalesceKey: string | null = null;
  private coalesceTimer: ReturnType<typeof setTimeout> | undefined;
  private maxDepth: number;
  private executing = false;

  constructor(maxDepth: number = 200) {
    super();
    this.maxDepth = Math.max(1, maxDepth);
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoDepth(): number {
    return this.undoStack.length;
  }

  get redoDepth(): number {
    return this.redoStack.length;
  }

  peekUndo(): EditorCommand | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  peekRedo(): EditorCommand | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

  /**
   * Push a named command. Same coalesceKey within the window replaces the
   * previous entry without growing the stack.
   */
  push(descriptor: EditorCommandDescriptor): EditorCommand {
    const command = createEditorCommand(descriptor);
    const coalesceMs = descriptor.coalesceMs ?? 400;

    if (descriptor.coalesceKey && this.coalesceKey === descriptor.coalesceKey && this.undoStack.length > 0) {
      const previous = this.undoStack[this.undoStack.length - 1];
      if (previous.coalesceKey === descriptor.coalesceKey) {
        // Keep the earliest undo; replace redo side with latest redo.
        previous.redo = command.redo;
        previous.label = command.label;
        previous.timestamp = command.timestamp;
        this.scheduleCoalesceClear(descriptor.coalesceKey, coalesceMs);
        this.processEventListener("onHistoryChanged", [this]);
        return previous;
      }
    }

    this.undoStack.push(command);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    if (descriptor.coalesceKey) {
      this.scheduleCoalesceClear(descriptor.coalesceKey, coalesceMs);
    } else {
      this.clearCoalesce();
    }
    this.processEventListener("onHistoryChanged", [this]);
    return command;
  }

  async undo(): Promise<boolean> {
    if (!this.canUndo || this.executing) {
      return false;
    }
    const command = this.undoStack.pop()!;
    this.executing = true;
    try {
      await command.undo();
      this.redoStack.push(command);
      this.clearCoalesce();
      this.processEventListener("onUndoApplied", [command]);
      this.processEventListener("onHistoryChanged", [this]);
      return true;
    } finally {
      this.executing = false;
    }
  }

  async redo(): Promise<boolean> {
    if (!this.canRedo || this.executing) {
      return false;
    }
    const command = this.redoStack.pop()!;
    this.executing = true;
    try {
      await command.redo();
      this.undoStack.push(command);
      this.clearCoalesce();
      this.processEventListener("onRedoApplied", [command]);
      this.processEventListener("onHistoryChanged", [this]);
      return true;
    } finally {
      this.executing = false;
    }
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.clearCoalesce();
    this.processEventListener("onHistoryChanged", [this]);
  }

  private scheduleCoalesceClear(key: string, delayMs: number): void {
    this.coalesceKey = key;
    if (this.coalesceTimer !== undefined) {
      clearTimeout(this.coalesceTimer);
    }
    this.coalesceTimer = setTimeout(() => {
      this.coalesceKey = null;
      this.coalesceTimer = undefined;
    }, delayMs);
  }

  private clearCoalesce(): void {
    this.coalesceKey = null;
    if (this.coalesceTimer !== undefined) {
      clearTimeout(this.coalesceTimer);
      this.coalesceTimer = undefined;
    }
  }
}
