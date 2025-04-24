import React, { useEffect } from "react";
import { KotORModal } from "../modal/modal";
import { useApp } from "../../context/AppContext";
import { EULA_VERSION, EULA_DATE, EULA } from "../../eula";

export const ModalEULA = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [gameKey] = appContext.gameKey;
  const [showEULAModal, setShowEULAModal] = appContext.showEULAModal;

  useEffect(() => {
    
  }, []);

  const onCancel = () => {
    alert('You must accept the Usage Notice to play this game. We are sorry to see you go.');
    window.close();
  }

  const onOk = () => {
    console.log("onOk");
    const gameEULAConfig = {
      key: gameKey,
      accepted: true,
      date: new Date().toISOString(),
      version: EULA_VERSION
    };
    const eulaState: any = Object.assign({}, JSON.parse(window.localStorage.getItem('acceptEULA') as string));
    eulaState[gameKey] = gameEULAConfig;
    window.localStorage.setItem('acceptEULA', JSON.stringify(eulaState));
    appState.acceptEULA();
  }

  return (
    <KotORModal 
      title="EULA" 
      show={showEULAModal} 
      onCancel={onCancel} 
      onOk={onOk}
    >
      {<EULA />}
    </KotORModal>
  );
};
