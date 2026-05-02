import { VSCodeAPI } from './vscode';

/**
 * Bridge between VS Code extension and webview
 * Replaces ForgeState for communication
 */
export class WebviewBridge {
  private static instance: WebviewBridge;
  private vscode: VSCodeAPI;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private requestCallbacks: Map<number, (response: any) => void> = new Map();

  private constructor() {
    this.vscode = window.acquireVsCodeApi();
    this.setupMessageListener();
  }

  static getInstance(): WebviewBridge {
    if (!WebviewBridge.instance) {
      WebviewBridge.instance = new WebviewBridge();
    }
    return WebviewBridge.instance;
  }

  /**
   * Listen for messages from the extension host
   */
  private setupMessageListener() {
    window.addEventListener('message', event => {
      const message = event.data;

      // Handle responses to our requests
      if (message.type === 'response' && message.requestId !== undefined) {
        const callback = this.requestCallbacks.get(message.requestId);
        if (callback) {
          callback(message.body);
          this.requestCallbacks.delete(message.requestId);
        }
        return;
      }

      // Handle messages from extension
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message);
      }
    });
  }

  /**
   * Register a message handler
   */
  on(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Post a message to the extension host
   */
  postMessage(message: any) {
    this.vscode.postMessage(message);
  }

  /**
   * Post a message and wait for a response
   */
  postMessageWithResponse<T = any>(message: any): Promise<T> {
    return new Promise((resolve) => {
      const requestId = Math.random();
      this.requestCallbacks.set(requestId, resolve);
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
    this.postMessage({ type: 'ready' });
  }

  /**
   * Notify the extension of an edit
   */
  notifyEdit(label: string, data: Uint8Array, undoData?: any, redoData?: any) {
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
  getState(): any {
    return this.vscode.getState();
  }

  setState(state: any) {
    this.vscode.setState(state);
  }
}

export default WebviewBridge.getInstance();
