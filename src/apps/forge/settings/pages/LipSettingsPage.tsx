/**
 * LIP editor settings.
 *
 * @file LipSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeInput } from "@/apps/forge/components/ui";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeLipSettings } from "@/apps/forge/settings/forgeEditorsSettings";

export function LipSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeLipSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">LIP</h3>
      <p className="forge-settings-page__lead">
        Default preview head for new lipsync tabs. Choosing a head in a LIP tab also updates this.
      </p>
      <SettingRow
        label="Default preview head"
        description="Heads.2da resref used when a LIP file opens (for example p_bastilah)."
        keywords={["lip", "head", "preview", "phoneme"]}
      >
        <ForgeInput
          value={settings.head}
          onChange={(e) => setSettings({ head: e.target.value })}
          aria-label="Default preview head"
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "lip",
  label: "LIP",
  group: "editors",
  icon: "fa-solid fa-face-smile",
  keywords: ["lip", "lipsync", "phoneme", "head"],
  render: () => React.createElement(LipSettingsPage),
});
