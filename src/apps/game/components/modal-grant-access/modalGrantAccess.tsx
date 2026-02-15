import React from "react";

import { KotORModal } from "@/apps/game/components/modal/modal";
import { useApp } from "@/apps/game/context/AppContext";
import { ApplicationEnvironment } from "@/apps/game/KotOR";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

export const ModalGrantAccess = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;

  const onCancel = (_e: React.MouseEvent<HTMLButtonElement>) => {
    log.info("File System: access denied");
    alert("You must grant access to your local game directory to continue.");
    window.close();
  }
  
  const showBrowserDirectoryPicker = async () => {
    const handle = await window.showDirectoryPicker({
      mode: "readwrite"
    });
    if(!handle) return;

    if (!(await appState.validateDirectoryHandle(handle))) {
      return;
    }

    return handle;
  }

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
    if(appState.env == ApplicationEnvironment.ELECTRON){
      await showElectronDirectoryPicker();
      return;
    }

    // Browser
    if(appState.env == ApplicationEnvironment.BROWSER){
      const handle = await showBrowserDirectoryPicker();
      if(!handle){
        log.warn("File System: access denied");
        alert("Unable to access your local game directory. Please try again.");
        return;
      }
      appState.attachDirectoryHandle(handle);
    }
  }

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
