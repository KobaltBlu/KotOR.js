/**
 * SSF editor settings.
 *
 * @file SsfSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeSsfSettings } from "@/apps/forge/settings/forgeEditorsSettings";

export function SsfSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeSsfSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">SSF</h3>
      <p className="forge-settings-page__lead">
        Sound-set editor defaults. Changes apply immediately to open SSF tabs.
      </p>
      <SettingRow
        label="Auto-preview on select"
        description="Play the sound for a slot when you select its row."
        keywords={["ssf", "sound set", "preview", "autoplay"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.autoplayOnSelect}
          onChange={(value) => setSettings({ autoplayOnSelect: value })}
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "ssf",
  label: "SSF",
  group: "editors",
  icon: "fa-solid fa-volume-high",
  keywords: ["ssf", "sound set", "preview"],
  render: () => React.createElement(SsfSettingsPage),
});
