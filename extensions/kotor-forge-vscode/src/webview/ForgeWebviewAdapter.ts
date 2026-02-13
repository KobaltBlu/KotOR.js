/**
 * VS Code webview implementation of IForgeHostAdapter.
 * Delegates save to the extension host via postMessage; provides a single-tab EditorTabManager.
 */
import type { EditorFile } from '@forge/EditorFile';
import type { IForgeHostAdapter } from '@forge/ForgeHostAdapter';
import { EditorTabManager } from '@forge/managers/EditorTabManager';
import { ModalManagerState } from '@forge/states/modal/ModalManagerState';
import type { TabState } from '@forge/states/tabs/TabState';
import { createScopedLogger, LogScope } from '@kotor/utility/Logger';

import bridge from './WebviewBridge';

const log = createScopedLogger(LogScope.Webview);

export class ForgeWebviewAdapter implements IForgeHostAdapter {
  private readonly tabManager: EditorTabManager;
  private readonly modalManager: ModalManagerState;
  private saveResolve: (() => void) | null = null;
  private saveReject: ((err: Error) => void) | null = null;

  constructor() {
    log.trace('ForgeWebviewAdapter constructor() entered');
    this.tabManager = new EditorTabManager();
    this.modalManager = new ModalManagerState();
    bridge.on('saveComplete', () => {
      log.debug('saveComplete received from extension');
      if (this.saveResolve) {
        this.saveResolve();
        this.saveResolve = null;
        this.saveReject = null;
        log.trace('saveComplete resolve called');
      }
    });
    bridge.on('saveError', (data: unknown) => {
      const msg = data as { error?: string };
      log.warn('saveError received: %s', msg?.error ?? 'unknown');
      if (this.saveReject) {
        this.saveReject(new Error(msg?.error || 'Save failed'));
        this.saveResolve = null;
        this.saveReject = null;
      }
    });
    log.trace('ForgeWebviewAdapter constructor() completed');
  }

  getTabManager(): EditorTabManager {
    log.trace('getTabManager() called');
    return this.tabManager;
  }

  getModalManager(): ModalManagerState {
    log.trace('getModalManager() called');
    return this.modalManager;
  }

  addRecentFile(_file: EditorFile): void {
    log.trace('addRecentFile() no-op in webview');
  }

  requestSave(_tab: TabState, buffer: Uint8Array): Promise<void> {
    log.info('requestSave() bufferLength=%s', String(buffer?.length ?? 0));
    return new Promise((resolve, reject) => {
      this.saveResolve = resolve;
      this.saveReject = reject;
      bridge.postMessage({
        type: 'requestSave',
        buffer: Array.from(buffer)
      });
      log.trace('requestSave() postMessage sent');
    });
  }
}
