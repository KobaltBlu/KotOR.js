import { VSCodeAPI } from './vscode';

const LOG_PREFIX = '[Webview]';

function logTrace(msg: string, ...args: unknown[]) {
  if (typeof console !== 'undefined' && console.debug) {
    console.debug(`${LOG_PREFIX} [trace] ${msg}`, ...args);
  }
}

function logDebug(msg: string, ...args: unknown[]) {
  if (typeof console !== 'undefined' && console.debug) {
    console.debug(`${LOG_PREFIX} [debug] ${msg}`, ...args);
  }
}

function logInfo(msg: string, ...args: unknown[]) {
  if (typeof console !== 'undefined' && console.info) {
    console.info(`${LOG_PREFIX} [info] ${msg}`, ...args);
  }
}

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
    logTrace('WebviewBridge constructor() entered');
    this.vscode = window.acquireVsCodeApi();
    this.setupMessageListener();
    logDebug('WebviewBridge constructor() completed');
  }

  static getInstance(): WebviewBridge {
    if (!WebviewBridge.instance) {
      logTrace('WebviewBridge getInstance() creating new instance');
      WebviewBridge.instance = new WebviewBridge();
    }
    return WebviewBridge.instance;
  }

  /**
   * Listen for messages from the extension host
   */
  private setupMessageListener() {
    logTrace('setupMessageListener() registering window message listener');
    window.addEventListener('message', event => {
      const message = event.data;
      logTrace(`message received type=${message?.type} requestId=${message?.requestId ?? 'n/a'}`);

      if (message.type === 'response' && message.requestId !== undefined) {
        const callback = this.requestCallbacks.get(message.requestId);
        if (callback) {
          logTrace(`response callback invoked requestId=${message.requestId}`);
          callback(message.body);
          this.requestCallbacks.delete(message.requestId);
        } else {
          logTrace(`response requestId=${message.requestId} no callback found`);
        }
        return;
      }

      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        logTrace(`dispatching to handler type=${message.type}`);
        handler(message);
      } else {
        logTrace(`no handler for type=${message.type}`);
      }
    });
  }

  /**
   * Register a message handler
   */
  on(type: string, handler: (data: unknown) => void) {
    logTrace(`on() registered handler for type=${type}`);
    this.messageHandlers.set(type, handler);
  }

  /**
   * Post a message to the extension host
   */
  postMessage(message: Record<string, unknown>) {
    logTrace(`postMessage() type=${message?.type}`);
    this.vscode.postMessage(message);
  }

  /**
   * Post a message and wait for a response
   */
  postMessageWithResponse<T = unknown>(message: Record<string, unknown>): Promise<T> {
    const requestId = Math.random();
    logTrace(`postMessageWithResponse() type=${message?.type} requestId=${requestId}`);
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
    logInfo('notifyReady() sending ready to extension');
    this.postMessage({ type: 'ready' });
  }

  /**
   * Notify the extension of an edit
   */
  notifyEdit(label: string, data: Uint8Array, undoData?: unknown, redoData?: unknown) {
    logDebug(`notifyEdit() label=${label} dataLength=${data?.length ?? 0}`);
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
    logTrace(`sendFileData() requestId=${requestId ?? 'n/a'} dataLength=${data?.length ?? 0}`);
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
    logTrace('setState() called');
    this.vscode.setState(state);
  }
}

export default WebviewBridge.getInstance();
