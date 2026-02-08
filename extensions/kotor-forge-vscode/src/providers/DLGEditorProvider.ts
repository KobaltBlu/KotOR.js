import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for DLG (Dialog) files
 */
export class DLGEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.dlg';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      DLGEditorProvider.viewType,
      new DLGEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'dlg';
  }
}
