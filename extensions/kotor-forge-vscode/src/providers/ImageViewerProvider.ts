import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for TPC/TGA texture files
 */
export class ImageViewerProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.image';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      ImageViewerProvider.viewType,
      new ImageViewerProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'image';
  }
}
