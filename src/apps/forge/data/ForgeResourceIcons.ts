/**
 * Maps Forge resource type (extension) to Holocron-style icon identifiers.
 * Used so UI (e.g. resource tree, file list) can show per-type icons.
 * Place Holocron PNGs in src/assets/forge/assets/icons/ named by icon id (e.g. k1_2da.png).
 * Standalone Forge and the extension webview both use this path (assets/icons/).
 */

/** Extension (lowercase) -> icon id (matches Holocron icon filenames without .png). */
export const RESOURCE_ICON_BY_EXTENSION: Record<string, string> = {
  '2da': 'k1_2da',
  are: 'k1_creature',
  bmp: 'k2_texture',
  bwm: 'k1_walkmesh',
  dlg: 'k1_dialog',
  dds: 'k2_texture',
  erf: 'k1_blank',
  fac: 'k1_blank',
  gff: 'k1_blank',
  git: 'k1_git',
  res: 'k1_blank',
  ifo: 'k1_journal',
  jrl: 'k1_journal',
  lip: 'k1_sound',
  ltr: 'k1_blank',
  lyt: 'k1_model',
  mdl: 'k1_model',
  mdx: 'k1_model',
  mod: 'k1_blank',
  ncs: 'k1_script',
  nss: 'k1_script',
  pth: 'k1_walkmesh',
  sav: 'k1_blank',
  ssf: 'k1_blank',
  tlk: 'k1_tlk',
  tpc: 'k2_texture',
  tga: 'k2_texture',
  txi: 'k1_blank',
  txt: 'k1_blank',
  utc: 'k1_creature',
  utd: 'k1_door',
  ute: 'k1_sound',
  uti: 'k1_item',
  utm: 'k1_placeable',
  utp: 'k1_placeable',
  uts: 'k1_soundset',
  utt: 'k1_merchant',
  utw: 'k1_waypoint',
  vis: 'k1_blank',
  wav: 'k1_sound',
  wok: 'k1_walkmesh',
  dwk: 'k1_walkmesh',
  pwk: 'k1_walkmesh',
};

/** Relative path prefix for Holocron resource icons (resolve relative to app base). */
export const RESOURCE_ICON_PATH_PREFIX = 'assets/icons/';

/**
 * Returns the icon id for a resource extension (e.g. '2da' -> 'k1_2da').
 * Returns 'k1_blank' for unknown types.
 */
export function getResourceIconId(extension: string): string {
  const ext = (extension || '').toLowerCase().replace(/^\./, '');
  return RESOURCE_ICON_BY_EXTENSION[ext] ?? 'k1_blank';
}

/**
 * Returns the relative path to the icon for a resource extension (e.g. 'assets/icons/k1_2da.png').
 * Use with your app's asset base URL when rendering (e.g. baseUrl + getResourceIconPath(ext)).
 */
export function getResourceIconPath(extension: string): string {
  return RESOURCE_ICON_PATH_PREFIX + getResourceIconId(extension) + '.png';
}
