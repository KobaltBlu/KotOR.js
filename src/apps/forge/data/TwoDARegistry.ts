/**
 * TwoDARegistry – canonical 2DA resnames used by the game (ported from Holocron/PyKotor).
 * Use these when loading 2DA files for editors (appearance, baseitems, classes, etc.).
 */

/** Canonical 2DA resource names (lowercase resref) verified to be loaded by the game. */
export const TwoDARegistry = {
  APPEARANCES: "appearance",
  BASEITEMS: "baseitems",
  CAMERAS: "cameras",
  CLASSES: "classes",
  CLASSPOWERGAIN: "classpowergain",
  COMBATANIMATIONS: "combatanimations",
  CREATURESPEED: "creaturespeed",
  CURSORS: "cursors",
  DIALOG_ANIMS: "dialoganim",
  DOORS: "doors",
  EMOTIONS: "emotions",
  ENC_DIFFICULTIES: "encdifficulty",
  EXPRESSIONS: "expressions",
  FACTIONS: "factions",
  FEATS: "feat",
  GENDERS: "gender",
  IPRP_ABILITIES: "iprp_abilities",
  IPRP_ACMODTYPE: "iprp_acmodtype",
  IPRP_ALIGNGRP: "iprp_aligngrp",
  IPRP_AMMOTYPE: "iprp_ammotype",
  IPRP_COMBATDAM: "iprp_combatdam",
  IPRP_COSTTABLE: "iprp_costtable",
  IPRP_DAMAGETYPE: "iprp_damagetype",
  IPRP_IMMUNITY: "iprp_immunity",
  IPRP_MONSTERHIT: "iprp_monsterhit",
  IPRP_ONHIT: "iprp_onhit",
  IPRP_PARAMTABLE: "iprp_paramtable",
  IPRP_PROTECTION: "iprp_protection",
  IPRP_SAVEELEMENT: "iprp_saveelement",
  IPRP_SAVINGTHROW: "iprp_savingthrow",
  IPRP_WALK: "iprp_walk",
  ITEM_PROPERTIES: "itempropdef",
  PERCEPTIONS: "perception",
  PLACEABLES: "placeables",
  PLANETS: "planets",
  PLOT: "plot",
  PORTRAITS: "portraits",
  POWERS: "powers",
  RACES: "racialtypes",
  SKILLS: "skills",
  SOUNDSETS: "soundset",
  SPEEDS: "speed",
  SUBRACES: "subraces",
  TRAPS: "traps",
  UPGRADES: "upgrades",
  VIDEO_EFFECTS: "videoeffects",
} as const;

export type TwoDARegistryKey = keyof typeof TwoDARegistry;

/** List of all canonical 2DA resnames (for dropdowns / iteration). */
export const TWODA_CANONICAL_RESNAMES: string[] = Object.values(TwoDARegistry);

/** Get 2DA resname by key (e.g. TwoDARegistry.APPEARANCES). */
export function getTwoDAResname(key: TwoDARegistryKey): string {
  return TwoDARegistry[key];
}
