/**
 * TLK editor settings.
 *
 * @file TlkSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeInput } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeTlkSettings } from "@/apps/forge/settings/forgeEditorsSettings";

export function TlkSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeTlkSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">TLK</h3>
      <p className="forge-settings-page__lead">
        Talk table search and voice-over preview. Changes apply immediately to open TLK tabs.
      </p>
      <SettingRow
        label="Search result cap"
        description="Maximum matches returned by talk-table search (50–5000)."
        keywords={["tlk", "search", "limit", "cap"]}
      >
        <ForgeInput
          type="number"
          min={50}
          max={5000}
          value={settings.searchResultCap}
          onChange={(e) => setSettings({ searchResultCap: Number(e.target.value) })}
          aria-label="Search result cap"
        />
      </SettingRow>
      <SettingRow
        label="Autoplay voice-over on select"
        description="Play the SoundResRef for a string when you select it, if game data is bound."
        keywords={["tlk", "vo", "autoplay", "sound"]}
      >
        <ForgeCheckbox label="" value={settings.autoplayVo} onChange={(value) => setSettings({ autoplayVo: value })} />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "tlk",
  label: "TLK",
  group: "editors",
  icon: "fa-solid fa-comments",
  keywords: ["tlk", "talk table", "strref", "search", "vo"],
  render: () => React.createElement(TlkSettingsPage),
});
