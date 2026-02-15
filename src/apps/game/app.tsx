import React from "react";

import { LoadingScreen } from "@/apps/common/components/loadingScreen/LoadingScreen";
import { CheatConsole } from "@/apps/game/components/cheat-console/cheatConsole";
import { ModalEULA } from "@/apps/game/components/modal-eula/modalEULA";
import { ModalGrantAccess } from "@/apps/game/components/modal-grant-access/modalGrantAccess";
import { useApp } from "@/apps/game/context/AppContext";


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
