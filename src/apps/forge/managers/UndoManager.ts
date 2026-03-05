export interface UndoCommand {
  type: string;
  description: string;
  undo: () => void;
  redo: () => void;
}

/**
 * Generic undo/redo stack manager for Forge editors.
 * Editors can execute typed commands and wire UI actions to canUndo/canRedo.
 */
export class UndoManager {
  protected undoStack: UndoCommand[] = [];
  protected redoStack: UndoCommand[] = [];
  protected maxStackSize: number = 100;
  protected changeListeners: Array<() => void> = [];

  constructor(maxStackSize = 100) {
    this.maxStackSize = maxStackSize;
  }

  execute(command: UndoCommand, applyImmediately = true): void {
    if (applyImmediately) {
      command.redo();
    }

    this.undoStack.push(command);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notifyChange();
  }

  undo(): boolean {
    if (!this.undoStack.length) return false;
    const command = this.undoStack.pop();
    if (!command) return false;
    command.undo();
    this.redoStack.push(command);
    this.notifyChange();
    return true;
  }

  redo(): boolean {
    if (!this.redoStack.length) return false;
    const command = this.redoStack.pop();
    if (!command) return false;
    command.redo();
    this.undoStack.push(command);
    this.notifyChange();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoDescription(): string | null {
    if (!this.undoStack.length) return null;
    return this.undoStack[this.undoStack.length - 1].description;
  }

  getRedoDescription(): string | null {
    if (!this.redoStack.length) return null;
    return this.redoStack[this.redoStack.length - 1].description;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyChange();
  }

  onChange(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      const idx = this.changeListeners.indexOf(listener);
      if (idx >= 0) {
        this.changeListeners.splice(idx, 1);
      }
    };
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  protected notifyChange(): void {
    this.changeListeners.forEach((listener) => listener());
  }
}
