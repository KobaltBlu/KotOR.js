/**
 * Module editor helper visibility and workbench options.
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
        Workbench layout, snapping, and which object helpers are visible in the 3D scene.
      </p>

      <h4 className="forge-settings-page__subtitle">Workbench</h4>
      <SettingRow
        label="Modern workbench"
        description="Hierarchy, asset browser, viewport toolbar, and problems panel."
        keywords={["module", "workbench", "layout", "unity", "unreal"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.workbenchEnabled}
          onChange={(value) => setModuleSettings({ workbenchEnabled: value })}
        />
      </SettingRow>
      <SettingRow
        label="Command history"
        description="Named transactional undo for transforms and edits (snapshot fallback remains)."
        keywords={["module", "undo", "history", "command"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.commandHistoryEnabled}
          onChange={(value) => setModuleSettings({ commandHistoryEnabled: value })}
        />
      </SettingRow>
      <SettingRow
        label="Show viewport toolbar"
        description="Select / move / rotate / scale / place tools above the scene."
        keywords={["module", "toolbar", "gizmo"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.showViewportToolbar}
          onChange={(value) => setModuleSettings({ showViewportToolbar: value })}
        />
      </SettingRow>
      <SettingRow
        label="Problems panel"
        description="Show validation diagnostics under the scene."
        keywords={["module", "problems", "validation"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.showProblemsPanel}
          onChange={(value) => setModuleSettings({ showProblemsPanel: value })}
        />
      </SettingRow>
      <SettingRow
        label="Marquee select"
        description="Drag a rectangle in the viewport to multi-select objects."
        keywords={["module", "marquee", "selection"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.marqueeSelect}
          onChange={(value) => setModuleSettings({ marqueeSelect: value })}
        />
      </SettingRow>
      <SettingRow
        label="Autosave recovery"
        description="Periodically write recovery snapshots to .forge/recovery."
        keywords={["module", "autosave", "recovery"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.autosaveEnabled}
          onChange={(value) => setModuleSettings({ autosaveEnabled: value })}
        />
      </SettingRow>

      <h4 className="forge-settings-page__subtitle">Snapping</h4>
      <SettingRow label="Snap position" keywords={["module", "snap", "grid"]}>
        <ForgeCheckbox
          label=""
          value={settings.snapPosition}
          onChange={(value) => setModuleSettings({ snapPosition: value })}
        />
      </SettingRow>
      <SettingRow label="Snap angle" keywords={["module", "snap", "rotate"]}>
        <ForgeCheckbox
          label=""
          value={settings.snapAngle}
          onChange={(value) => setModuleSettings({ snapAngle: value })}
        />
      </SettingRow>

      <h4 className="forge-settings-page__subtitle">Helpers</h4>
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
  keywords: ["module", "area", "helpers", "creature", "waypoint", "trigger", "workbench"],
  render: () => React.createElement(ModuleSettingsPage),
});
