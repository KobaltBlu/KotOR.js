/**
 * Archives settings page — extract + browser defaults.
 *
 * @file ArchivesSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { ForgeSelect } from "@/apps/forge/components/ui";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import {
  forgeArchivesSettings,
  type ErfBrowserSortDir,
  type ErfBrowserSortKey,
  type ErfBrowserViewMode,
} from "@/apps/forge/settings/forgeEditorsSettings";

export function ArchivesSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeArchivesSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Archives</h3>
      <p className="forge-settings-page__lead">
        ERF, MOD, and SAV browser defaults and extract behavior. Opening an entry still uses File Types defaults.
      </p>
      <SettingRow
        label="Default view"
        description="Starting layout for the archive browser (Details, List, Icons, or Tiles)."
        keywords={["erf", "mod", "sav", "view", "icons", "tiles", "details", "list"]}
      >
        <ForgeSelect
          value={settings.defaultView}
          onChange={(e) => setSettings({ defaultView: e.target.value as ErfBrowserViewMode })}
          aria-label="Default archive view"
        >
          <option value="details">Details</option>
          <option value="list">List</option>
          <option value="icons">Icons</option>
          <option value="tiles">Tiles</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Default sort"
        description="Column used to order entries when an archive tab opens."
        keywords={["erf", "mod", "sort", "name", "type", "size"]}
      >
        <ForgeSelect
          value={settings.sortKey}
          onChange={(e) => setSettings({ sortKey: e.target.value as ErfBrowserSortKey })}
          aria-label="Default sort column"
        >
          <option value="name">Name</option>
          <option value="type">Type</option>
          <option value="size">Size</option>
          <option value="offset">Offset</option>
          <option value="resId">ResID</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Sort direction"
        description="Ascending or descending order for the default sort column."
        keywords={["erf", "mod", "sort", "ascending", "descending"]}
      >
        <ForgeSelect
          value={settings.sortDir}
          onChange={(e) => setSettings({ sortDir: e.target.value as ErfBrowserSortDir })}
          aria-label="Default sort direction"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Confirm extract overwrite"
        description="Ask before replacing an existing file when exporting all resources from an archive."
        keywords={["erf", "mod", "sav", "extract", "overwrite"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.confirmExtractOverwrite}
          onChange={(value) => setSettings({ confirmExtractOverwrite: value })}
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "archives",
  label: "Archives",
  group: "editors",
  icon: "fa-solid fa-archive",
  keywords: ["erf", "mod", "sav", "archive", "extract", "view", "sort"],
  render: () => React.createElement(ArchivesSettingsPage),
});
