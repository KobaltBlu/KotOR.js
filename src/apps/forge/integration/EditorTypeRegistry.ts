/**
 * Canonical editor-type resolution shared by Forge and the VS Code extension.
 *
 * This avoids drift between:
 * - standalone Forge file routing (FileTypeManager)
 * - extension host extension->editorType mapping (KotorForgeProvider)
 */

export type ForgeEditorType =
  | 'utc'
  | 'utd'
  | 'utp'
  | 'uti'
  | 'ute'
  | 'uts'
  | 'utt'
  | 'utw'
  | 'utm'
  | 'gff'
  | 'dlg'
  | '2da'
  | 'erf'
  | 'model'
  | 'image'
  | 'walkmesh'
  | 'tlk'
  | 'lip'
  | 'ssf'
  | 'are'
  | 'ifo'
  | 'git'
  | 'jrl'
  | 'fac'
  | 'vis'
  | 'ltr'
  | 'pth'
  | 'gui'
  | 'sav'
  | 'audio'
  | 'json'
  | 'text'
  | 'bik'
  | 'binary';

export const UTX_EXTS = new Set([
  'utc', 'utd', 'utp', 'uti', 'ute', 'uts', 'utt', 'utw', 'utm',
]);

export const GFF_EXTS = new Set([
  'gff', 'res', 'bic',
]);

export const ARCHIVE_EXTS = new Set([
  'erf', 'mod', 'rim',
]);

export const MODEL_EXTS = new Set(['mdl', 'mdx']);
export const IMAGE_EXTS = new Set(['tpc', 'tga']);
export const WALKMESH_EXTS = new Set(['wok', 'dwk', 'pwk', 'bwm']);
export const AUDIO_EXTS = new Set(['wav', 'mp3']);
export const TEXT_EXTS = new Set(['txt', 'txi', 'lyt', 'nss', 'ncs']);

export function normalizeExtension(extension: string): string {
  return extension.replace(/^\./, '').toLowerCase();
}

export function isModelResourceExtension(extension: string): boolean {
  return MODEL_EXTS.has(normalizeExtension(extension));
}

/**
 * Resolve a resource extension to a Forge editor type.
 */
export function getForgeEditorTypeFromExtension(extension: string): ForgeEditorType {
  const ext = normalizeExtension(extension);

  if (UTX_EXTS.has(ext)) return ext as ForgeEditorType;
  if (ext === '2da') return '2da';
  if (ext === 'dlg') return 'dlg';
  if (ext === 'are') return 'are';
  if (ext === 'ifo') return 'ifo';
  if (ext === 'git') return 'git';
  if (ext === 'jrl') return 'jrl';
  if (ext === 'fac') return 'fac';
  if (ext === 'vis') return 'vis';
  if (ext === 'ltr') return 'ltr';
  if (ext === 'pth') return 'pth';
  if (ext === 'gui') return 'gui';
  if (ext === 'sav') return 'sav';
  if (GFF_EXTS.has(ext)) return 'gff';
  if (ARCHIVE_EXTS.has(ext)) return 'erf';
  if (MODEL_EXTS.has(ext)) return 'model';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (WALKMESH_EXTS.has(ext)) return 'walkmesh';
  if (ext === 'tlk') return 'tlk';
  if (ext === 'lip') return 'lip';
  if (ext === 'ssf') return 'ssf';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (TEXT_EXTS.has(ext)) return 'text';
  if (ext === 'bik') return 'bik';
  return 'binary';
}
