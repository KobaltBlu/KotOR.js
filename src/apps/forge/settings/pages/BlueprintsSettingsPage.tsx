/**
 * Shared blueprint (UTx) editor settings.
 *
 * @file BlueprintsSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeBlueprintsSettings } from "@/apps/forge/settings/forgeEditorsSettings";

export function BlueprintsSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeBlueprintsSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Blueprints</h3>
      <p className="forge-settings-page__lead">
        Shared defaults for UTC, UTD, UTE, UTI, UTM, UTP, UTS, UTT, and UTW editors.
      </p>
      <SettingRow
        label="Show 3D preview"
        description="Load a model preview when game data is bound. Off keeps the form-only layout."
        keywords={["blueprint", "utc", "preview", "3d"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.show3DPreview}
          onChange={(value) => setSettings({ show3DPreview: value })}
        />
      </SettingRow>
      <SettingRow
        label="Auto-expand LocString editor"
        description="Open LocString fields expanded instead of the collapsed preview row."
        keywords={["blueprint", "locstring", "expand"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.autoExpandLocString}
          onChange={(value) => setSettings({ autoExpandLocString: value })}
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "blueprints",
  label: "Blueprints",
  group: "editors",
  icon: "fa-solid fa-id-card",
  keywords: ["utc", "utd", "uti", "utp", "blueprint", "preview", "locstring"],
  render: () => React.createElement(BlueprintsSettingsPage),
});
