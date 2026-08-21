/**
 * Image editor settings.
 *
 * @file ImageSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeSelect } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import {
  forgeImageSettings,
  type ImageDefaultZoom,
  type ImageFilterMode,
} from "@/apps/forge/settings/forgeEditorsSettings";

export function ImageSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeImageSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Image</h3>
      <p className="forge-settings-page__lead">
        Canvas defaults for TPC, TGA, PNG, and JPEG. Filter and checkerboard apply immediately.
      </p>
      <SettingRow
        label="Pixel filter"
        description="Nearest neighbor keeps texel edges sharp; linear blurs when scaled."
        keywords={["image", "tpc", "tga", "nearest", "filter"]}
      >
        <ForgeSelect
          value={settings.filter}
          onChange={(e) => setSettings({ filter: e.target.value as ImageFilterMode })}
          aria-label="Pixel filter"
        >
          <option value="nearest">Nearest neighbor</option>
          <option value="linear">Linear</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Checkerboard background"
        description="Show a transparency checkerboard behind the canvas."
        keywords={["image", "checkerboard", "alpha"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.checkerboard}
          onChange={(value) => setSettings({ checkerboard: value })}
        />
      </SettingRow>
      <SettingRow
        label="Default zoom"
        description="Used when an image tab opens. Fit scales to the pane; 100% is 1:1 pixels."
        keywords={["image", "zoom", "fit", "scale"]}
      >
        <ForgeSelect
          value={settings.defaultZoom}
          onChange={(e) => setSettings({ defaultZoom: e.target.value as ImageDefaultZoom })}
          aria-label="Default zoom"
        >
          <option value="100">100%</option>
          <option value="fit">Fit</option>
        </ForgeSelect>
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "image",
  label: "Image",
  group: "editors",
  icon: "fa-solid fa-image",
  keywords: ["image", "tpc", "tga", "texture", "zoom"],
  render: () => React.createElement(ImageSettingsPage),
});
