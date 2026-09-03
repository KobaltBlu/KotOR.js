/**
 * Label, description, and control row for a settings pane.
 *
 * @file SettingRow.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { settingMatchesQuery, useSettingsSearch } from "@/apps/forge/settings/settingsRegistry";

export interface SettingRowProps {
  label: string;
  description?: string;
  keywords?: string[];
  children?: React.ReactNode;
}

export function SettingRow({ label, description, keywords = [], children }: SettingRowProps) {
  const query = useSettingsSearch();
  if (!settingMatchesQuery(query, label, description || "", ...keywords)) {
    return null;
  }

  return (
    <div className="forge-setting-row">
      <div className="forge-setting-row__copy">
        <div className="forge-setting-row__label">{label}</div>
        {description ? (
          <div className="forge-setting-row__description">{description}</div>
        ) : null}
      </div>
      <div className="forge-setting-row__control">
        {children}
      </div>
    </div>
  );
}
