import * as vscode from 'vscode';
import { KotorDocument } from '../KotorDocument';
import * as path from 'path';

/**
 * Base class for all KotOR custom editor providers
 */
export abstract class BaseKotorEditorProvider implements vscode.CustomEditorProvider<KotorDocument> {
  protected static readonly viewType: string;

  constructor(
    private readonly context: vscode.ExtensionContext
  ) {}

  /**
   * Get the editor type identifier (utc, utd, 2da, etc.)
   */
  protected abstract getEditorType(): string;

  /**
   * Optional: return extra payload to merge into the init message (e.g. mdxData for model viewer).
   */
  protected getExtraInitData?(_document: KotorDocument): Promise<Record<string, unknown>>;

  /**
   * Called when VS Code needs to create a document
   */
  async openCustomDocument(
    uri: vscode.Uri,
    openContext: { backupId?: string },
    _token: vscode.CancellationToken
  ): Promise<KotorDocument> {
    const document = await KotorDocument.create(uri, openContext.backupId, {
      getFileData: async () => {
        const webviewsForDocument = Array.from(this.webviews.get(document.uri.toString()) || []);
        if (!webviewsForDocument.length) {
          throw new Error('No webviews found for document');
        }
        // Request file data from the webview
        const panel = webviewsForDocument[0];
        const response = await this.postMessageWithResponse<{ data: number[] }>(panel, {
          type: 'getFileData'
        });
        return new Uint8Array(response.data);
      }
    });

    const listeners: vscode.Disposable[] = [];

    listeners.push(document.onDidChange(e => {
      // Tell VS Code that the document has been edited by the user
      this._onDidChangeCustomDocument.fire({
        document,
        ...e
      });
    }));

    listeners.push(document.onDidDispose(() => {
      for (const listener of listeners) {
        listener.dispose();
      }
    }));

    return document;
  }

  /**
   * Called when VS Code needs to resolve (show) the custom editor
   */
  async resolveCustomEditor(
    document: KotorDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Add webview to our internal set
    this.webviews.add(document.uri.toString(), webviewPanel);

    // Setup webview options
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
        vscode.Uri.joinPath(this.context.extensionUri, 'media')
      ]
    };

    // Set the HTML content
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

    // Handle messages from the webview
    webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, e));

    // Wait for the webview to be ready, then send the initial data (optionally with extra payload from subclass)
    webviewPanel.webview.onDidReceiveMessage(async (e) => {
      if (e.type === 'ready') {
        const extra = await this.getExtraInitData?.(document) ?? {};
        this.postMessage(webviewPanel, {
          type: 'init',
          editorType: this.getEditorType(),
          fileData: Array.from(document.documentData),
          fileName: path.basename(document.uri.fsPath),
          ...extra
        });
      }
    });

    // Clean up when the panel closes
    webviewPanel.onDidDispose(() => {
      this.webviews.delete(document.uri.toString(), webviewPanel);
    });
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<KotorDocument>>();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  /**
   * Save the document
   */
  async saveCustomDocument(document: KotorDocument, cancellation: vscode.CancellationToken): Promise<void> {
    return await document.save(cancellation);
  }

  /**
   * Save the document to a new location
   */
  async saveCustomDocumentAs(document: KotorDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
    return await document.saveAs(destination, cancellation);
  }

  /**
   * Revert the document to its saved state
   */
  async revertCustomDocument(document: KotorDocument, cancellation: vscode.CancellationToken): Promise<void> {
    return await document.revert(cancellation);
  }

  /**
   * Backup the document for hot exit
   */
  async backupCustomDocument(
    document: KotorDocument,
    context: vscode.CustomDocumentBackupContext,
    cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    return await document.backup(context.destination, cancellation);
  }

  /**
   * Get the HTML content for the webview
   */
  private getHtmlForWebview(webview: vscode.Webview, document: KotorDocument): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'webview.css')
    );

    const nonce = getNonce();

    return /* html */`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>KotOR Forge Editor</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }

  /**
   * Handle messages from the webview
   */
  private async onMessage(document: KotorDocument, message: any) {
    switch (message.type) {
      case 'edit':
        // Create an edit object for undo/redo
        document.makeEdit({
          label: message.label || 'Edit',
          data: new Uint8Array(message.data || []),
          undo: () => {
            this.postMessageToWebviews(document, {
              type: 'undo',
              edits: message.undoData
            });
          },
          redo: () => {
            this.postMessageToWebviews(document, {
              type: 'redo',
              edits: message.redoData
            });
          }
        });
        break;

      case 'response':
        // Handle responses to our requests
        if (this.messageCallbacks.has(message.requestId)) {
          const callback = this.messageCallbacks.get(message.requestId);
          callback!(message.body);
          this.messageCallbacks.delete(message.requestId);
        }
        break;
    }
  }

  /**
   * Track all webviews for a given document
   */
  private readonly webviews = new WebviewCollection();

  /**
   * Track message callbacks for request/response
   */
  private readonly messageCallbacks = new Map<number, (response: any) => void>();
  private requestId = 0;

  /**
   * Post a message to all webviews for a document
   */
  private postMessageToWebviews(document: KotorDocument, message: any) {
    const webviewsForDocument = this.webviews.get(document.uri.toString());
    if (webviewsForDocument) {
      for (const panel of webviewsForDocument) {
        panel.webview.postMessage(message);
      }
    }
  }

  /**
   * Post a message to a specific webview
   */
  private postMessage(panel: vscode.WebviewPanel, message: any) {
    panel.webview.postMessage(message);
  }

  /**
   * Post a message and wait for a response
   */
  private postMessageWithResponse<T = any>(panel: vscode.WebviewPanel, message: any): Promise<T> {
    return new Promise((resolve) => {
      const requestId = this.requestId++;
      this.messageCallbacks.set(requestId, resolve);
      panel.webview.postMessage({
        ...message,
        requestId
      });
    });
  }
}

/**
 * Helper to track webview panels by document URI
 */
class WebviewCollection {
  private readonly webviews = new Map<string, Set<vscode.WebviewPanel>>();

  public add(key: string, webview: vscode.WebviewPanel) {
    const set = this.webviews.get(key) || new Set();
    set.add(webview);
    this.webviews.set(key, set);
  }

  public delete(key: string, webview: vscode.WebviewPanel) {
    const set = this.webviews.get(key);
    if (set) {
      set.delete(webview);
      if (set.size === 0) {
        this.webviews.delete(key);
      }
    }
  }

  public get(key: string): Set<vscode.WebviewPanel> | undefined {
    return this.webviews.get(key);
  }
}

/**
 * Generate a nonce for CSP
 */
function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
