/**
 * Module editor helper visibility.
 *
 * @file ModuleSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import {
  MODULE_HELPER_TYPES,
  forgeModuleSettings,
  setModuleSettings,
  type ModuleHelperType,
} from "@/apps/forge/settings/forgeEditorsSettings";

const HELPER_LABELS: Record<ModuleHelperType, string> = {
  creature: "Creatures",
  door: "Doors",
  encounter: "Encounters",
  placeable: "Placeables",
  merchant: "Merchants",
  sound: "Sounds",
  trigger: "Triggers",
  waypoint: "Waypoints",
};

export function ModuleSettingsPage() {
  const [settings] = useForgeSettings(forgeModuleSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Module</h3>
      <p className="forge-settings-page__lead">
        Which object types are visible when a module editor opens. Applied to the 3D scene groups.
      </p>
      {MODULE_HELPER_TYPES.map((key) => (
        <SettingRow
          key={key}
          label={HELPER_LABELS[key]}
          description={`Show ${HELPER_LABELS[key].toLowerCase()} in the module viewport.`}
          keywords={["module", "helpers", key, HELPER_LABELS[key]]}
        >
          <ForgeCheckbox
            label=""
            value={settings.helpers[key]}
            onChange={(value) => {
              setModuleSettings({
                helpers: { ...settings.helpers, [key]: value },
              });
            }}
          />
        </SettingRow>
      ))}
    </div>
  );
}

registerSettingsPage({
  id: "module",
  label: "Module",
  group: "editors",
  icon: "fa-solid fa-map",
  keywords: ["module", "area", "helpers", "creature", "waypoint", "trigger"],
  render: () => React.createElement(ModuleSettingsPage),
});
