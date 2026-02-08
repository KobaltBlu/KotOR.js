import * as vscode from 'vscode';
import * as path from 'path';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';
import { KotorDocument } from '../KotorDocument';

/**
 * Provider for MDL/MDX 3D model files.
 * When opening a .mdl file, attempts to load the sibling .mdx for accurate 3D preview.
 */
export class ModelViewerProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.model';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      ModelViewerProvider.viewType,
      new ModelViewerProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  protected getEditorType(): string {
    return 'model';
  }

  protected async getExtraInitData(document: KotorDocument): Promise<Record<string, unknown>> {
    const uri = document.uri;
    const base = uri.fsPath;
    if (!base.toLowerCase().endsWith('.mdl')) {
      return {};
    }
    const mdxPath = path.join(path.dirname(base), path.basename(base, '.mdl') + '.mdx');
    const mdxUri = vscode.Uri.file(mdxPath);
    try {
      const mdxBuffer = await vscode.workspace.fs.readFile(mdxUri);
      return { mdxData: Array.from(mdxBuffer) };
    } catch {
      return {};
    }
  }
}
