/**
 * General Forge settings.
 *
 * @file GeneralSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState } from "react";
import { ForgeButton } from "@/apps/forge/components/ui";
import { executeCommand } from "@/apps/forge/commands/forgeCommands";
import { ModalChangeGameState } from "@/apps/forge/components/modal/ModalChangeGame";
import { ModalSettingsState } from "@/apps/forge/components/modal/ModalSettingsState";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import * as KotOR from "@/apps/forge/KotOR";

export function GeneralSettingsPage() {
  const [, setRevision] = useState(0);
  const bump = () => setRevision((value) => value + 1);

  useEffectOnce(() => {
    ForgeState.addEventListener("onGameDataChanged", bump);
    return () => ForgeState.removeEventListener("onGameDataChanged", bump);
  });

  const gameKey = KotOR.ApplicationProfile.GameKey === KotOR.GameEngineType.TSL
    ? "Knights of the Old Republic II"
    : "Knights of the Old Republic";
  const directoryLabel = ForgeState.getBoundGameDirectoryLabel();
  const hasDirectory = ForgeState.hasBoundGameDirectory();

  const onChangeGame = () => {
    ModalSettingsState.Hide();
    ModalChangeGameState.Show();
  };

  return (
    <div className="forge-settings-page">
      <h3 className="forge-settings-page__title">General</h3>
      <p className="forge-settings-page__lead">
        Application-wide settings. Game data comes from the active profile.
      </p>
      <SettingRow
        label="Game profile"
        description={`Currently using ${gameKey}. Switching games reloads Forge.`}
        keywords={["kotor", "tsl", "profile", "game"]}
      >
        <ForgeButton onClick={onChangeGame}>Change Game…</ForgeButton>
      </SettingRow>
      <SettingRow
        label="Game directory"
        description={
          hasDirectory
            ? `Install folder used for archives, 2DA lists, and TLK. Currently: ${directoryLabel}`
            : "No install folder is bound. Choose a KotOR or TSL directory that contains chitin.key."
        }
        keywords={["directory", "folder", "install", "path", "chitin", "game data", "unbind"]}
      >
        <div className="forge-setting-row__actions">
          <ForgeButton
            size="sm"
            onClick={() => {
              void executeCommand("forge.file.loadGameData");
            }}
          >
            {hasDirectory ? "Change…" : "Choose…"}
          </ForgeButton>
          {hasDirectory ? (
            <ForgeButton
              size="sm"
              variant="danger"
              onClick={() => {
                void executeCommand("forge.file.removeGameDirectory");
              }}
            >
              Remove
            </ForgeButton>
          ) : null}
        </div>
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "general",
  label: "General",
  icon: "fa-solid fa-gear",
  keywords: ["general", "app", "application", "game", "profile", "directory", "folder"],
  render: () => React.createElement(GeneralSettingsPage),
});
