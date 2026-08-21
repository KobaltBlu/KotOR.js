/**
 * Hex editor settings.
 *
 * @file HexSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeSelect } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeHexSettings, type HexBytesPerRow, type HexOffsetDisplay } from "@/apps/forge/settings/forgeEditorsSettings";

export function HexSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeHexSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Hex</h3>
      <p className="forge-settings-page__lead">
        Display options for the hex editor. Changes apply immediately to open hex tabs.
      </p>
      <SettingRow
        label="Offset radix"
        description="How the left offset column is shown. Also available from View in a hex tab."
        keywords={["hex", "offset", "decimal", "radix"]}
      >
        <ForgeSelect
          value={settings.offsetDisplay}
          onChange={(e) => setSettings({ offsetDisplay: e.target.value as HexOffsetDisplay })}
          aria-label="Offset radix"
        >
          <option value="hex">Hexadecimal</option>
          <option value="dec">Decimal</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Bytes per row"
        description="Classic hex dumps use 16 bytes per row."
        keywords={["bytes", "row", "width", "columns"]}
      >
        <ForgeSelect
          value={String(settings.bytesPerRow)}
          onChange={(e) => setSettings({ bytesPerRow: Number(e.target.value) as HexBytesPerRow })}
          aria-label="Bytes per row"
        >
          <option value="8">8</option>
          <option value="16">16</option>
          <option value="32">32</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Show ASCII"
        description="Show the decoded ASCII column on the right."
        keywords={["ascii", "text", "column"]}
      >
        <ForgeCheckbox label="" value={settings.showAscii} onChange={(value) => setSettings({ showAscii: value })} />
      </SettingRow>
      <SettingRow
        label="Uppercase hex"
        description="Use A–F instead of a–f for hex digits."
        keywords={["uppercase", "lowercase", "hex"]}
      >
        <ForgeCheckbox label="" value={settings.uppercase} onChange={(value) => setSettings({ uppercase: value })} />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "hex",
  label: "Hex",
  group: "editors",
  icon: "fa-solid fa-file-code",
  keywords: ["hex", "binary", "offset", "ascii", "bytes"],
  render: () => React.createElement(HexSettingsPage),
});
