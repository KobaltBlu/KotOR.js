/**
 * Shared 3D viewport defaults for MDL, LYT, PTH, and WOK.
 *
 * @file ViewportSettingsPage.tsx
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
  DEFAULT_VIEWPORT_LAYERS,
  forgeViewportSettings,
  type ViewportLayerKey,
} from "@/apps/forge/settings/forgeEditorsSettings";

const LAYER_LABELS: Record<ViewportLayerKey, string> = {
  lights: "Lights",
  emitters: "Emitters",
  walkmeshes: "Walkmeshes (AABB)",
  trimesh: "Static meshes",
  skin: "Skin meshes",
  dangly: "Dangly meshes",
  saber: "Lightsaber meshes",
  childModels: "Child / reference models",
  layout: "Layout (rooms)",
  ground: "Ground grid",
};

const LAYER_ORDER = Object.keys(DEFAULT_VIEWPORT_LAYERS) as ViewportLayerKey[];

export function ViewportSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeViewportSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">3D Viewport</h3>
      <p className="forge-settings-page__lead">
        Defaults for new model, layout, path, and walkmesh tabs. View → Show still toggles the current tab only.
      </p>
      <h4 className="forge-settings-page__section">Layers</h4>
      {LAYER_ORDER.map((key) => (
        <SettingRow
          key={key}
          label={LAYER_LABELS[key]}
          description={`Show ${LAYER_LABELS[key].toLowerCase()} when a 3D tab opens.`}
          keywords={["viewport", "layer", key, LAYER_LABELS[key]]}
        >
          <ForgeCheckbox
            label=""
            value={settings.layers[key]}
            onChange={(value) => setSettings({ layers: { ...settings.layers, [key]: value } })}
          />
        </SettingRow>
      ))}
      <h4 className="forge-settings-page__section">Preview</h4>
      <SettingRow
        label="Default wind power"
        description="Dangly-mesh wind used when a model tab opens (0 / 1 / 2)."
        keywords={["wind", "dangly", "viewport"]}
      >
        <ForgeSelect
          value={String(settings.windPower)}
          onChange={(e) => setSettings({ windPower: Number(e.target.value) as 0 | 1 | 2 })}
          aria-label="Default wind power"
        >
          <option value="0">Off (0)</option>
          <option value="1">Weak (1)</option>
          <option value="2">Strong (2)</option>
        </ForgeSelect>
      </SettingRow>
      <SettingRow
        label="Walkmesh wireframe"
        description="Show the WOK wireframe when a walkmesh tab opens."
        keywords={["wok", "wireframe", "walkmesh"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.wokWireframe}
          onChange={(value) => setSettings({ wokWireframe: value })}
        />
      </SettingRow>
      <SettingRow
        label="Walkmesh grid"
        description="Show the ground grid when a walkmesh tab opens."
        keywords={["wok", "grid", "walkmesh"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.wokGrid}
          onChange={(value) => setSettings({ wokGrid: value })}
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "viewport",
  label: "3D Viewport",
  group: "editors",
  icon: "fa-solid fa-cube",
  keywords: ["3d", "viewport", "mdl", "lyt", "pth", "wok", "layers", "wind"],
  render: () => React.createElement(ViewportSettingsPage),
});
