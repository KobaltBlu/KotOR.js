import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for WOK/DWK/PWK/BWM (Walkmesh) files
 */
export class WalkmeshEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.walkmesh';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      WalkmeshEditorProvider.viewType,
      new WalkmeshEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'walkmesh';
  }
}
