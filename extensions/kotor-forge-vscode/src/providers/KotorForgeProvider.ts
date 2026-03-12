import * as path from 'path';
import * as vscode from 'vscode';

import { KotorDocument } from '../KotorDocument';
import { LogScope, createScopedLogger } from '../logger';

import { BaseKotorEditorProvider } from './BaseKotorEditorProvider';

const log = createScopedLogger(LogScope.Forge);

/** GFF-based types that use the generic GFF editor (res, bic, gui, pth, vis). Dedicated editors: are, ifo, git, jrl, fac, ltr, dlg. */
const GFF_EXTS = new Set(['gff', 'res', 'gui', 'pth', 'vis', 'bic']);
const UTX_EXTS = new Set(['utc', 'utd', 'utp', 'uti', 'ute', 'uts', 'utt', 'utw', 'utm']);
const MODEL_EXTS = new Set(['mdl', 'mdx']);
const IMAGE_EXTS = new Set(['tpc', 'tga']);
const WALKMESH_EXTS = new Set(['wok', 'dwk', 'pwk', 'bwm']);
const ARCHIVE_EXTS = new Set(['erf', 'mod', 'rim']);
const AUDIO_EXTS = new Set(['wav', 'mp3']);

function getEditorTypeFromExt(ext: string): string {
  const lower = ext.toLowerCase();
  let editorType: string;
  if (UTX_EXTS.has(lower)) editorType = lower;
  else if (lower === 'are') editorType = 'are';
  else if (lower === 'ifo') editorType = 'ifo';
  else if (lower === 'git') editorType = 'git';
  else if (lower === 'jrl') editorType = 'jrl';
  else if (lower === 'fac') editorType = 'fac';
  else if (lower === 'ltr') editorType = 'ltr';
  else if (lower === 'dlg') editorType = 'dlg';
  else if (GFF_EXTS.has(lower)) editorType = 'gff';
  else if (lower === '2da') editorType = '2da';
  else if (ARCHIVE_EXTS.has(lower)) editorType = 'erf';
  else if (lower === 'sav') editorType = 'sav';
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
 * Can optionally force a specific editor type (e.g. 'gff' for "Open in Generic GFF Editor").
 */
export class KotorForgeProvider extends BaseKotorEditorProvider {
  public static readonly viewType = 'kotor.forge';
  public static readonly viewTypeGff = 'kotor.forge.gff';
  public static readonly viewTypeJson = 'kotor.forge.json';

  /** If set, overrides editor type (e.g. 'gff' for generic GFF editor regardless of extension). */
  private readonly forceEditorType?: string;

  constructor(
    context: vscode.ExtensionContext,
    forceEditorType?: string
  ) {
    super(context);
    this.forceEditorType = forceEditorType;
    log.trace(`KotorForgeProvider constructed forceEditorType=${forceEditorType ?? 'none'}`);
  }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    log.debug('Registering KotorForgeProvider (default, GFF, JSON)');
    log.trace(`register() viewType=${KotorForgeProvider.viewType} viewTypeGff=${KotorForgeProvider.viewTypeGff} viewTypeJson=${KotorForgeProvider.viewTypeJson}`);
    const defaultProvider = new KotorForgeProvider(context);
    const gffProvider = new KotorForgeProvider(context, 'gff');
    const jsonProvider = new KotorForgeProvider(context, 'json');
    const disp1 = vscode.window.registerCustomEditorProvider(
      KotorForgeProvider.viewType,
      defaultProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
    const disp2 = vscode.window.registerCustomEditorProvider(
      KotorForgeProvider.viewTypeGff,
      gffProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
    const disp3 = vscode.window.registerCustomEditorProvider(
      KotorForgeProvider.viewTypeJson,
      jsonProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
    const providers = [defaultProvider, gffProvider, jsonProvider];

    const postRunCommandToUri = (uri: vscode.Uri, command: string): boolean => {
      const message = { type: 'runCommand' as const, command };
      for (const p of providers) {
        if (p.postToWebviewsForUri(uri, message)) return true;
      }
      return false;
    };

    const composite = vscode.Disposable.from(disp1, disp2, disp3);
    return Object.assign(composite, { postRunCommandToUri });
  }

  protected getEditorTypeForDocument(document: KotorDocument): string {
    if (this.forceEditorType) {
      log.debug(`getEditorTypeForDocument: forced editorType=${this.forceEditorType} uri=${document.uri.fsPath}`);
      return this.forceEditorType;
    }
    const ext = path.extname(document.uri.fsPath).replace('.', '');
    const editorType = getEditorTypeFromExt(ext);
    log.trace(`getEditorTypeForDocument: ${document.uri.fsPath} ext=${ext} -> ${editorType}`);
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
