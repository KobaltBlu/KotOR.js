/** Options for open dialog (Electron/browser; shape only). */
export interface IOpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

/** Options for message box (Electron/browser; shape only). */
export interface IMessageBoxOptions {
  type?: string;
  title?: string;
  message?: string;
  buttons?: string[];
}

/**
 * WindowDialog class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file WindowDialog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class WindowDialog {
  static showErrorBox(_title: string, _message: string): void {}

  static async showOpenDialog(_opts: IOpenDialogOptions): Promise<string[] | undefined> {
    return undefined;
  }

  static showMessageBox(_opts: IMessageBoxOptions): number {
    return 0;
  }
}
