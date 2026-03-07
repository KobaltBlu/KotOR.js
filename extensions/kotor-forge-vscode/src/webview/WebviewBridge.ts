import { createScopedLogger, LogScope } from '@kotor/utility/Logger';

import { VSCodeAPI } from './vscode';

const log = createScopedLogger(LogScope.Webview);

/**
 * Bridge between VS Code extension and webview
 * Replaces ForgeState for communication
 */
export class WebviewBridge {
  private static instance: WebviewBridge;
  private vscode: VSCodeAPI;
  private messageHandlers: Map<string, (data: unknown) => void> = new Map();
  private requestCallbacks: Map<number, (response: unknown) => void> = new Map();

  private constructor() {
    log.trace('WebviewBridge constructor() entered');
    this.vscode = window.acquireVsCodeApi();
    this.setupMessageListener();
    log.debug('WebviewBridge constructor() completed');
  }

  static getInstance(): WebviewBridge {
    if (!WebviewBridge.instance) {
      log.trace('WebviewBridge getInstance() creating new instance');
      WebviewBridge.instance = new WebviewBridge();
    }
    return WebviewBridge.instance;
  }

  /**
   * Listen for messages from the extension host
   */
  private setupMessageListener(): void {
    log.trace('setupMessageListener() registering window message listener');
    window.addEventListener('message', (event: MessageEvent) => {
      const raw: unknown = event.data;
      if (typeof raw !== 'object' || raw === null) return;
      const message = raw as Record<string, unknown>;
      const type = message.type as string | undefined;
      const requestId = message.requestId as number | undefined;
      log.trace('message received type=%s requestId=%s', type ?? 'n/a', requestId ?? 'n/a');

      if (type === 'response' && requestId !== undefined) {
        const callback = this.requestCallbacks.get(requestId);
        if (callback) {
          log.trace('response callback invoked requestId=%s', String(requestId));
          callback(message.body);
          this.requestCallbacks.delete(requestId);
        } else {
          log.trace('response requestId=%s no callback found', String(requestId));
        }
        return;
      }

      const handler = type ? this.messageHandlers.get(String(type)) : undefined;
      if (handler) {
        log.trace('dispatching to handler type=%s', String(type));
        handler(message);
      } else {
        log.trace('no handler for type=%s', String(type ?? 'n/a'));
      }
    });
  }

  /**
   * Register a message handler
   */
  on(type: string, handler: (data: unknown) => void) {
    log.trace('on() registered handler for type=%s', type);
    this.messageHandlers.set(type, handler);
  }

  /**
   * Post a message to the extension host
   */
  postMessage(message: Record<string, unknown>) {
    log.trace('postMessage() type=%s', message?.type);
    this.vscode.postMessage(message);
  }

  /**
   * Post a message and wait for a response
   */
  postMessageWithResponse<T = unknown>(message: Record<string, unknown>): Promise<T> {
    const requestId = Math.random();
    log.trace('postMessageWithResponse() type=%s requestId=%s', message?.type, requestId);
    return new Promise<T>((resolve) => {
      this.requestCallbacks.set(requestId, resolve as (response: unknown) => void);
      this.vscode.postMessage({
        ...message,
        requestId
      });
    });
  }

  /**
   * Notify the extension that the webview is ready
   */
  notifyReady() {
    log.info('notifyReady() sending ready to extension');
    this.postMessage({ type: 'ready' });
  }

  /**
   * Notify the extension of an edit
   */
  notifyEdit(label: string, data: Uint8Array, undoData?: unknown, redoData?: unknown) {
    log.debug('notifyEdit() label=%s dataLength=%s', label, String(data?.length ?? 0));
    this.postMessage({
      type: 'edit',
      label,
      data: Array.from(data),
      undoData,
      redoData
    });
  }

  /**
   * Send file data to the extension (for saving)
   */
  sendFileData(data: Uint8Array, requestId?: number) {
    log.trace('sendFileData() requestId=%s dataLength=%s', requestId ?? 'n/a', String(data?.length ?? 0));
    this.postMessage({
      type: 'response',
      requestId,
      body: {
        data: Array.from(data)
      }
    });
  }

  /**
   * Get/set persistent state
   */
  getState(): unknown {
    return this.vscode.getState();
  }

  setState(state: unknown) {
    log.trace('setState() called');
    this.vscode.setState(state);
  }
}

export default WebviewBridge.getInstance();
