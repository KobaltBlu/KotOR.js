import * as path from 'path';

import * as vscode from 'vscode';

import { KotorDocument } from '../KotorDocument';
import { LogScope, createScopedLogger } from '../logger';
import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

const log = createScopedLogger(LogScope.Forge);

const GFF_EXTS = new Set([
  'gff', 'res', 'are', 'git', 'ifo', 'jrl', 'fac', 'gui', 'pth', 'vis', 'ltr', 'bic'
]);
const UTX_EXTS = new Set(['utc', 'utd', 'utp', 'uti', 'ute', 'uts', 'utt', 'utw', 'utm']);
const MODEL_EXTS = new Set(['mdl', 'mdx']);
const IMAGE_EXTS = new Set(['tpc', 'tga']);
const WALKMESH_EXTS = new Set(['wok', 'dwk', 'pwk', 'bwm']);
const ARCHIVE_EXTS = new Set(['erf', 'mod', 'sav', 'rim']);
const AUDIO_EXTS = new Set(['wav', 'mp3']);

function getEditorTypeFromExt(ext: string): string {
  const lower = ext.toLowerCase();
  let editorType: string;
  if (UTX_EXTS.has(lower)) editorType = lower;
  else if (GFF_EXTS.has(lower)) editorType = 'gff';
  else if (lower === 'dlg') editorType = 'dlg';
  else if (lower === '2da') editorType = '2da';
  else if (ARCHIVE_EXTS.has(lower)) editorType = 'erf';
  else if (MODEL_EXTS.has(lower)) editorType = 'model';
  else if (IMAGE_EXTS.has(lower)) editorType = 'image';
  else if (WALKMESH_EXTS.has(lower)) editorType = 'walkmesh';
  else if (lower === 'tlk') editorType = 'tlk';
  else if (lower === 'lip') editorType = 'lip';
  else if (lower === 'ssf') editorType = 'ssf';
  else if (AUDIO_EXTS.has(lower)) editorType = 'audio';
  else editorType = 'binary';
  log.trace(`getEditorTypeFromExt(${ext}) -> ${editorType}`);
  return editorType;
}

/**
 * Single VS Code custom editor provider that delegates ALL editor logic to Forge.
 */
export class KotorForgeProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.forge';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    log.debug('Registering KotorForgeProvider');
    log.trace(`register() viewType=${KotorForgeProvider.viewType}`);
    const disposable = vscode.window.registerCustomEditorProvider(
      KotorForgeProvider.viewType,
      new KotorForgeProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
    log.debug('KotorForgeProvider registered successfully');
    return disposable;
  }

  protected getEditorTypeForDocument(document: KotorDocument): string {
    const ext = path.extname(document.uri.fsPath).replace('.', '');
    const editorType = getEditorTypeFromExt(ext);
    log.trace(`getEditorTypeForDocument: ${document.uri.fsPath} -> ${editorType}`);
    return editorType;
  }

  protected async getExtraInitData(document: KotorDocument): Promise<Record<string, unknown>> {
    const ext = path.extname(document.uri.fsPath).replace('.', '').toLowerCase();
    log.trace(`getExtraInitData() uri=${document.uri.fsPath} ext=${ext}`);
    if (!MODEL_EXTS.has(ext)) {
      log.trace(`getExtraInitData() not a model ext, returning {}`);
      return {};
    }

    // For MDL/MDX editors, provide the sibling buffer (MDL <-> MDX) if it exists.
    const siblingExt = ext === 'mdl' ? 'mdx' : 'mdl';
    const siblingUri = document.uri.with({
      path: document.uri.path.replace(/\.[^/.]+$/, `.${siblingExt}`)
    });
    log.debug(`getExtraInitData() model file, attempting sibling ${siblingExt} at ${siblingUri.fsPath}`);
    try {
      const siblingData = await vscode.workspace.fs.readFile(siblingUri);
      log.info(`getExtraInitData() sibling found, ${siblingData.length} bytes`);
      return { fileData2: Array.from(siblingData) };
    } catch (err) {
      log.trace(`getExtraInitData() sibling not found or error: ${err}`);
      return {};
    }
  }
}
