import React from "react";
import { KotORModal } from "@apps/game/components/modal/modal";
import { useApp } from "@apps/game/context/AppContext";
import { EULA_VERSION, EULA } from "@apps/game/eula";
import * as KotOR from "@apps/game/KotOR";

export const ModalEULA = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [gameKey] = appContext.gameKey;
  const [showEULAModal] = appContext.showEULAModal;

  const onCancel = () => {
    KotOR.EventManager.FireEvent('eula.cancel');
    alert('You must accept the Usage Notice to play this game. We are sorry to see you go.');
    window.close();
  }

  const onOk = () => {
    KotOR.EventManager.FireEvent('eula.accept');
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
      className="forge-style-modal eula-modal"
      onCancel={onCancel} 
      onOk={onOk}
    >
      <EULA />
    </KotORModal>
  );
};
