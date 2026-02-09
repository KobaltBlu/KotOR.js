/**
 * VS Code webview implementation of IForgeHostAdapter.
 * Delegates save to the extension host via postMessage; provides a single-tab EditorTabManager.
 */
import type { EditorFile } from '@forge/EditorFile';
import type { IForgeHostAdapter } from '@forge/ForgeHostAdapter';
import { EditorTabManager } from '@forge/managers/EditorTabManager';
import { ModalManagerState } from '@forge/states/modal/ModalManagerState';
import type { TabState } from '@forge/states/tabs/TabState';

import bridge from './WebviewBridge';

const LOG_PREFIX = '[Webview]';
function logTrace(msg: string) {
  if (typeof console !== 'undefined' && console.debug) console.debug(`${LOG_PREFIX} [trace] ${msg}`);
}
function logDebug(msg: string) {
  if (typeof console !== 'undefined' && console.debug) console.debug(`${LOG_PREFIX} [debug] ${msg}`);
}
function logInfo(msg: string) {
  if (typeof console !== 'undefined' && console.info) console.info(`${LOG_PREFIX} [info] ${msg}`);
}
function logWarn(msg: string) {
  if (typeof console !== 'undefined' && console.warn) console.warn(`${LOG_PREFIX} [warn] ${msg}`);
}

export class ForgeWebviewAdapter implements IForgeHostAdapter {
  private readonly tabManager: EditorTabManager;
  private readonly modalManager: ModalManagerState;
  private saveResolve: (() => void) | null = null;
  private saveReject: ((err: Error) => void) | null = null;

  constructor() {
    logTrace('ForgeWebviewAdapter constructor() entered');
    this.tabManager = new EditorTabManager();
    this.modalManager = new ModalManagerState();
    bridge.on('saveComplete', () => {
      logDebug('saveComplete received from extension');
      if (this.saveResolve) {
        this.saveResolve();
        this.saveResolve = null;
        this.saveReject = null;
        logTrace('saveComplete resolve called');
      }
    });
    bridge.on('saveError', (data: unknown) => {
      const msg = data as { error?: string };
      logWarn(`saveError received: ${msg?.error ?? 'unknown'}`);
      if (this.saveReject) {
        this.saveReject(new Error(msg?.error || 'Save failed'));
        this.saveResolve = null;
        this.saveReject = null;
      }
    });
    logTrace('ForgeWebviewAdapter constructor() completed');
  }

  getTabManager(): EditorTabManager {
    logTrace('getTabManager() called');
    return this.tabManager;
  }

  getModalManager(): ModalManagerState {
    logTrace('getModalManager() called');
    return this.modalManager;
  }

  addRecentFile(_file: EditorFile): void {
    logTrace('addRecentFile() no-op in webview');
  }

  requestSave(_tab: TabState, buffer: Uint8Array): Promise<void> {
    logInfo(`requestSave() bufferLength=${buffer?.length ?? 0}`);
    return new Promise((resolve, reject) => {
      this.saveResolve = resolve;
      this.saveReject = reject;
      bridge.postMessage({
        type: 'requestSave',
        buffer: Array.from(buffer)
      });
      logTrace('requestSave() postMessage sent');
    });
  }
}
