import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for 2DA table files
 */
export class TwoDAEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.2da';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      TwoDAEditorProvider.viewType,
      new TwoDAEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return '2da';
  }
}
