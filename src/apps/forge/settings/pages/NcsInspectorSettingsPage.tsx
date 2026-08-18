/**
 * NCS Inspector settings wrapping Editor.NcsInspector.
 *
 * @file NcsInspectorSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState } from "react";
import { ForgeSelect } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import {
  getNcsInspectorLayoutMode,
  getNcsInspectorShowDetails,
  getNcsInspectorShowFunctions,
  setNcsInspectorLayoutMode,
  setNcsInspectorShowDetails,
  setNcsInspectorShowFunctions,
  type NcsInspectorLayoutMode,
} from "@/apps/forge/components/tabs/tab-ncs-inspector/ncsInspectorConfig";

export function NcsInspectorSettingsPage() {
  const [, setRevision] = useState(0);
  const bump = () => setRevision((value) => value + 1);

  useEffectOnce(() => {
    const onChange = () => bump();
    window.addEventListener("forge-ncs-inspector-settings-change", onChange);
    return () => window.removeEventListener("forge-ncs-inspector-settings-change", onChange);
  });

  const layoutMode = getNcsInspectorLayoutMode();
  const showFunctions = getNcsInspectorShowFunctions(false);
  const showDetails = getNcsInspectorShowDetails(false);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">NCS Inspector</h3>
      <p className="forge-settings-page__lead">
        Layout for compiled script inspection. Changes apply immediately to open inspectors.
      </p>
      <SettingRow
        label="Layout"
        description="Assembly, bytecode, or a split view of both."
        keywords={["ncs", "layout", "assembly", "bytecode"]}
      >
        <ForgeSelect
          value={layoutMode}
          onChange={(e) => setNcsInspectorLayoutMode(e.target.value as NcsInspectorLayoutMode)}
          aria-label="NCS inspector layout"
        >
          <option value="assembly">Assembly</option>
          <option value="bytecode">Bytecode</option>
          <option value="split">Split</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Show functions"
        description="Show the recovered-function list."
        keywords={["ncs", "functions", "recovered"]}
      >
        <ForgeCheckbox
          label=""
          value={showFunctions}
          onChange={(value) => setNcsInspectorShowFunctions(value)}
        />
      </SettingRow>
      <SettingRow
        label="Show details"
        description="Show the instruction details pane."
        keywords={["ncs", "details", "instruction"]}
      >
        <ForgeCheckbox
          label=""
          value={showDetails}
          onChange={(value) => setNcsInspectorShowDetails(value)}
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "ncs-inspector",
  label: "NCS Inspector",
  group: "editors",
  icon: "fa-solid fa-microchip",
  keywords: ["ncs", "inspector", "assembly", "bytecode", "decompile"],
  render: () => React.createElement(NcsInspectorSettingsPage),
});
