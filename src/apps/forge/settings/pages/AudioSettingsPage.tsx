/**
 * Audio player settings.
 *
 * @file AudioSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeInput, ForgeSelect } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeAudioSettings } from "@/apps/forge/settings/forgeEditorsSettings";
import {
  TAB_AUDIO_VISUAL_OPTIONS,
  type TabAudioVisualId,
} from "@/apps/forge/components/tabs/tab-audio-player/tabAudioVisualizations";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";

export function AudioSettingsPage() {
  const [settings, setSettings] = useForgeSettings(forgeAudioSettings);

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">Audio</h3>
      <p className="forge-settings-page__lead">
        Default volume, loop, and visualization for the audio player. Reverb stays on View → Audio Reverb.
      </p>
      <SettingRow
        label="Volume"
        description="Playback gain from 0 to 1. Applies immediately to the current player."
        keywords={["audio", "volume", "gain"]}
      >
        <ForgeInput
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          onChange={(e) => {
            const volume = Number(e.target.value);
            setSettings({ volume });
            AudioPlayerState.SetVolume(volume);
          }}
          aria-label="Audio volume"
        />
      </SettingRow>
      <SettingRow
        label="Loop"
        description="Replay the current clip when it ends (ignored in OST queue mode)."
        keywords={["audio", "loop", "repeat"]}
      >
        <ForgeCheckbox
          label=""
          value={settings.loop}
          onChange={(value) => {
            setSettings({ loop: value });
            AudioPlayerState.loop = value;
          }}
        />
      </SettingRow>
      <SettingRow
        label="Visualization"
        description="Default visualizer when an audio tab opens."
        keywords={["audio", "spectrum", "hyperspace", "visualizer"]}
      >
        <ForgeSelect
          value={settings.visualization}
          onChange={(e) => setSettings({ visualization: e.target.value as TabAudioVisualId })}
          aria-label="Audio visualization"
        >
          {TAB_AUDIO_VISUAL_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </ForgeSelect>
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "audio",
  label: "Audio",
  group: "editors",
  icon: "fa-solid fa-music",
  keywords: ["audio", "wav", "mp3", "volume", "loop", "spectrum"],
  render: () => React.createElement(AudioSettingsPage),
});
