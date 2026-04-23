import * as vscode from 'vscode';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

/**
 * Provider for WAV/MP3 audio files
 */
export class AudioPlayerProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.audio';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      AudioPlayerProvider.viewType,
      new AudioPlayerProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: false
        },
        supportsMultipleEditorsPerDocument: true
      }
    );
  }

  protected getEditorType(): string {
    return 'audio';
  }
}
