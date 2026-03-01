import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for binary file viewing (fallback)
 */
export class BinaryViewerProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.binary';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      BinaryViewerProvider.viewType,
      new BinaryViewerProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: false
        },
        supportsMultipleEditorsPerDocument: true
      }
    );
  }

  protected getEditorType(): string {
    return 'binary';
  }
}
