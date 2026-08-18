/**
 * Dialogue editor settings.
 *
 * @file DlgSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeSelect } from "@/apps/forge/components/ui";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeDlgSettings, type DlgGraphLayout } from "@/apps/forge/settings/forgeEditorsSettings";

export function DlgSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeDlgSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Dialogue</h3>
      <p className="forge-settings-page__lead">
        Defaults for new conversation tabs. The graph toolbar still changes the current tab only.
      </p>
      <SettingRow
        label="Default graph layout"
        description="Horizontal or vertical node layout when a DLG tab opens."
        keywords={["dlg", "graph", "layout", "conversation"]}
      >
        <ForgeSelect
          value={settings.graphLayout}
          onChange={(e) => setSettings({ graphLayout: e.target.value as DlgGraphLayout })}
          aria-label="Default graph layout"
        >
          <option value="vertical">Vertical</option>
          <option value="horizontal">Horizontal</option>
        </ForgeSelect>
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "dlg",
  label: "Dialogue",
  group: "editors",
  icon: "fa-solid fa-comments",
  keywords: ["dlg", "dialogue", "conversation", "graph"],
  render: () => React.createElement(DlgSettingsPage),
});
