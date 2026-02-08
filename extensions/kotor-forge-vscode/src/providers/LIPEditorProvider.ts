import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for LIP (Lip Sync) files
 */
export class LIPEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.lip';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      LIPEditorProvider.viewType,
      new LIPEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'lip';
  }
}
