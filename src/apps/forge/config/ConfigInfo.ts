/**
 * ConfigInfo – Forge/KotOR.js version and update metadata.
 * This is the source of truth for CURRENT_VERSION and update links.
 */

export interface LocalProgramInfo {
  currentVersion: string;
  latestVersion: string;
  latestBetaVersion: string;
  updateInfoLink: string;
  updateBetaInfoLink: string;
  downloadLink: string;
  betaDownloadLink: string;
  directLinks: Record<string, Record<string, string[]>>;
  betaDirectLinks: Record<string, Record<string, string[]>>;
  latestNotes: string;
  latestBetaNotes: string;
  repoUrl?: string;
  help?: { version: number };
  kits?: Record<string, { version: number; id: string }> & { repository?: string; release_tag?: string };
}

/**
 * Local program info for Forge. Used for update checks and about dialog.
 * For KotOR.js/Forge we point to this repo; adjust links if hosting a separate Forge release.
 */
export const LOCAL_PROGRAM_INFO: LocalProgramInfo = {
  currentVersion: '2.0.0',
  latestVersion: '2.0.0',
  latestBetaVersion: '2.0.0',
  updateInfoLink: 'https://api.github.com/repos/KobaltBlu/KotOR.js/contents/package.json',
  updateBetaInfoLink: 'https://api.github.com/repos/KobaltBlu/KotOR.js/contents/package.json?ref=develop',
  downloadLink: 'https://github.com/KobaltBlu/KotOR.js/releases',
  betaDownloadLink: 'https://github.com/KobaltBlu/KotOR.js/releases',
  directLinks: {
    Windows: { '64bit': ['https://github.com/KobaltBlu/KotOR.js/releases'] },
    Darwin: { '64bit': ['https://github.com/KobaltBlu/KotOR.js/releases'] },
    Linux: { '64bit': ['https://github.com/KobaltBlu/KotOR.js/releases'] },
  },
  betaDirectLinks: {
    Windows: { '64bit': ['https://github.com/KobaltBlu/KotOR.js/releases'] },
    Darwin: { '64bit': ['https://github.com/KobaltBlu/KotOR.js/releases'] },
    Linux: { '64bit': ['https://github.com/KobaltBlu/KotOR.js/releases'] },
  },
  /** KotOR.js/Forge repo (used by About dialog). */
  repoUrl: 'https://github.com/KobaltBlu/KotOR.js',
  latestNotes: 'Forge editor for KotOR I & II resources.',
  latestBetaNotes: 'Forge editor for KotOR I & II resources.',
  help: { version: 1 },
};

/** Current Forge/app version (source of truth for display and update check). */
export const CURRENT_VERSION = LOCAL_PROGRAM_INFO.currentVersion;
