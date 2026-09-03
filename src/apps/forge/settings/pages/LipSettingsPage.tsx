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
      <SettingRow
        label="Expand from dialog"
        description="Turn the VO transcript into Odyssey visemes and align them to Rhubarb speech islands."
        keywords={["lip", "rhubarb", "dialog", "viseme"]}
      >
        <input
          type="checkbox"
          checked={settings.expandFromDialog}
          onChange={(e) => setSettings({ expandFromDialog: e.target.checked })}
          aria-label="Expand from dialog"
        />
      </SettingRow>
      <SettingRow
        label="Split consonants"
        description="Split long Rhubarb B cues with energy onsets when dialog does not cover them."
        keywords={["lip", "rhubarb", "consonant", "onset"]}
      >
        <input
          type="checkbox"
          checked={settings.splitConsonants}
          onChange={(e) => setSettings({ splitConsonants: e.target.checked })}
          aria-label="Split consonants"
        />
      </SettingRow>
      <SettingRow
        label="Phrase onset keys"
        description="Insert a closed mouth key at the start of each speech island."
        keywords={["lip", "rhubarb", "onset", "phrase"]}
      >
        <input
          type="checkbox"
          checked={settings.phraseOnsetKeys}
          onChange={(e) => setSettings({ phraseOnsetKeys: e.target.checked })}
          aria-label="Phrase onset keys"
        />
      </SettingRow>
      <SettingRow
        label="Time offset (ms)"
        description="Shift generated keys. Negative values make the mouth lead the audio."
        keywords={["lip", "rhubarb", "offset", "anticipate"]}
      >
        <ForgeInput
          type="number"
          min={-200}
          max={200}
          value={settings.timeOffsetMs}
          onChange={(e) => setSettings({ timeOffsetMs: Number(e.target.value) || 0 })}
          aria-label="Time offset"
        />
      </SettingRow>
      <SettingRow
        label="Re-key after gap (ms)"
        description="Re-emit the same Odyssey shape after a pause at least this long."
        keywords={["lip", "rhubarb", "gap", "rekey"]}
      >
        <ForgeInput
          type="number"
          min={0}
          max={500}
          value={settings.rekeyAfterGapMs}
          onChange={(e) => setSettings({ rekeyAfterGapMs: Number(e.target.value) || 0 })}
          aria-label="Re-key after gap"
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
