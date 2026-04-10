import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for TLK (Talk Table) files
 */
export class TLKEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.tlk';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      TLKEditorProvider.viewType,
      new TLKEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'tlk';
  }
}
