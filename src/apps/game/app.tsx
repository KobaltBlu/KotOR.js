import React from "react";
import { useApp } from "./context/AppContext";
import { ModalEULA } from "./components/modal-eula/modalEULA";
import { ModalGrantAccess } from "./components/modal-grant-access/modalGrantAccess";
import { CheatConsole } from "./components/cheat-console/cheatConsole";

export const GameApp = () => {
  const appContext = useApp();
  const [showEULAModal] = appContext.showEULAModal;
  const [showGrantModal] = appContext.showGrantModal;
  const [gameLoaded] = appContext.gameLoaded;
  const [showCheatConsole] = appContext.showCheatConsole;
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
    </>
  )
}
