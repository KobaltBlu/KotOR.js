import * as path from 'path';
import * as vscode from 'vscode';

import { KotorDocument } from '../KotorDocument';
import { LogScope, createScopedLogger } from '../logger';

const log = createScopedLogger(LogScope.Forge);

/** Webview message type (VSCode API sends unknown; we validate and narrow) */
type WebviewMessage = Record<string, unknown> & {
  type?: string;
  requestId?: number;
  buffer?: number[];
  label?: string;
  data?: number[];
  undoData?: unknown;
  redoData?: unknown;
  body?: unknown;
};

function asWebviewMessage(e: unknown): WebviewMessage {
  return (typeof e === 'object' && e !== null ? e : {}) as WebviewMessage;
}

/**
 * Base class for all KotOR custom editor providers
 */
export abstract class BaseKotorEditorProvider implements vscode.CustomEditorProvider<KotorDocument> {
  protected static readonly viewType: string;

  constructor(
    private readonly context: vscode.ExtensionContext
  ) {}

  /**
   * Get the editor type identifier (utc, utd, 2da, etc.) for a document.
   */
  protected abstract getEditorTypeForDocument(document: KotorDocument): string;

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
    log.trace(`openCustomDocument() entered uri=${uri.fsPath} backupId=${openContext.backupId ?? 'undefined'}`);
    const document = await KotorDocument.create(uri, openContext.backupId, {
      getFileData: async () => {
        log.trace(`getFileData() delegated for ${document.uri.toString()}`);
        const webviewsForDocument = Array.from(this.webviews.get(document.uri.toString()) || []);
        if (!webviewsForDocument.length) {
          log.error(`getFileData() no webviews for document ${document.uri.toString()}`);
          throw new Error('No webviews found for document');
        }
        const panel = webviewsForDocument[0];
        log.debug(`getFileData() requesting from webview, panel count=${webviewsForDocument.length}`);
        const response = await this.postMessageWithResponse<{ data: number[] }>(panel, {
          type: 'getFileData'
        });
        log.trace(`getFileData() received ${response?.data?.length ?? 0} bytes`);
        return new Uint8Array(response.data ?? []);
      }
    });

    const listeners: vscode.Disposable[] = [];

    listeners.push(document.onDidChange(e => {
      log.trace(`onDidChangeCustomDocument fired for ${document.uri.fsPath} label=${e.label}`);
      this._onDidChangeCustomDocument.fire({
        document,
        ...e
      });
    }));

    listeners.push(document.onDidChangeContent(e => {
      if (e.content !== undefined) {
        log.info(`document content changed (revert) uri=${document.uri.fsPath} bytes=${e.content.length}`);
        this.postMessageToWebviews(document, { type: 'revert', content: Array.from(e.content) });
      }
    }));

    listeners.push(document.onDidDispose(() => {
      log.trace(`document onDidDispose for ${document.uri.fsPath}, disposing ${listeners.length} listeners`);
      for (const listener of listeners) {
        listener.dispose();
      }
    }));

