import React from "react";
import { useApp } from "@/apps/game/context/AppContext";
import { ModalEULA } from "@/apps/game/components/modal-eula/modalEULA";
import { ModalGrantAccess } from "@/apps/game/components/modal-grant-access/modalGrantAccess";
import { ModalClickToBegin } from "@/apps/game/components/modal-click-to-begin/modalClickToBegin";
import { CheatConsole } from "@/apps/game/components/cheat-console/cheatConsole";
import { SceneOverviewPanel } from "@/apps/game/components/scene-overview/SceneOverviewPanel";
import { LoadingScreen } from "@/apps/common/components/loadingScreen/LoadingScreen";

export const GameApp = () => {
  const appContext = useApp();
  const [showEULAModal] = appContext.showEULAModal;
  const [showGrantModal] = appContext.showGrantModal;
  const [showClickToBeginModal] = appContext.showClickToBeginModal;
  const [gameLoaded] = appContext.gameLoaded;
  const [showCheatConsole] = appContext.showCheatConsole;
  const [showSceneOverview] = appContext.showSceneOverview;
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
      {showClickToBeginModal && (
        <ModalClickToBegin />
      )}
      {gameLoaded && showSceneOverview && (
        <SceneOverviewPanel />
      )}
      {gameLoaded && showCheatConsole && (
        <CheatConsole />
      )}
      <LoadingScreen active={showLoadingScreen} message={loadingScreenMessage} backgroundURL={loadingScreenBackgroundURL} logoURL={loadingScreenLogoURL} />
    </>
  )
}
