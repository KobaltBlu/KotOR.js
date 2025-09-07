import React from "react";
import { useApp } from "./context/AppContext";
import { ModalEULA } from "./components/modal-eula/modalEULA";
import { ModalGrantAccess } from "./components/modal-grant-access/modalGrantAccess";
import { CheatConsole } from "./components/cheat-console/cheatConsole";
import { LoadingScreen } from "../common/components/loadingScreen/LoadingScreen";

export const GameApp = () => {
  const appContext = useApp();
  const [showEULAModal] = appContext.showEULAModal;
  const [showGrantModal] = appContext.showGrantModal;
  const [gameLoaded] = appContext.gameLoaded;
  const [showCheatConsole] = appContext.showCheatConsole;
  const [showLoadingScreen] = appContext.showLoadingScreen;
  const [loadingScreenMessage] = appContext.loadingScreenMessage;
  const [loadingScreenBackgroundURL] = appContext.loadingScreenBackgroundURL;
  const [loadingScreenLogoURL] = appContext.loadingScreenLogoURL;
  return (
    <>
      {showEULAModal && (
        <ModalEULA />
      )}
      {showGrantModal && (
        <ModalGrantAccess />
      )}
      {gameLoaded && showCheatConsole && (
        <CheatConsole />
      )}
      <LoadingScreen active={showLoadingScreen} message={loadingScreenMessage} backgroundURL={loadingScreenBackgroundURL} logoURL={loadingScreenLogoURL} />
    </>
  )
}
