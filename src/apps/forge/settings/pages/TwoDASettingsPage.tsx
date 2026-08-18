/**
 * 2DA editor settings.
 *
 * @file TwoDASettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeTwoDASettings } from "@/apps/forge/settings/forgeEditorsSettings";

export function TwoDASettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeTwoDASettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">2DA</h3>
      <p className="forge-settings-page__lead">
        Table display for 2DA files. Changes apply immediately to open 2DA tabs.
      </p>
      <SettingRow
        label="Wrap cells"
        description="Wrap long cell text instead of clipping on one line."
        keywords={["2da", "wrap", "cells", "table"]}
      >
        <ForgeCheckbox label="" value={settings.wrapCells} onChange={(value) => setSettings({ wrapCells: value })} />
      </SettingRow>
      <SettingRow
        label="Show row label column"
        description="Show the leading __rowlabel index column."
        keywords={["2da", "row", "label", "index"]}
      >
        <ForgeCheckbox label="" value={settings.showRowLabel} onChange={(value) => setSettings({ showRowLabel: value })} />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "twoda",
  label: "2DA",
  group: "editors",
  icon: "fa-solid fa-table",
  keywords: ["2da", "table", "csv", "row", "wrap"],
  render: () => React.createElement(TwoDASettingsPage),
});
