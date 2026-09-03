/**
 * LocString language and gender defaults.
 *
 * @file LocalizationSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeSelect } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import {
  FORGE_LOC_GENDERS,
  FORGE_LOC_LANGUAGES,
  forgeLocalizationSettings,
} from "@/apps/forge/settings/forgeLocalizationSettings";

export function LocalizationSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeLocalizationSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Localization</h3>
      <p className="forge-settings-page__lead">
        Default language and gender for LocString fields in GFF, blueprints, conversations, and the talk table.
      </p>
      <SettingRow
        label="Language"
        description="Preferred CExoLocString language when adding or previewing substrings."
        keywords={["language", "locstring", "english", "tlk"]}
      >
        <ForgeSelect
          value={String(settings.language)}
          onChange={(e) => setSettings({ language: Number(e.target.value) })}
          aria-label="LocString language"
        >
          {FORGE_LOC_LANGUAGES.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.name}</option>
          ))}
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Gender"
        description="Preferred male or female substring when a LocString has both."
        keywords={["gender", "male", "female", "locstring"]}
      >
        <ForgeSelect
          value={String(settings.gender)}
          onChange={(e) => setSettings({ gender: Number(e.target.value) })}
          aria-label="LocString gender"
        >
          {FORGE_LOC_GENDERS.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.name}</option>
          ))}
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Preview StrRefs from talk table"
        description="When game data is bound, resolve StrRef previews from dialog.tlk instead of showing only the number."
        keywords={["strref", "tlk", "preview", "talk table"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.previewStrRefFromTlk}
          onChange={(value) => setSettings({ previewStrRefFromTlk: value })}
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "localization",
  label: "Localization",
  group: "application",
  icon: "fa-solid fa-language",
  keywords: ["localization", "language", "gender", "locstring", "tlk", "strref"],
  render: () => React.createElement(LocalizationSettingsPage),
});
