import * as vscode from 'vscode';

/**
 * Document edit for undo/redo support
 */
export interface KotorDocumentEdit {
  readonly label: string;
  readonly data: Uint8Array;
  undo(): void;
  redo(): void;
}

/**
 * Custom document for KotOR binary files
 */
export class KotorDocument implements vscode.CustomDocument {
  static async create(
    uri: vscode.Uri,
    backupId: string | undefined,
    delegate: {
      getFileData(): Promise<Uint8Array>;
    }
  ): Promise<KotorDocument | PromiseLike<KotorDocument>> {
    const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
    const fileData = await KotorDocument.readFile(dataFile);
    return new KotorDocument(uri, fileData, delegate);
  }

  private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    if (uri.scheme === 'untitled') {
      return new Uint8Array();
    }
    return await vscode.workspace.fs.readFile(uri);
  }

  private readonly _uri: vscode.Uri;

  private _documentData: Uint8Array;
  private _edits: Array<KotorDocumentEdit> = [];
  private _savedEdits: Array<KotorDocumentEdit> = [];

  private readonly _delegate: {
    getFileData(): Promise<Uint8Array>;
  };

  private constructor(
    uri: vscode.Uri,
    initialContent: Uint8Array,
    delegate: {
      getFileData(): Promise<Uint8Array>;
    }
  ) {
    this._uri = uri;
    this._documentData = initialContent;
    this._delegate = delegate;
  }

  public get uri() {
    return this._uri;
  }

  public get documentData(): Uint8Array {
    return this._documentData;
  }

  private readonly _onDidDispose = new vscode.EventEmitter<void>();
  public readonly onDidDispose = this._onDidDispose.event;

  private readonly _onDidChangeDocument = new vscode.EventEmitter<{
    readonly content?: Uint8Array;
    readonly edits: readonly KotorDocumentEdit[];
  }>();
  public readonly onDidChangeContent = this._onDidChangeDocument.event;

  private readonly _onDidChange = new vscode.EventEmitter<{
    readonly label: string;
    undo(): void;
    redo(): void;
  }>();
  public readonly onDidChange = this._onDidChange.event;

  dispose(): void {
    this._onDidDispose.fire();
    this._onDidDispose.dispose();
    this._onDidChangeDocument.dispose();
    this._onDidChange.dispose();
  }

  /**
   * Called by VS Code when the user edits the document in the webview
   */
  makeEdit(edit: KotorDocumentEdit) {
    this._edits.push(edit);
    this._onDidChange.fire({
      label: edit.label,
      undo: async () => {
        this._edits.pop();
        edit.undo();
      },
      redo: async () => {
        this._edits.push(edit);
        edit.redo();
      }
    });
  }

  /**
   * Called by VS Code when saving the document
   */
  async save(cancellation: vscode.CancellationToken): Promise<void> {
    await this.saveAs(this.uri, cancellation);
    this._savedEdits = Array.from(this._edits);
  }

  /**
   * Called by VS Code when saving the document to a different location
   */
  async saveAs(targetResource: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
    const fileData = await this._delegate.getFileData();
    if (cancellation.isCancellationRequested) {
      return;
    }
    await vscode.workspace.fs.writeFile(targetResource, fileData);
  }

  /**
   * Called by VS Code when reverting the document
   */
  async revert(_cancellation: vscode.CancellationToken): Promise<void> {
    const diskContent = await KotorDocument.readFile(this.uri);
    this._documentData = diskContent;
    this._edits = this._savedEdits;
    this._onDidChangeDocument.fire({
      content: diskContent,
      edits: this._edits
    });
  }

  /**
   * Called by VS Code for backup/hot exit
   */
  async backup(destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
    await this.saveAs(destination, cancellation);
    return {
      id: destination.toString(),
      delete: async () => {
        try {
          await vscode.workspace.fs.delete(destination);
        } catch {
          // noop
        }
      }
    };
  }
}
