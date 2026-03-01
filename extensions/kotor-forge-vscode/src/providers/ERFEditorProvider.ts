import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for ERF/MOD/SAV/RIM archive files
 */
export class ERFEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.erf';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      ERFEditorProvider.viewType,
      new ERFEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'erf';
  }
}
