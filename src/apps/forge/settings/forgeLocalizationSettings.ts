/**
 * LocString language / gender defaults used across GFF, UTx, DLG, and TLK.
 *
 * @file forgeLocalizationSettings.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { CExoLocString } from "@/resource/CExoLocString";
import {
  asSettingsRecord,
  createForgeSettingsBag,
  sanitizeBoolean,
  sanitizeInteger,
} from "@/apps/forge/settings/forgeSettingsStore";

export const FORGE_LOCALIZATION_SETTINGS_KEY = "Forge.localization";

export const FORGE_LOC_LANGUAGES: ReadonlyArray<{ id: number; name: string }> = [
  { id: 0, name: "English" },
  { id: 1, name: "French" },
  { id: 2, name: "German" },
  { id: 3, name: "Italian" },
  { id: 4, name: "Spanish" },
  { id: 5, name: "Polish" },
  { id: 6, name: "Korean" },
  { id: 7, name: "Chinese (Traditional)" },
  { id: 8, name: "Chinese (Simplified)" },
  { id: 9, name: "Japanese" },
];

export const FORGE_LOC_GENDERS: ReadonlyArray<{ id: number; name: string }> = [
  { id: 0, name: "Male" },
  { id: 1, name: "Female" },
];

export interface ForgeLocalizationSettings {
  language: number;
  gender: number;
  previewStrRefFromTlk: boolean;
}

export const DEFAULT_FORGE_LOCALIZATION_SETTINGS: ForgeLocalizationSettings = {
  language: 0,
  gender: 0,
  previewStrRefFromTlk: true,
};

function isLanguageId(value: unknown): value is number {
  return typeof value === "number" && FORGE_LOC_LANGUAGES.some((entry) => entry.id === value);
}

function isGenderId(value: unknown): value is number {
  return value === 0 || value === 1;
}

export function sanitizeLocalizationSettings(value: unknown): ForgeLocalizationSettings {
  const raw = asSettingsRecord(value);
  return {
    language: isLanguageId(raw.language)
      ? raw.language
      : sanitizeInteger(raw.language, DEFAULT_FORGE_LOCALIZATION_SETTINGS.language, 0, 9),
    gender: isGenderId(raw.gender) ? raw.gender : DEFAULT_FORGE_LOCALIZATION_SETTINGS.gender,
    previewStrRefFromTlk: sanitizeBoolean(
      raw.previewStrRefFromTlk,
      DEFAULT_FORGE_LOCALIZATION_SETTINGS.previewStrRefFromTlk,
    ),
  };
}

export const forgeLocalizationSettings = createForgeSettingsBag({
  key: FORGE_LOCALIZATION_SETTINGS_KEY,
  eventName: "forge-localization-settings-change",
  defaults: DEFAULT_FORGE_LOCALIZATION_SETTINGS,
  sanitize: sanitizeLocalizationSettings,
});

export function getLocalizationSettings(): ForgeLocalizationSettings {
  return forgeLocalizationSettings.get();
}

export function setLocalizationSettings(
  patch: Partial<ForgeLocalizationSettings>,
): ForgeLocalizationSettings {
  return forgeLocalizationSettings.set(patch);
}

export function locStringId(language: number, gender: number): number {
  return (language * 2) + gender;
}

export function pickLocStringOverride(
  loc: CExoLocString | undefined,
  language = getLocalizationSettings().language,
  gender = getLocalizationSettings().gender,
): string {
  if (!loc) {
    return "";
  }
  const strings = loc.getStrings() || [];
  for (let i = 0; i < strings.length; i++) {
    const sub = strings[i];
    if (sub && sub.language === language && sub.gender === gender && sub.str) {
      return sub.str;
    }
  }
  const first = loc.getString(0);
  return first?.str || "";
}
