import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for SSF (Sound Set) files
 */
export class SSFEditorProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.ssf';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      SSFEditorProvider.viewType,
      new SSFEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'ssf';
  }
}
