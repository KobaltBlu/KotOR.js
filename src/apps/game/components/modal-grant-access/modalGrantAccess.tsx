import React from "react";
import { KotORModal } from "@apps/game/components/modal/modal";
import { useApp } from "@apps/game/context/AppContext";
import { ApplicationEnvironment } from "@apps/game/KotOR";
import GrantAccessModalContent from "@apps/common/components/grantAccess/GrantAccessModalContent";
import * as KotOR from "@apps/game/KotOR";

export const ModalGrantAccess = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [gameKey] = appContext.gameKey;

  const onCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    KotOR.EventManager.FireEvent('grant-access.cancel');
    console.log("File System: access denied");
    alert("You must grant access to your local game directory to continue.");
    appState.quit();
  }

  const showBrowserDirectoryPicker = async () => {
    // Undefined when the user cancels the picker or denies access.
    const handle = await KotOR.GameFileSystem.showRequestDirectoryDialog();
    if(!handle) return;

    KotOR.EventManager.FireEvent('grant-access.grant');
    return handle;
  }

  const showElectronDirectoryPicker = async () => {
    try{
      const directory = await(window as any).electron.locate_game_directory(appState.appProfile);
      if(directory){
        await appState.attachDirectoryPath(directory);
        return directory;
      }
    }catch(e){
      console.error(e);
      alert("Unable to access your local game directory. Please try again.");
    }
    return;
  }

  const onOk = async (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("File System: access granted");

    // Electron
    if(appState.env == ApplicationEnvironment.ELECTRON){
      await showElectronDirectoryPicker();
      return;
    }

    // Browser
    if(appState.env == ApplicationEnvironment.BROWSER){
      const handle = await showBrowserDirectoryPicker();
      if(!handle){
        // Cancelled or denied; leave the modal up so the user can try again.
        console.log("File System: no directory selected");
        return;
      }
      await appState.attachDirectoryHandle(handle);
    }
  }

  return (
    <KotORModal 
      title="Grant Access" 
      show={true} 
      className="forge-style-modal grant-access-modal"
      onCancel={onCancel} 
      onOk={onOk} 
      cancelText="QUIT" 
      okText="GRANT ACCESS"
    >
      <GrantAccessModalContent gameKey={gameKey} />
    </KotORModal>
  );
};
