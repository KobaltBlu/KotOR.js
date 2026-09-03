/**
 * GFF editor settings.
 *
 * @file GffSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeInput } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeGffSettings } from "@/apps/forge/settings/forgeEditorsSettings";

export function GffSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeGffSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">GFF</h3>
      <p className="forge-settings-page__lead">
        Tree display for the generic GFF editor. Changes apply immediately to open GFF tabs.
      </p>
      <SettingRow
        label="Show field type"
        description="Show BYTE, ResRef, LocString, and other type names in the tree."
        keywords={["gff", "type", "tree"]}
      >
        <ForgeCheckbox label="" value={settings.showType} onChange={(value) => setSettings({ showType: value })} />
      </SettingRow>
      <SettingRow
        label="Show value preview"
        description="Show a short field value next to the label."
        keywords={["gff", "preview", "value"]}
      >
        <ForgeCheckbox label="" value={settings.showPreview} onChange={(value) => setSettings({ showPreview: value })} />
      </SettingRow>
      <SettingRow
        label="Preview max length"
        description="Characters kept in the tree preview before truncation (8–200)."
        keywords={["gff", "preview", "truncate"]}
      >
        <ForgeInput
          type="number"
          min={8}
          max={200}
          value={settings.previewMaxLength}
          onChange={(e) => setSettings({ previewMaxLength: Number(e.target.value) })}
          aria-label="Preview max length"
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "gff",
  label: "GFF",
  group: "editors",
  icon: "fa-solid fa-sitemap",
  keywords: ["gff", "struct", "field", "tree", "preview"],
  render: () => React.createElement(GffSettingsPage),
});
