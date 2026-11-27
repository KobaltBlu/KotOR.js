import React, { useEffect, useState } from "react";
import { useApp } from "@apps/game/context/AppContext";
import { ModalEULA } from "@apps/game/components/modal-eula/modalEULA";
import { ModalGrantAccess } from "@apps/game/components/modal-grant-access/modalGrantAccess";
import { ModalClickToBegin } from "@apps/game/components/modal-click-to-begin/modalClickToBegin";
import { CheatConsole } from "@apps/game/components/cheat-console/cheatConsole";
import { ModuleInspectorHost } from "@apps/game/components/module-inspector/ModuleInspectorHost";
import { LoadingScreen } from "@apps/common/components/loadingScreen/LoadingScreen";
import * as KotOR from "@apps/game/KotOR";

export const GameApp = () => {
  const appContext = useApp();
  const [showEULAModal] = appContext.showEULAModal;
  const [showGrantModal] = appContext.showGrantModal;
  const [showClickToBeginModal] = appContext.showClickToBeginModal;
  const [gameLoaded] = appContext.gameLoaded;
  const [showCheatConsole] = appContext.showCheatConsole;
  const [showLoadingScreen] = appContext.showLoadingScreen;
  const [loadingScreenMessage] = appContext.loadingScreenMessage;
  const [loadingScreenBackgroundURL] = appContext.loadingScreenBackgroundURL;
  const [loadingScreenLogoURL] = appContext.loadingScreenLogoURL;
  const [showModuleInspector, setShowModuleInspector] = useState(false);

  useEffect(() => {
    const dbg = KotOR.GameState.Debugger;
    const onIframeOpen = () => setShowModuleInspector(true);
    const onIframeClose = () => setShowModuleInspector(false);
    dbg.addEventListener('iframe-open', onIframeOpen);
    dbg.addEventListener('iframe-close', onIframeClose);
    dbg.addEventListener('close', onIframeClose);
    if(dbg.hostMode === 'iframe'){
      setShowModuleInspector(true);
    }
    return () => {
      dbg.removeEventListener('iframe-open', onIframeOpen);
      dbg.removeEventListener('iframe-close', onIframeClose);
      dbg.removeEventListener('close', onIframeClose);
    };
  }, []);

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
      {showModuleInspector && (
        <ModuleInspectorHost />
      )}
      {gameLoaded && showCheatConsole && (
        <CheatConsole />
      )}
      <LoadingScreen active={showLoadingScreen} message={loadingScreenMessage} backgroundURL={loadingScreenBackgroundURL} logoURL={loadingScreenLogoURL} />
    </>
  )
}
