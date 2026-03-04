import React from "react";

import { KotORModal } from "@/apps/game/components/modal/modal";
import { useApp } from "@/apps/game/context/AppContext";
import * as KotOR from "@/apps/game/KotOR";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const ApplicationEnvironment = KotOR.ApplicationEnvironment;

const log = createScopedLogger(LogScope.Game);

export const ModalGrantAccess = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;

  const onCancel = (_e: React.MouseEvent<HTMLButtonElement>) => {
    log.info("File System: access denied");
    alert("You must grant access to your local game directory to continue.");
    window.close();
  }

  const showBrowserDirectoryPicker = async (): Promise<FileSystemDirectoryHandle | null> => {
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker({ mode: "readwrite" });
    } catch (e) {
      log.warn("Directory picker canceled or failed", e);
      return null;
    }
    if (!handle) return null;

    if (!(await appState.validateDirectoryHandle(handle))) {
      return null;
    }

    return handle;
  };

  const showElectronDirectoryPicker = async () => {
    try{
      const directory = await window.electron.locate_game_directory(appState.appProfile ?? {});
      if(directory){
        appState.attachDirectoryPath(directory);
        return directory;
      }
    }catch(e){
      appState.attachDirectoryPath('');
      log.error('Electron locate_game_directory failed', e);
      alert("Unable to access your local game directory. Please try again.");
    }
    return;
  }

  const onOk = async (_e: React.MouseEvent<HTMLButtonElement>) => {
    log.info("File System: access granted");

    // Electron
    if (appState.env === ApplicationEnvironment.ELECTRON) {
      await showElectronDirectoryPicker();
      return;
    }

    // Browser
    if (appState.env === ApplicationEnvironment.BROWSER) {
      const urlKey = new URLSearchParams(window.location.search).get("key");
      const profileKey = appState.appProfile?.key ?? urlKey;
      if (!profileKey) {
        log.error("No app profile key and no ?key= in URL; cannot attach directory handle");
        alert("Game profile is not loaded. Open the game from the launcher or use a URL with ?key=kotor or ?key=tsl");
        return;
      }
      if (!appState.appProfile?.key && urlKey) {
        appState.appProfile = { ...(appState.appProfile ?? {}), key: urlKey };
        KotOR.ConfigClient.set(`Profiles.${urlKey}`, appState.appProfile as unknown as KotOR.ConfigValue);
      }
      const handle = await showBrowserDirectoryPicker();
      if (!handle) {
        log.warn("File System: access denied or canceled");
        alert("Unable to access your local game directory. Please try again.");
        return;
      }
      await appState.attachDirectoryHandle(handle);
    }
  };

  return (
    <KotORModal
      title="Grant Access"
      show={true}
      onCancel={onCancel}
      onOk={onOk}
      cancelText="QUIT"
      okText="GRANT ACCESS"
    >
      <span>Please grant this application access to your game install directory to continue.</span>
    </KotORModal>
  );
};
