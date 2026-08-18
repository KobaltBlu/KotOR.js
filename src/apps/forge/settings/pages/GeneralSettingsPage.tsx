/**
 * General Forge settings.
 *
 * @file GeneralSettingsPage.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState } from "react";
import { ForgeButton } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { executeCommand } from "@/apps/forge/commands/forgeCommands";
import { ModalChangeGameState } from "@/apps/forge/components/modal/ModalChangeGame";
import { ModalSettingsState } from "@/apps/forge/components/modal/ModalSettingsState";
import { SettingRow } from "@/apps/forge/settings/SettingRow";
import { registerSettingsPage } from "@/apps/forge/settings/settingsRegistry";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeSessionSettings } from "@/apps/forge/settings/forgeSessionSettings";
import * as KotOR from "@/apps/forge/KotOR";

export function GeneralSettingsPage() {
  const [, setRevision] = useState(0);
  const bump = () => setRevision((value) => value + 1);
  const [session, setSession] = useForgeSettings(forgeSessionSettings);

  useEffectOnce(() => {
    ForgeState.addEventListener("onGameDataChanged", bump);
    ForgeState.addEventListener("onExplorerPaneToggle", bump);
    return () => {
      ForgeState.removeEventListener("onGameDataChanged", bump);
      ForgeState.removeEventListener("onExplorerPaneToggle", bump);
    };
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

      <h4 className="forge-settings-page__section">Session</h4>
      <SettingRow
        label="Restore open tabs"
        description="Reopen the previous editor tabs when Forge starts. Open tabs are still saved if this is off."
        keywords={["restore", "session", "tabs", "startup"]}
      >
        <ForgeCheckbox
          label=""
          value={session.restoreOpenTabs}
          onChange={(value) => setSession({ restoreOpenTabs: value })}
        />
      </SettingRow>
      <SettingRow
        label="Confirm close unsaved tabs"
        description="Ask before closing a tab that has unsaved changes."
        keywords={["confirm", "close", "unsaved", "dirty"]}
      >
        <ForgeCheckbox
          label=""
          value={session.confirmCloseUnsaved}
          onChange={(value) => setSession({ confirmCloseUnsaved: value })}
        />
      </SettingRow>
      <SettingRow
        label="Explorer open on launch"
        description="Show the resource / project explorer pane when Forge starts. Also applies immediately."
        keywords={["explorer", "sidebar", "pane", "west"]}
      >
        <ForgeCheckbox
          label=""
          value={session.explorerOpenOnLaunch}
          onChange={(value) => {
            setSession({ explorerOpenOnLaunch: value });
            ForgeState.setExplorerPaneOpen(value);
          }}
        />
      </SettingRow>
      <SettingRow
        label="Show floating mini-player by default"
        description="Show the floating audio mini-player on launch. View → Mini Player can still hide it for this session."
        keywords={["audio", "mini player", "player", "floating"]}
      >
        <ForgeCheckbox
          label=""
          value={session.showFloatingMiniPlayer}
          onChange={(value) => {
            setSession({ showFloatingMiniPlayer: value });
            if (value) {
              AudioPlayerState.showFloatingMiniPlayer();
            } else {
              AudioPlayerState.hideFloatingMiniPlayer();
            }
          }}
        />
      </SettingRow>
    </div>
  );
}

registerSettingsPage({
  id: "general",
  label: "General",
  group: "application",
  icon: "fa-solid fa-gear",
  keywords: ["general", "app", "application", "game", "profile", "directory", "folder", "session", "tabs", "explorer"],
  render: () => React.createElement(GeneralSettingsPage),
});
