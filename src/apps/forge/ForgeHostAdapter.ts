import { EditorFile } from '@/apps/forge/EditorFile';
import { EditorTabManager } from '@/apps/forge/managers/EditorTabManager';
import { ModalManagerState } from '@/apps/forge/states/modal/ModalManagerState';
import { TabState } from '@/apps/forge/states/tabs/TabState';

/**
 * Optional host adapter for running Forge inside an embedded context (e.g. VS Code webview).
 * When set, ForgeState delegates tab manager, modal manager, recent files, and save I/O to the host.
 * This keeps the Forge UI and editors unchanged while allowing a different host to own file system and UI chrome.
 */
export interface IForgeHostAdapter {
  /** Tab manager for the current document (e.g. single-tab in webview). */
  getTabManager(): EditorTabManager;

  /** Modal manager for dialogs (can be real or no-op). */
  getModalManager(): ModalManagerState;

  /** Called when a file is opened/saved; host may no-op or persist. */
  addRecentFile?(file: EditorFile): void;

  /**
   * Request the host to save the document. Host writes buffer to disk and resolves when done.
   * Used when Forge runs in an environment without direct file system (e.g. webview).
   */
  requestSave(tab: TabState, buffer: Uint8Array): Promise<void>;

  /**
   * Optional: called when the user edits the document so the host can push an edit (e.g. for undo/redo).
   * Host gets current buffer from the tab and may debounce; full-buffer strategy for undo/redo.
   */
  onEdit?(): void | Promise<void>;
}
