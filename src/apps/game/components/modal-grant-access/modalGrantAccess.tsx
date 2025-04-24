import React from "react";
import { KotORModal } from "../modal/modal";
import { useApp } from "../../context/AppContext";
import { ApplicationEnvironment } from "../../KotOR";

export const ModalGrantAccess = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;

  const onCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("File System: access denied");
    alert("You must grant access to your local game directory to continue.");
    window.close();
  }
  
  const showRequestDirectoryDialog = async () => {
    let handle = await window.showDirectoryPicker({
      mode: "readwrite"
    });
    if(!handle) return;

    if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
      return handle;
    }
  }

  const onOk = async (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("File System: access granted");

    // Electron
    if(appState.env == ApplicationEnvironment.ELECTRON){
      (window as any).electron.locate_game_directory(appState.appProfile).then( (directory: string) => {
        console.log('directory', directory);
        if(directory){
          appState.attachDirectoryPath(directory);
        }
      }).catch( (e: any) => {
        appState.attachDirectoryPath('');
        console.error(e);
        alert("Unable to access your local game directory. Please try again.");
      });
      return;
    }

    // Browser
    const handle = await showRequestDirectoryDialog();
    if(!handle){
      console.log("File System: access denied");
      alert("Unable to access your local game directory. Please try again.");
      return;
    }
    appState.attachDirectoryHandle(handle)
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
