/**
 * Save-folder path helpers for Forge Game explorer and savegame editor routing.
 *
 * @file saveGamePaths.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface SaveFolderFileEntry {
  /** Game-relative path, forward slashes (e.g. Saves/000001 - AUTOSAVE/savenfo.res). */
  relPath: string;
  /** File name inside the save folder (may include nested segments). */
  fileName: string;
}

export interface SaveFolderFileGroup {
  /** Parent directory of the files (e.g. Saves/000001 - AUTOSAVE). */
  folderRel: string;
  /** Last folder segment (e.g. 000001 - AUTOSAVE). */
  folderName: string;
  files: SaveFolderFileEntry[];
}

export function normalizeGameRelPath(filepath: string): string {
  return String(filepath ?? '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

/** Canonical sidecar names as written by retail KotOR/TSL. */
export const SAVE_SIDECAR_CANONICAL: Record<string, string> = {
  'savenfo.res': 'savenfo.res',
  'partytable.res': 'PARTYTABLE.res',
  'globalvars.res': 'GLOBALVARS.res',
  'screen.tga': 'Screen.tga',
  'pifo.ifo': 'pifo.ifo',
  'savegame.sav': 'SAVEGAME.sav',
};

export const SAVE_MODULE_GFF_EXTS = [
  'ifo', 'are', 'git', 'fac', 'res', 'gic',
  'utc', 'utd', 'ute', 'uti', 'utm', 'utp', 'uts', 'utt', 'utw',
  'dlg', 'gui', 'jrl', 'gff',
] as const;

const SAVE_MODULE_GFF_EXT_SET = new Set<string>(SAVE_MODULE_GFF_EXTS);
const SAVE_MODULE_GFF_PRIORITY = ['ifo', 'are', 'git'];

export function isSaveGameSavFileName(name: string): boolean {
  const base = normalizeGameRelPath(name).split('/').pop() || '';
  return base.toLowerCase() === 'savegame.sav';
}

export function matchSaveSidecarFileName(fileName: string): string | undefined {
  const base = (normalizeGameRelPath(fileName).split('/').pop() || '').toLowerCase();
  return SAVE_SIDECAR_CANONICAL[base];
}

export function isSaveModuleGffExt(ext: string): boolean {
  return SAVE_MODULE_GFF_EXT_SET.has(String(ext || '').replace(/^\./, '').toLowerCase());
}

export function compareSaveModuleGffKeys(a: { ext: string; name: string }, b: { ext: string; name: string }): number {
  const aExt = String(a.ext || '').toLowerCase();
  const bExt = String(b.ext || '').toLowerCase();
  const aPri = SAVE_MODULE_GFF_PRIORITY.indexOf(aExt);
  const bPri = SAVE_MODULE_GFF_PRIORITY.indexOf(bExt);
  const aRank = aPri >= 0 ? aPri : SAVE_MODULE_GFF_PRIORITY.length;
  const bRank = bPri >= 0 ? bPri : SAVE_MODULE_GFF_PRIORITY.length;
  if (aRank !== bRank) {
    return aRank - bRank;
  }
  return a.name.localeCompare(b.name);
}

/**
 * `readdir` of a nested save folder can return either a game-relative path or
 * only the last directory segment (web FSAPI). Always resolve under `folderRel`.
 */
export function resolveSaveFolderListedPath(folderRel: string, listedPath: string): { fileName: string; relPath: string } {
  const fileName = (normalizeGameRelPath(listedPath).split('/').pop() || listedPath).trim();
  const folder = normalizeGameRelPath(folderRel);
  return {
    fileName,
    relPath: folder ? `${folder}/${fileName}` : fileName,
  };
}

/**
 * True for a loose SAVEGAME.sav on disk / game / project FS.
 * Nested module archives inside that ERF (ebo_m12aa.sav, etc.) have archive_path.
 */
export function isTopLevelSaveGameSav(file: {
  archive_path?: string;
  path?: string;
  resref?: string;
  ext?: string;
  getFilename?: () => string;
}): boolean {
  if (file?.archive_path) {
    return false;
  }
  const fromGetter = file?.getFilename?.();
  if (fromGetter && isSaveGameSavFileName(fromGetter)) {
    return true;
  }
  const ext = String(file?.ext || '').replace(/^\./, '').toLowerCase();
  if (ext === 'sav' && String(file?.resref || '').toLowerCase() === 'savegame') {
    return true;
  }
  const p = normalizeGameRelPath(String(file?.path || '')).toLowerCase();
  return p === 'savegame.sav' || p.endsWith('/savegame.sav');
}

/**
 * Group a recursive `Saves/` listing into per-save-folder file lists.
 * Nested files stay under the first folder below `Saves/`.
 */
export function groupGameSaveFolderFiles(paths: string[]): SaveFolderFileGroup[] {
  const map = new Map<string, SaveFolderFileGroup>();

  for (let i = 0; i < paths.length; i++) {
    const relPath = normalizeGameRelPath(paths[i]);
    if (!relPath) {
      continue;
    }
    const parts = relPath.split('/').filter(Boolean);
    if (parts.length < 2) {
      continue;
    }

    let folderRel: string;
    let folderName: string;
    let fileName: string;
    const first = parts[0].toLowerCase();

    if (first === 'saves' && parts.length >= 3) {
      folderName = parts[1];
      folderRel = `${parts[0]}/${parts[1]}`;
      fileName = parts.slice(2).join('/');
    } else if (first === 'saves' && parts.length === 2) {
      folderName = parts[0];
      folderRel = parts[0];
      fileName = parts[1];
    } else {
      fileName = parts[parts.length - 1];
      folderName = parts[parts.length - 2];
      folderRel = parts.slice(0, -1).join('/');
    }

    if (!fileName) {
      continue;
    }

    let group = map.get(folderRel);
    if (!group) {
      group = { folderRel, folderName, files: [] };
      map.set(folderRel, group);
    }
    group.files.push({ relPath, fileName });
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => a.folderName.localeCompare(b.folderName, undefined, { numeric: true }));
  for (let i = 0; i < groups.length; i++) {
    groups[i].files.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));
  }
  return groups;
}