    log.info(`openCustomDocument() completed for ${uri.fsPath} documentDataLength=${document.documentData.length}`);
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
    log.trace(`resolveCustomEditor() entered uri=${document.uri.fsPath}`);
    this.webviews.add(document.uri.toString(), webviewPanel);
    log.debug(`resolveCustomEditor() webview added uri=${document.uri.toString()}`);

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
        vscode.Uri.joinPath(this.context.extensionUri, 'media')
      ]
    };
    log.trace('resolveCustomEditor() webview options set (scripts, localResourceRoots)');

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);
    log.debug('resolveCustomEditor() HTML set, webview will load and post ready');

    webviewPanel.webview.onDidReceiveMessage((e: unknown) => this.onMessage(document, asWebviewMessage(e)));

    webviewPanel.webview.onDidReceiveMessage(async (e: unknown) => {
      const msg = asWebviewMessage(e);
      log.trace(`resolveCustomEditor() message from webview type=${msg.type ?? 'undefined'}`);
      if (msg.type === 'ready') {
        log.info(`resolveCustomEditor() webview ready, sending init uri=${document.uri.fsPath}`);
        const extra = await this.getExtraInitData?.(document) ?? {};
        const editorType = this.getEditorTypeForDocument(document);
        const fileName = path.basename(document.uri.fsPath);
        const logLevel = vscode.workspace.getConfiguration('kotorForge').get<string>('logLevel', 'info');
        log.debug(`resolveCustomEditor() init payload editorType=${editorType} fileName=${fileName} fileDataLength=${document.documentData.length} extraKeys=${Object.keys(extra).join(',') || 'none'}`);
        this.postMessage(webviewPanel, {
          type: 'init',
          editorType,
          fileData: Array.from(document.documentData),
          fileName,
          logLevel,
          ...extra
        });
        log.info(`resolveCustomEditor() init message sent; Forge will create tab and render editor`);
      }
    });

    webviewPanel.onDidDispose(() => {
      log.trace(`webviewPanel onDidDispose for ${document.uri.toString()}`);
      this.webviews.delete(document.uri.toString(), webviewPanel);
    });
    log.trace(`resolveCustomEditor() completed for ${document.uri.fsPath}`);
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<KotorDocument>>();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  /**
   * Save the document
   */
  async saveCustomDocument(document: KotorDocument, cancellation: vscode.CancellationToken): Promise<void> {
    log.trace(`saveCustomDocument() uri=${document.uri.fsPath}`);
    await document.save(cancellation);
    log.debug(`saveCustomDocument() completed ${document.uri.fsPath}`);
  }

  /**
   * Save the document to a new location
   */
  async saveCustomDocumentAs(document: KotorDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
    log.trace(`saveCustomDocumentAs() uri=${document.uri.fsPath} destination=${destination.fsPath}`);
    await document.saveAs(destination, cancellation);
    log.debug(`saveCustomDocumentAs() completed`);
  }

  /**
   * Revert the document to its saved state
   */
  async revertCustomDocument(document: KotorDocument, cancellation: vscode.CancellationToken): Promise<void> {
    log.trace(`revertCustomDocument() uri=${document.uri.fsPath}`);
    await document.revert(cancellation);
    log.debug(`revertCustomDocument() completed`);
  }

  /**
   * Backup the document for hot exit
   */
  async backupCustomDocument(
    document: KotorDocument,
    context: vscode.CustomDocumentBackupContext,
    cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    log.trace(`backupCustomDocument() uri=${document.uri.fsPath} destination=${context.destination.toString()}`);
    const backup = await document.backup(context.destination, cancellation);
    log.debug(`backupCustomDocument() completed backupId=${backup.id}`);
    return backup;
  }

  /**
   * Get the HTML content for the webview
   */
  private getHtmlForWebview(webview: vscode.Webview, document: KotorDocument): string {
    log.trace(`getHtmlForWebview() uri=${document.uri.fsPath}`);
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'webview.css')
    );
    // Base URL for webpack chunk loading (same origin as webview.js). Must be set before bundle runs.
    const scriptBase = scriptUri.toString().replace(/\/webview\.js$/i, '/');
    const scriptBaseEscaped = scriptBase.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    log.trace(`getHtmlForWebview() scriptUri=${scriptUri.toString()} styleUri=${styleUri.toString()} scriptBase=${scriptBase}`);
    const nonce = getNonce();

    return /* html */`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <!--
          script-src: nonce for inline scripts; ${webview.cspSource} for webview.js and its chunks.
          Chunk scripts are loaded by webpack from the same origin; no eval (devtool: source-map).
        -->
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          img-src ${webview.cspSource} https: data:;
          style-src ${webview.cspSource} 'unsafe-inline';
          font-src ${webview.cspSource} data:;
          script-src 'nonce-${nonce}' ${webview.cspSource};
          connect-src ${webview.cspSource} https:;
          worker-src ${webview.cspSource} blob:;
        ">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>KotOR Forge Editor</title>
      </head>
      <body>
        <!-- Visible even if JS fails to execute (prevents silent blank editor). -->
        <div id="boot-fallback" style="
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          background: var(--vscode-editor-background, #1e1e1e);
          color: var(--vscode-editor-foreground, #cccccc);
        ">
          <div style="max-width: 900px;">
            <div style="font-size: 14px; opacity: 0.9;">Loading KotOR Forge editor…</div>
            <div id="boot-detail" style="margin-top: 8px; font-size: 12px; opacity: 0.7;">
              If this stays here, the webview script likely failed to run (CSP / missing build output).
            </div>
          </div>
        </div>
        <div id="root"></div>
        <script nonce="${nonce}">
          (function () {
            var scriptBase = '${scriptBaseEscaped}';
            if (typeof window !== 'undefined' && scriptBase) {
              window.__webpack_public_path__ = scriptBase;
            }
          })();
        </script>
        <script nonce="${nonce}">
          (function () {
            const bootDetail = document.getElementById('boot-detail');
            const bootFallback = document.getElementById('boot-fallback');
            const bundleScript = document.getElementById('forge-webview-bundle');
            function setDetail(text) {
              if (bootDetail) bootDetail.textContent = text;
            }
            window.__FORGE_WEBVIEW_LOADED__ = false;
            window.addEventListener('error', (ev) => {
              const msg = (ev && ev.message) ? ev.message : String(ev);
              setDetail('Webview error: ' + msg);
            });
            window.addEventListener('unhandledrejection', (ev) => {
              const reason = ev && ev.reason ? (ev.reason.message || String(ev.reason)) : 'unknown';
              setDetail('Webview unhandled rejection: ' + reason);
            });
            if (bundleScript) {
              bundleScript.addEventListener('error', () => {
                setDetail(
                  'Failed to load webview bundle (webview.js). ' +
                  'This usually means dist/webview outputs are missing or the URI was blocked.'
                );
              });
            }
            setTimeout(() => {
              if (window.__FORGE_WEBVIEW_LOADED__) return;
              setDetail(
                'Webview bundle did not start. Common causes: CSP blocked eval() (bad source maps), ' +
                'chunk scripts blocked by CSP, or dist/webview outputs missing.'
              );
            }, 15000);
            window.__FORGE_BOOT_REMOVE_FALLBACK__ = function () {
              try { bootFallback && bootFallback.remove(); } catch {}
            };
          })();
        </script>
        <script id="forge-webview-bundle" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }

  /**
   * Handle messages from the webview
   */
  private async onMessage(document: KotorDocument, message: Record<string, unknown> & { type?: string; requestId?: number; buffer?: number[]; label?: string; data?: number[]; undoData?: unknown; redoData?: unknown; body?: unknown }) {
    log.trace(`onMessage() received uri=${document.uri.fsPath} type=${message?.type ?? 'undefined'} requestId=${message?.requestId ?? 'n/a'}`);
    switch (message.type) {
      case 'requestSave':
        log.info(`onMessage requestSave uri=${document.uri.fsPath} bufferLength=${message.buffer?.length ?? 0}`);
        try {
          const data = new Uint8Array(message.buffer || []);
          await vscode.workspace.fs.writeFile(document.uri, data);
          log.info(`requestSave completed uri=${document.uri.fsPath} bytes=${data.length}`);
          this.postMessageToWebviews(document, { type: 'saveComplete' });
        } catch (e) {
          log.error(`requestSave failed uri=${document.uri.fsPath}: ${e}`);
          this.postMessageToWebviews(document, { type: 'saveError', error: String(e) });
        }
        break;

      case 'edit':
        log.debug(`onMessage edit uri=${document.uri.fsPath} label=${message.label ?? 'Edit'} dataLength=${message.data?.length ?? 0}`);
        {
          const before = Array.from(document.documentData ?? new Uint8Array(0));
          const after = Array.from(new Uint8Array(message.data || []));
        document.makeEdit({
          label: message.label || 'Edit',
          data: new Uint8Array(message.data || []),
          undo: () => {
            log.trace(`edit undo uri=${document.uri.fsPath}`);
            this.postMessageToWebviews(document, {
              type: 'undo',
                content: before
            });
          },
          redo: () => {
            log.trace(`edit redo uri=${document.uri.fsPath}`);
            this.postMessageToWebviews(document, {
              type: 'redo',
                content: after
            });
          }
        });
        }
        break;

      case 'response':
        if (this.messageCallbacks.has(message.requestId)) {
          const callback = this.messageCallbacks.get(message.requestId);
          log.trace(`onMessage response requestId=${message.requestId} invoking callback`);
          callback!(message.body);
          this.messageCallbacks.delete(message.requestId);
        } else {
          log.trace(`onMessage response requestId=${message.requestId} no callback found`);
        }
        break;
      default:
        log.trace(`onMessage unhandled type=${message?.type}`);
    }
  }

  /**
   * Track all webviews for a given document
   */
  private readonly webviews = new WebviewCollection();

  /**
   * Track message callbacks for request/response
   */
  private readonly messageCallbacks = new Map<number, (response: unknown) => void>();
  private requestId = 0;

  /**
   * Post a message to all webviews for a document
   */
  private postMessageToWebviews(document: KotorDocument, message: Record<string, unknown>) {
    const webviewsForDocument = this.webviews.get(document.uri.toString());
    const count = webviewsForDocument?.size ?? 0;
    log.trace(`postMessageToWebviews() uri=${document.uri.toString()} type=${message?.type} panelCount=${count}`);
    if (webviewsForDocument) {
      for (const panel of webviewsForDocument) {
        panel.webview.postMessage(message);
      }
    }
  }

  /**
   * Post a message to a specific webview
   */
  private postMessage(panel: vscode.WebviewPanel, message: Record<string, unknown>) {
    log.trace(`postMessage() type=${message?.type}`);
    panel.webview.postMessage(message);
  }

  /**
   * Post a message and wait for a response
   */
  private postMessageWithResponse<T = unknown>(panel: vscode.WebviewPanel, message: Record<string, unknown>): Promise<T> {
    const requestId = this.requestId++;
    log.trace(`postMessageWithResponse() requestId=${requestId} type=${message?.type}`);
    return new Promise<T>((resolve) => {
      this.messageCallbacks.set(requestId, resolve as (response: unknown) => void);
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
    log.trace(`WebviewCollection.add() key=${key} size=${set.size}`);
  }

  public delete(key: string, webview: vscode.WebviewPanel) {
    const set = this.webviews.get(key);
    if (set) {
      set.delete(webview);
      if (set.size === 0) {
        this.webviews.delete(key);
        log.trace(`WebviewCollection.delete() key=${key} removed (set empty)`);
      } else {
        log.trace(`WebviewCollection.delete() key=${key} size=${set.size}`);
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
  log.trace('getNonce() generated');
  return text;
}
