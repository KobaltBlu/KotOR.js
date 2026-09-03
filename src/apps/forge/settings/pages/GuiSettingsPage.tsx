/**
 * GUI editor settings.
 *
 * @file GuiSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeInput } from "@/apps/forge/components/ui";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeGuiSettings } from "@/apps/forge/settings/forgeEditorsSettings";

export function GuiSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeGuiSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">GUI</h3>
      <p className="forge-settings-page__lead">
        Ctrl+wheel zoom limits for the GUI editor canvas.
      </p>
      <SettingRow
        label="Zoom step"
        description="Scale change per Ctrl+wheel tick."
        keywords={["gui", "zoom", "step"]}
      >
        <ForgeInput
          type="number"
          min={0.05}
          max={2}
          step={0.05}
          value={settings.zoomStep}
          onChange={(e) => setSettings({ zoomStep: Number(e.target.value) })}
          aria-label="GUI zoom step"
        />
      </SettingRow>
      <SettingRow
        label="Minimum zoom"
        description="Smallest canvas scale allowed."
        keywords={["gui", "zoom", "min"]}
      >
        <ForgeInput
          type="number"
          min={0.05}
          max={4}
          step={0.05}
          value={settings.zoomMin}
          onChange={(e) => setSettings({ zoomMin: Number(e.target.value) })}
          aria-label="GUI minimum zoom"
        />
      </SettingRow>
      <SettingRow
        label="Maximum zoom"
        description="Largest canvas scale allowed."
        keywords={["gui", "zoom", "max"]}
      >
        <ForgeInput
          type="number"
          min={0.5}
          max={16}
          step={0.25}
          value={settings.zoomMax}
          onChange={(e) => setSettings({ zoomMax: Number(e.target.value) })}
          aria-label="GUI maximum zoom"
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "gui",
  label: "GUI",
  group: "editors",
  icon: "fa-solid fa-window-restore",
  keywords: ["gui", "menu", "zoom", "canvas"],
  render: () => React.createElement(GuiSettingsPage),
});
