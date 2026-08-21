/**
 * ERF / MOD / SAV archive settings.
 *
 * @file ArchivesSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeArchivesSettings } from "@/apps/forge/settings/forgeEditorsSettings";

export function ArchivesSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeArchivesSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Archives</h3>
      <p className="forge-settings-page__lead">
        ERF, MOD, and SAV extract behavior. Opening an entry still uses File Types defaults.
      </p>
      <SettingRow
        label="Confirm extract overwrite"
        description="Ask before replacing an existing file when exporting all resources from an archive."
        keywords={["erf", "mod", "sav", "extract", "overwrite"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.confirmExtractOverwrite}
          onChange={(value) => setSettings({ confirmExtractOverwrite: value })}
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "archives",
  label: "Archives",
  group: "editors",
  icon: "fa-solid fa-archive",
  keywords: ["erf", "mod", "sav", "archive", "extract"],
  render: () => React.createElement(ArchivesSettingsPage),
});
