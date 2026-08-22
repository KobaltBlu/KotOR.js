/**
 * LIP editor settings.
 *
 * @file LipSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeInput } from "@/apps/forge/components/ui";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeLipSettings } from "@/apps/forge/settings/forgeEditorsSettings";

export function LipSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeLipSettings);
  const cores =
    typeof navigator !== "undefined" && Number.isFinite(navigator.hardwareConcurrency)
      ? Math.max(1, navigator.hardwareConcurrency)
      : 8;

  const toggleExtended = (letter: "G" | "H" | "X") => {
    const set = new Set(
      String(settings.extendedShapes || "")
        .toUpperCase()
        .split("")
        .filter((c) => c === "G" || c === "H" || c === "X"),
    );
    if (set.has(letter)) set.delete(letter);
    else set.add(letter);
    setSettings({ extendedShapes: ["G", "H", "X"].filter((c) => set.has(c)).join("") });
  };

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">LIP</h3>
      <p className="forge-settings-page__lead">
        Defaults for new lipsync tabs. Per-tab Rhubarb controls can override these while editing.
      </p>
      <SettingRow
        label="Default preview head"
        description="Heads.2da resref used when a LIP file opens (for example p_bastilah)."
        keywords={["lip", "head", "preview", "phoneme"]}
      >
        <ForgeInput
          value={settings.head}
          onChange={(e) => setSettings({ head: e.target.value })}
          aria-label="Default preview head"
        />
      </SettingRow>
      <SettingRow
        label="Extended shapes"
        description="Rhubarb G (F/V), H (L), and X (rest). Disabled shapes fold onto basic A–F."
        keywords={["lip", "rhubarb", "extended", "viseme"]}
      >
        <div style={{ display: "flex", gap: 12 }}>
          {(["G", "H", "X"] as const).map((letter) => (
            <label key={letter} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={settings.extendedShapes.includes(letter)}
                onChange={() => toggleExtended(letter)}
              />
              {letter}
            </label>
          ))}
        </div>
      </SettingRow>
      <SettingRow
        label="Include rest keys"
        description="Emit idle (X) mouth cues as LIP keyframes. Off by default so closed onsets are not collapsed."
        keywords={["lip", "rhubarb", "rest", "idle"]}
      >
        <input
          type="checkbox"
          checked={settings.includeRestKeys}
          onChange={(e) => setSettings({ includeRestKeys: e.target.checked })}
          aria-label="Include rest keys"
        />
      </SettingRow>
      <SettingRow
        label="Min cue duration (ms)"
        description="Drop or merge mouth cues shorter than this before converting to keyframes."
        keywords={["lip", "rhubarb", "cue", "duration"]}
      >
        <ForgeInput
          type="number"
          min={0}
          max={500}
          value={settings.minCueDurationMs}
          onChange={(e) => setSettings({ minCueDurationMs: Number(e.target.value) || 0 })}
          aria-label="Min cue duration"
        />
      </SettingRow>
      <SettingRow
        label="Worker count"
        description="Web Workers used for Rhubarb WASM analysis (1 is enough for a single VO)."
        keywords={["lip", "rhubarb", "worker", "wasm"]}
      >
        <ForgeInput
          type="number"
          min={1}
          max={cores}
          value={settings.workerCount}
          onChange={(e) => setSettings({ workerCount: Number(e.target.value) || 1 })}
          aria-label="Worker count"
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "lip",
  label: "LIP",
  group: "editors",
  icon: "fa-solid fa-face-smile",
  keywords: ["lip", "lipsync", "phoneme", "head", "rhubarb"],
  render: () => React.createElement(LipSettingsPage),
});
